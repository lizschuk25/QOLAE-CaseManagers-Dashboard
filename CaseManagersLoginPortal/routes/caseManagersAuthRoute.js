// ==============================================
// caseManagersAuthRoute.js - Case Managers Authentication Routes
// THE BRIDGE: Case Managers-specific authentication routes
// Author: Liz
// GDPR CRITICAL: All auth attempts must be logged
// ==============================================

// ==============================================
// LOCATION BLOCK A: IMPORTS & CONFIGURATION
// ==============================================

import ssotFetch from '../utils/ssotFetch.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ssotFetch handles SSOT base URL and x-internal-secret automatically

// CaseManagersDashboard baseURL for redirects
const CASEMANAGERS_DASHBOARD_BASE_URL = 'https://casemanagers.qolae.com';

// JWT Secret - fail fast if not configured
const JWT_SECRET = process.env.CASEMANAGERS_LOGIN_JWT_SECRET || (() => {
  console.error('CASEMANAGERS_LOGIN_JWT_SECRET not found in environment variables!');
  throw new Error('CASEMANAGERS_LOGIN_JWT_SECRET environment variable is required');
})();

// ==============================================
// LOCATION BLOCK B: ROUTE DEFINITIONS
// ==============================================

export default async function caseManagersAuthRoutes(fastify, opts) {

  // ==============================================
  // B.1: CASE MANAGERS LOGIN WITH PIN (FROM EMAIL CLICK)
  // ==============================================

  fastify.post('/caseManagersAuth/login', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
        keyGenerator: (request) => request.ip
      }
    }
  }, async (request, reply) => {
    const { email, caseManagerPin } = request.body;
    const userIP = request.ip;

    // GDPR Audit Log
    fastify.log.info({
      event: 'caseManagerLoginAttempt',
      caseManagerPin: caseManagerPin,
      email: email,
      ip: userIP,
      timestamp: new Date().toISOString(),
      gdprCategory: 'authentication'
    });

    if (!email || !caseManagerPin) {
      return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin || ''}&error=${encodeURIComponent('Email and Case Manager PIN are required')}`);
    }

    try {
      // Validate PIN format first
      const pinValidationRes = await ssotFetch('/api/pin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: caseManagerPin, userType: 'caseManager' })
      });
      const pinValidation = await pinValidationRes.json();

      if (!pinValidationRes.ok || !pinValidation.validation?.isValid) {
        fastify.log.warn({
          event: 'invalidPinFormat',
          caseManagerPin: caseManagerPin,
          errors: pinValidation.validation?.errors
        });

        return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=${encodeURIComponent('Invalid PIN format')}`);
      }

      // Call SSOT API for authentication
      const apiRes = await ssotFetch('/auth/caseManagers/requestToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseManagerEmail: email, caseManagerPin, source: 'casemanagers-portal', ip: userIP })
      });
      const apiResponse = await apiRes.json();

      if (!apiRes.ok || !apiResponse.success) {
        fastify.log.warn({
          event: 'caseManagerLoginFailed',
          caseManagerPin: caseManagerPin,
          error: apiResponse.error
        });
        return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=${encodeURIComponent(apiResponse.error || 'Authentication failed')}`);
      }

      fastify.log.info({
        event: 'caseManagerLoginSuccess',
        caseManagerPin: caseManagerPin,
        complianceSubmitted: apiResponse.caseManager.complianceSubmitted
      });

        try {
          const jwtToken = request.cookies?.qolaeCaseManagerToken;

          if (!jwtToken) {
            fastify.log.warn({
              event: 'loginNoJWT',
              caseManagerPin: caseManagerPin,
              gdprCategory: 'authentication'
            });
            return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=${encodeURIComponent('Session expired. Please click your PIN link again.')}`);
          }

          // Validate JWT token via SSOT
          const valRes = await ssotFetch('/auth/caseManagers/session/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: jwtToken })
          });
          const validationResponse = await valRes.json();

          if (!valRes.ok || !validationResponse.success || !validationResponse.valid) {
            fastify.log.warn({
              event: 'loginInvalidJWT',
              caseManagerPin: caseManagerPin,
              error: validationResponse.error || 'Invalid token',
              gdprCategory: 'authentication'
            });
            return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=${encodeURIComponent('Session expired. Please click your PIN link again.')}`);
          }

          // Verify PIN matches JWT payload
          const caseManagerData = validationResponse.caseManager;
          if (caseManagerData.caseManagerPin !== caseManagerPin) {
            fastify.log.info({
              event: 'loginPinMismatch',
              expectedPin: caseManagerData.caseManagerPin,
              providedPin: caseManagerPin,
              action: 'clearingOldCookie',
              gdprCategory: 'authentication'
            });
            reply.clearCookie('qolaeCaseManagerToken', {
              path: '/',
              domain: process.env.COOKIE_DOMAIN || '.qolae.com'
            });
            return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}`);
          }

          fastify.log.info({
            event: 'jwtValidated',
            caseManagerPin: caseManagerPin,
            expiresAt: validationResponse.expiresAt,
            gdprCategory: 'authentication'
          });

          // Redirect to 2FA page
          return reply.code(302).redirect('/caseManagers2fa');

        } catch (sessionError) {
          fastify.log.error({
            event: 'sessionCreationError',
            caseManagerPin: caseManagerPin,
            error: sessionError.message,
            stack: sessionError.stack
          });

          return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=${encodeURIComponent('Failed to create session. Please try again.')}`);
        }
    } catch (err) {
      fastify.log.error({
        event: 'caseManagerLoginError',
        caseManagerPin: caseManagerPin,
        error: err.message,
        stack: err.stack
      });

      return reply.code(302).redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin || ''}&error=${encodeURIComponent('Authentication service unavailable. Please try again.')}`);
    }
  });

  // ==============================================
  // B.2: REQUEST EMAIL VERIFICATION CODE
  // ==============================================

  fastify.post('/caseManagersAuth/requestEmailCode', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '10 minutes',
        keyGenerator: (request) => request.ip
      }
    }
  }, async (request, reply) => {
    const userIP = request.ip;
    const sessionId = request.cookies?.qolaeCaseManagerToken;

    if (!sessionId) {
      fastify.log.warn({
        event: 'verificationCodeRequestNoSession',
        ip: userIP,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent('No active session. Please log in again.'));
    }

    try {
      const ssotRes = await ssotFetch('/auth/caseManagers/2fa/requestCode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({
          ipAddress: userIP,
          userAgent: request.headers['user-agent']
        })
      });

      const ssotData = await ssotRes.json();

      if (!ssotRes.ok) {
        if (ssotRes.status === 401) {
          fastify.log.warn({
            event: 'verificationCodeRequestInvalidSession',
            error: ssotData.error,
            ip: userIP,
            gdprCategory: 'authentication'
          });
          return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent(ssotData.error || 'Session invalid. Please log in again.'));
        }
        return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent(ssotData.error || 'Failed to send verification code'));
      }

      if (ssotData.success) {
        fastify.log.info({
          event: 'verificationCodeRequested',
          caseManagerPin: ssotData.caseManager?.caseManagerPin,
          email: ssotData.caseManager?.email,
          sessionId: sessionId.substring(0, 10) + '...',
          gdprCategory: 'authentication'
        });

        return reply.code(302).redirect('/caseManagers2fa?codeSent=true');
      } else {
        fastify.log.warn({
          event: 'verificationCodeRequestApiFailed',
          error: ssotData.error,
          gdprCategory: 'authentication'
        });

        return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent(ssotData.error || 'Failed to send verification code'));
      }
    } catch (err) {
      fastify.log.error({
        event: 'verificationCodeRequestError',
        error: err.message,
        stack: err.stack,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent('Verification code service unavailable'));
    }
  });

  // ==============================================
  // B.3: 2FA VERIFICATION
  // ==============================================

  fastify.post('/caseManagersAuth/verify2fa', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '10 minutes',
        keyGenerator: (request) => request.ip
      }
    }
  }, async (request, reply) => {
    const { verificationCode } = request.body;
    const userIP = request.ip;

    fastify.log.info({
      event: '2faVerificationAttempt',
      ip: userIP,
      timestamp: new Date().toISOString(),
      gdprCategory: 'authentication'
    });

    const sessionId = request.cookies?.qolaeCaseManagerToken;

    if (!sessionId) {
      fastify.log.warn({
        event: '2faVerificationNoSession',
        ip: userIP,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent('No active session. Please log in again.'));
    }

    if (!verificationCode) {
      return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent('Verification code required'));
    }

    try {
      const ssotRes = await ssotFetch('/auth/caseManagers/2fa/verifyCode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({
          verificationCode: verificationCode,
          ipAddress: userIP,
          userAgent: request.headers['user-agent']
        })
      });

      const ssotData = await ssotRes.json();

      if (!ssotRes.ok) {
        if (ssotRes.status === 401) {
          fastify.log.warn({
            event: '2faVerificationInvalidSession',
            error: ssotData.error,
            ip: userIP,
            gdprCategory: 'authentication'
          });
          if (ssotData.redirect) {
            return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent(ssotData.error || 'Session invalid. Please log in again.'));
          }
          return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent(ssotData.error || 'Invalid verification code'));
        }
        return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent(ssotData.error || '2FA verification failed'));
      }

      if (ssotData.success) {
        const caseManagerPin = ssotData.caseManager.caseManagerPin;
        const caseManagerData = ssotData.caseManager;
        const jwtToken = ssotData.accessToken;

        fastify.log.info({
          event: '2faVerificationSuccess',
          caseManagerPin: caseManagerPin,
          complianceSubmitted: caseManagerData.complianceSubmitted,
          sessionId: sessionId.substring(0, 10) + '...',
          jwtReceived: !!jwtToken,
          gdprCategory: 'authentication'
        });

        // ===============================================================
        // HRCOMPLIANCE GATE CHECK
        // Case Managers MUST complete compliance before password setup
        // ===============================================================
        if (!caseManagerData.complianceSubmitted) {
          return reply.code(302).redirect(`${process.env.HRCOMPLIANCE_URL || 'https://hrcompliance.qolae.com'}/caseManagersCompliance?caseManagerPin=${caseManagerPin}&verified=true`);
        }

        // Redirect based on password setup status
        if (ssotData.passwordSetupCompleted) {
          return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin}&setupCompleted=true`);
        } else {
          return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin}&verified=true`);
        }
      } else {
        fastify.log.warn({
          event: '2faVerificationFailed',
          error: ssotData.error,
          gdprCategory: 'authentication'
        });

        return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent(ssotData.error || '2FA verification failed'));
      }
    } catch (err) {
      fastify.log.error({
        event: '2faVerificationError',
        error: err.message,
        stack: err.stack,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent('2FA verification service unavailable'));
    }
  });

  // ==============================================
  // B.4: SECURE LOGIN - PASSWORD SETUP/VERIFY
  // ==============================================

  fastify.post('/caseManagersAuth/secureLogin', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes',
        keyGenerator: (request) => request.ip
      }
    }
  }, async (request, reply) => {
    const { password, passwordConfirm, isNewUser, reset, caseManagerPin } = request.body;
    const userIP = request.ip;

    fastify.log.info({
      event: 'secureLoginAttempt',
      isNewUser: isNewUser,
      reset: reset,
      ip: userIP,
      timestamp: new Date().toISOString(),
      gdprCategory: 'authentication'
    });

    const jwtToken = request.cookies?.qolaeCaseManagerToken;

    if (!jwtToken) {
      fastify.log.warn({
        event: 'secureLoginNoSession',
        ip: userIP,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent('Session expired. Please click your PIN link again.'));
    }

    if (!password) {
      return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&error=` + encodeURIComponent('Password is required'));
    }

    // Server-side password match validation (for new users and password reset)
    if (passwordConfirm && password !== passwordConfirm) {
      fastify.log.warn({
        event: 'passwordMismatch',
        caseManagerPin: caseManagerPin,
        ip: userIP,
        gdprCategory: 'authentication'
      });
      return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&error=${encodeURIComponent('Passwords do not match. Please try again.')}`);
    }

    const isReset = reset === 'true' || reset === true;

    try {
      const endpoint = isReset
        ? '/auth/caseManagers/passwordReset'
        : (isNewUser === 'true' || isNewUser === true)
          ? '/auth/caseManagers/passwordSetup'
          : '/auth/caseManagers/passwordVerify';

      const requestBody = isReset
        ? { caseManagerPin: caseManagerPin, password: password, ipAddress: userIP, userAgent: request.headers['user-agent'] }
        : { password: password, ipAddress: userIP, userAgent: request.headers['user-agent'] };

      const requestHeaders = isReset
        ? { 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` };

      const ssotRes = await ssotFetch(endpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });

      const ssotData = await ssotRes.json();

      if (!ssotRes.ok) {
        if (ssotRes.status === 401) {
          const apiError = ssotData.error || '';
          const isInvalidPassword = apiError.toLowerCase().includes('invalid password');

          fastify.log.warn({
            event: isInvalidPassword ? 'secureLoginInvalidPassword' : 'secureLoginInvalidSession',
            error: apiError,
            ip: userIP,
            gdprCategory: 'authentication'
          });

          if (isInvalidPassword) {
            const resetParam = isReset ? '&reset=true' : '';
            return reply.code(302).redirect('/secureLogin?caseManagerPin=' + encodeURIComponent(caseManagerPin || '') + resetParam + '&error=' + encodeURIComponent('Invalid password. Please try again.'));
          }
          return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent('Session expired. Please click your PIN link again.'));
        }

        if (ssotRes.status === 409) {
          return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&setupCompleted=true&error=` + encodeURIComponent('Password already set up. Please enter your password.'));
        }

        return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&error=` + encodeURIComponent(ssotData.error || 'Password operation failed'));
      }

      if (ssotData.success) {
        if (ssotData.accessToken) {
          reply.setCookie('qolaeCaseManagerToken', ssotData.accessToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24
          });

          const opType = isReset ? 'reset' : (isNewUser ? 'setup' : 'verify');
        }

        const eventName = isReset ? 'passwordResetSuccess' : (isNewUser ? 'passwordSetupSuccess' : 'passwordVerifySuccess');
        fastify.log.info({
          event: eventName,
          caseManagerPin: ssotData.caseManager?.caseManagerPin,
          gdprCategory: 'authentication'
        });

        // Redirect to Dashboard
        const ssotCaseManagerPin = ssotData.caseManager?.caseManagerPin;
        if (!ssotCaseManagerPin) {
          return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&error=` + encodeURIComponent('Session data incomplete'));
        }
        return reply.code(302).redirect(`/caseManagersDashboard?caseManagerPin=${encodeURIComponent(caseManagerPin)}`);

      } else {
        fastify.log.warn({
          event: isNewUser ? 'passwordSetupFailed' : 'passwordVerifyFailed',
          error: ssotData.error,
          gdprCategory: 'authentication'
        });

        return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&error=` + encodeURIComponent(ssotData.error || 'Password operation failed'));
      }

    } catch (err) {
      fastify.log.error({
        event: 'secureLoginError',
        error: err.message,
        stack: err.stack,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect(`/secureLogin?caseManagerPin=${caseManagerPin || ''}&error=` + encodeURIComponent('Authentication service unavailable'));
    }
  });

  // ==============================================
  // B.5: LOGOUT
  // ==============================================

  fastify.post('/caseManagersAuth/logout', async (request, reply) => {
    const jwtToken = request.cookies?.qolaeCaseManagerToken;
    const userIP = request.ip;

    fastify.log.info({
      event: 'caseManagerLogoutRequest',
      hasToken: !!jwtToken,
      ip: userIP,
      timestamp: new Date().toISOString(),
      gdprCategory: 'authentication'
    });

    if (jwtToken) {
      try {
        fastify.log.info({
          event: 'jwtCleared',
          gdprCategory: 'authentication'
        });
      } catch (err) {
        fastify.log.error({
          event: 'logoutError',
          error: err.message
        });
      }
    }

    reply.header('Set-Cookie', 'qolaeCaseManagerToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');

    return reply.send({
      success: true,
      redirect: '/caseManagersLogin'
    });
  });

  // ==============================================
  // B.6: SESSION CHECK
  // ==============================================

  fastify.get('/caseManagersAuth/session', async (request, reply) => {
    return reply.send({
      success: true,
      authenticated: !!request.headers.authorization
    });
  });

}

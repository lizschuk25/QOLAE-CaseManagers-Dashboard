// ==============================================
// caseManagersAuthRoute.js - Case Managers Authentication Routes
// THE BRIDGE: Case Managers-specific authentication routes
// Author: Liz
// GDPR CRITICAL: All auth attempts must be logged
// ==============================================

// ==============================================
// LOCATION BLOCK A: IMPORTS & CONFIGURATION
// ==============================================

import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Configure axios to call the SSOT API
axios.defaults.baseURL = 'https://api.qolae.com';

// Axios response interceptor for consistent status validation
axios.interceptors.response.use(
  (response) => {
    if (response.status >= 200 && response.status < 300 && response.data === undefined) {
      console.warn('[SSOT] Response missing data payload');
    }
    return response;
  },
  (error) => {
    console.error('[SSOT] API Error:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

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

  fastify.post('/caseManagersAuth/login', async (request, reply) => {
    const { email, pin } = request.body;
    const userIP = request.ip;

    // GDPR Audit Log
    fastify.log.info({
      event: 'caseManagerLoginAttempt',
      pin: pin,
      email: email,
      ip: userIP,
      timestamp: new Date().toISOString(),
      gdprCategory: 'authentication'
    });

    if (!email || !pin) {
      return reply.code(302).redirect(`/caseManagersLogin?pin=${pin || ''}&error=${encodeURIComponent('Email and PIN are required')}`);
    }

    try {
      // Validate PIN format first
      const pinValidation = await axios.post('/api/pin/validate', {
        pin: pin,
        userType: 'caseManager'
      });

      if (!pinValidation.data.validation.isValid) {
        fastify.log.warn({
          event: 'invalidPinFormat',
          pin: pin,
          errors: pinValidation.data.validation.errors
        });

        return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}&error=${encodeURIComponent('Invalid PIN format')}`);
      }

      // Call SSOT API for authentication
      const apiResponse = await axios.post('/auth/caseManagers/requestToken', {
        email: email,
        pin,
        source: 'casemanagers-portal',
        ip: userIP
      });

      if (apiResponse.data.success) {
        fastify.log.info({
          event: 'caseManagerLoginSuccess',
          pin: pin,
          complianceSubmitted: apiResponse.data.caseManager.complianceSubmitted
        });

        try {
          const jwtToken = request.cookies?.qolaeCaseManagerToken;

          if (!jwtToken) {
            fastify.log.warn({
              event: 'loginNoJWT',
              pin: pin,
              gdprCategory: 'authentication'
            });
            return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}&error=${encodeURIComponent('Session expired. Please click your PIN link again.')}`);
          }

          // Validate JWT token via SSOT
          const validationResponse = await axios.post(
            `${process.env.API_DASHBOARD_URL || 'https://api.qolae.com'}/auth/caseManagers/session/validate`,
            { token: jwtToken }
          );

          if (!validationResponse.data.success || !validationResponse.data.valid) {
            fastify.log.warn({
              event: 'loginInvalidJWT',
              pin: pin,
              error: validationResponse.data.error || 'Invalid token',
              gdprCategory: 'authentication'
            });
            return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}&error=${encodeURIComponent('Session expired. Please click your PIN link again.')}`);
          }

          // Verify PIN matches JWT payload
          const caseManagerData = validationResponse.data.caseManager;
          if (caseManagerData.pin !== pin) {
            fastify.log.info({
              event: 'loginPinMismatch',
              expectedPin: caseManagerData.pin,
              providedPin: pin,
              action: 'clearingOldCookie',
              gdprCategory: 'authentication'
            });
            reply.clearCookie('qolaeCaseManagerToken', {
              path: '/',
              domain: process.env.COOKIE_DOMAIN || '.qolae.com'
            });
            return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}`);
          }

          fastify.log.info({
            event: 'jwtValidated',
            pin: pin,
            expiresAt: validationResponse.data.expiresAt,
            gdprCategory: 'authentication'
          });

          // Redirect to 2FA page
          return reply.code(302).redirect('/caseManagers2fa');

        } catch (sessionError) {
          fastify.log.error({
            event: 'sessionCreationError',
            pin: pin,
            error: sessionError.message,
            stack: sessionError.stack
          });

          return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}&error=${encodeURIComponent('Failed to create session. Please try again.')}`);
        }
      } else {
        fastify.log.warn({
          event: 'caseManagerLoginFailed',
          pin: pin,
          error: apiResponse.data.error
        });

        return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}&error=${encodeURIComponent(apiResponse.data.error || 'Authentication failed')}`);
      }
    } catch (err) {
      fastify.log.error({
        event: 'caseManagerLoginError',
        pin: pin,
        error: err.message,
        stack: err.stack
      });

      if (err.response?.data?.error) {
        return reply.code(302).redirect(`/caseManagersLogin?pin=${pin}&error=${encodeURIComponent(err.response.data.error)}`);
      }

      return reply.code(302).redirect(`/caseManagersLogin?pin=${pin || ''}&error=${encodeURIComponent('Authentication service unavailable. Please try again.')}`);
    }
  });

  // ==============================================
  // B.2: REQUEST EMAIL VERIFICATION CODE
  // ==============================================

  fastify.post('/caseManagersAuth/requestEmailCode', async (request, reply) => {
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
      const ssotResponse = await axios.post(
        `${process.env.API_DASHBOARD_URL || 'https://api.qolae.com'}/auth/caseManagers/2fa/requestCode`,
        {
          ipAddress: userIP,
          userAgent: request.headers['user-agent']
        },
        {
          headers: {
            'Authorization': `Bearer ${sessionId}`
          }
        }
      );

      const ssotData = ssotResponse.data;

      if (ssotData.success) {
        fastify.log.info({
          event: 'verificationCodeRequested',
          pin: ssotData.caseManager?.pin,
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
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        if (status === 401) {
          fastify.log.warn({
            event: 'verificationCodeRequestInvalidSession',
            error: errorData.error,
            ip: userIP,
            gdprCategory: 'authentication'
          });

          return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent(errorData.error || 'Session invalid. Please log in again.'));
        }
      }

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

  fastify.post('/caseManagersAuth/verify2fa', async (request, reply) => {
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
      const ssotResponse = await axios.post(
        `${process.env.API_DASHBOARD_URL || 'https://api.qolae.com'}/auth/caseManagers/2fa/verifyCode`,
        {
          verificationCode: verificationCode,
          ipAddress: userIP,
          userAgent: request.headers['user-agent']
        },
        {
          headers: {
            'Authorization': `Bearer ${sessionId}`
          }
        }
      );

      const ssotData = ssotResponse.data;

      if (ssotData.success) {
        const pin = ssotData.caseManager.pin;
        const caseManagerData = ssotData.caseManager;
        const jwtToken = ssotData.accessToken;

        console.log(`JWT token received from SSOT for PIN: ${pin}`);

        fastify.log.info({
          event: '2faVerificationSuccess',
          pin: pin,
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
          console.log(`[2FA] Case Manager ${pin} needs compliance - redirecting to HRCompliance`);
          return reply.code(302).redirect(`${process.env.HRCOMPLIANCE_URL || 'https://hrcompliance.qolae.com'}/caseManagersCompliance?pin=${pin}&verified=true`);
        }

        // Redirect based on password setup status
        if (ssotData.passwordSetupCompleted) {
          return reply.code(302).redirect(`/secureLogin?pin=${pin}&setupCompleted=true`);
        } else {
          return reply.code(302).redirect(`/secureLogin?pin=${pin}&verified=true`);
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
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        if (status === 401) {
          fastify.log.warn({
            event: '2faVerificationInvalidSession',
            error: errorData.error,
            ip: userIP,
            gdprCategory: 'authentication'
          });

          if (errorData.redirect) {
            return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent(errorData.error || 'Session invalid. Please log in again.'));
          }

          return reply.code(302).redirect('/caseManagers2fa?error=' + encodeURIComponent(errorData.error || 'Invalid verification code'));
        }
      }

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

  fastify.post('/caseManagersAuth/secureLogin', async (request, reply) => {
    const { password, isNewUser } = request.body;
    const userIP = request.ip;

    fastify.log.info({
      event: 'secureLoginAttempt',
      isNewUser: isNewUser,
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
      return reply.code(302).redirect('/secureLogin?error=' + encodeURIComponent('Password is required'));
    }

    try {
      const endpoint = isNewUser === 'true' || isNewUser === true
        ? '/auth/caseManagers/passwordSetup'
        : '/auth/caseManagers/passwordVerify';

      console.log(`Calling SSOT ${endpoint}`);

      const ssotResponse = await axios.post(
        `${process.env.API_DASHBOARD_URL || 'https://api.qolae.com'}${endpoint}`,
        {
          password: password,
          ipAddress: userIP,
          userAgent: request.headers['user-agent']
        },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );

      const ssotData = ssotResponse.data;

      if (ssotData.success) {
        if (ssotData.accessToken) {
          reply.setCookie('qolaeCaseManagerToken', ssotData.accessToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24
          });

          console.log(`Updated JWT cookie after password ${isNewUser ? 'setup' : 'verify'}`);
        }

        fastify.log.info({
          event: isNewUser ? 'passwordSetupSuccess' : 'passwordVerifySuccess',
          pin: ssotData.caseManager?.pin,
          gdprCategory: 'authentication'
        });

        // Redirect to Dashboard
        const pin = ssotData.caseManager?.pin;
        if (!pin) {
          return reply.code(302).redirect('/secureLogin?error=' + encodeURIComponent('Session data incomplete'));
        }
        return reply.code(302).redirect(`/caseManagersDashboard?pin=${encodeURIComponent(pin)}`);

      } else {
        fastify.log.warn({
          event: isNewUser ? 'passwordSetupFailed' : 'passwordVerifyFailed',
          error: ssotData.error,
          gdprCategory: 'authentication'
        });

        return reply.code(302).redirect('/secureLogin?error=' + encodeURIComponent(ssotData.error || 'Password operation failed'));
      }

    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        if (status === 401) {
          fastify.log.warn({
            event: 'secureLoginInvalidSession',
            error: errorData.error,
            ip: userIP,
            gdprCategory: 'authentication'
          });

          return reply.code(302).redirect('/caseManagersLogin?error=' + encodeURIComponent('Session expired. Please click your PIN link again.'));
        }

        if (status === 409) {
          return reply.code(302).redirect('/secureLogin?setupCompleted=true&error=' + encodeURIComponent('Password already set up. Please enter your password.'));
        }
      }

      fastify.log.error({
        event: 'secureLoginError',
        error: err.message,
        stack: err.stack,
        gdprCategory: 'authentication'
      });

      return reply.code(302).redirect('/secureLogin?error=' + encodeURIComponent('Authentication service unavailable'));
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

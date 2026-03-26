// ==============================================
// CaseManagers_server.js - Case Managers Login Portal Server
// QOLAE Case Managers Login & Authentication Hub
// THE BRIDGE: Between HRCompliance and CaseManagers-Dashboard
// Organized by Location Block Workflow Pattern
// Author: Liz
// Port: 3016
// ==============================================

// ==============================================
// LOCATION BLOCK A: IMPORTS & CONFIGURATION
// A.1: Core Dependencies & ES6 Setup
// A.2: Environment Variables
// A.3: Server Initialization
// ==============================================

// A.1: Core Dependencies & ES6 Setup
import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import ssotFetch from './utils/ssotFetch.js';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import fastifyView from '@fastify/view';
import cookie from '@fastify/cookie';
import ejs from 'ejs';
import rateLimit from '@fastify/rate-limit';

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// A.2: Environment Variables
dotenv.config({ path: `${__dirname}/.env` });

// A.3: Server Initialization
const fastify = Fastify({ logger: true, trustProxy: true });

// ==============================================
// LOCATION BLOCK B: MIDDLEWARE & PLUGINS
// B.1: CORS Configuration
// B.2: Cache-Busting Headers
// B.3: Form Body Parser
// B.4: Static File Serving
// B.5: View Engine Setup
// ==============================================

// B.1: CORS Configuration
fastify.register(cors, {
  origin: [
    'https://admin.qolae.com',
    'https://api.qolae.com',
    'https://lawyers.qolae.com',
    'https://clients.qolae.com',
    'https://hrcompliance.qolae.com',
    'https://casemanagers.qolae.com',
    'https://readers.qolae.com',
  ],
  methods: ['GET', 'POST'],
  credentials: true
});

// B.2: Cache-Busting Middleware - Prevent stale content
fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
  reply.header('Last-Modified', new Date().toUTCString());
  reply.header('ETag', `"${Date.now()}"`);
});

// B.3: Form Body Parser
fastify.register(formbody);

// B.3.1: Cookie Parser
fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || process.env.CASEMANAGERS_LOGIN_JWT_SECRET,
  parseOptions: {}
});

// B.3.2: Rate Limiting Plugin (per-route config only, no global default)
await fastify.register(rateLimit, {
  global: false
});

// B.4: Static File Serving (GDPR compliant)
const staticRoots = [path.join(__dirname, 'public')];
const staticPrefixes = ['/public/'];

if (process.env.CENTRAL_REPOSITORY_PATH) {
  staticRoots.push(process.env.CENTRAL_REPOSITORY_PATH);
  staticPrefixes.push('/centralRepository/');
}

fastify.register(await import('@fastify/static'), {
  root: staticRoots,
  prefix: staticPrefixes
});

// B.5: View Engine Setup
fastify.register(fastifyView, {
  engine: {
    ejs: ejs
  },
  root: path.join(__dirname, 'views')
});

// B.6: Rate Limit Error Handler (429 → server-side redirect)
fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 429) {
    const redirectMap = {
      '/caseManagersAuth/login': '/caseManagersLogin?error=' + encodeURIComponent('Too many login attempts. Please try again in 15 minutes.'),
      '/caseManagersAuth/requestEmailCode': '/caseManagers2fa?error=' + encodeURIComponent('Too many code requests. Please wait 10 minutes.'),
      '/caseManagersAuth/verify2fa': '/caseManagers2fa?error=' + encodeURIComponent('Too many verification attempts. Please wait 10 minutes.'),
      '/caseManagersAuth/secureLogin': '/secureLogin?error=' + encodeURIComponent('Too many password attempts. Please try again in 15 minutes.')
    };
    const redirectUrl = redirectMap[request.url.split('?')[0]] || '/caseManagersLogin?error=' + encodeURIComponent('Too many requests. Please try again later.');
    return reply.code(302).redirect(redirectUrl);
  }
  reply.send(error);
});

// ==============================================
// LOCATION BLOCK C: AUTHENTICATION SETUP
// C.1: JWT Configuration
// C.2: JWT Verification Middleware
// C.3: Security Helper Functions
// ==============================================

// C.1: JWT Secret
const JWT_SECRET = process.env.CASEMANAGERS_LOGIN_JWT_SECRET;

// C.2: Middleware to verify JWT token
const authenticateToken = async (request, reply) => {
  const authHeader = request.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return reply.code(401).send({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    request.user = decoded;
  } catch (err) {
    return reply.code(403).send({ error: 'Invalid token' });
  }
};

// C.3: Security Helper Functions
import crypto from 'crypto';

function generateSecureToken() {
  return crypto.randomBytes(8).toString('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateDeviceFingerprint(req) {
  const components = [
    req.headers['user-agent'],
    req.headers['accept-language'],
    req.headers['accept-encoding']
  ].join('|');

  return crypto.createHash('sha256').update(components).digest('hex');
}

// ==============================================
// LOCATION BLOCK 1: CORE ROUTING
// 1.1: Root & Redirect Routes
// 1.2: Login Page Routes
// 1.3: 2FA Authentication Route
// 1.4: Dashboard & Logout Routes
// ==============================================

// 1.1: Root Route - Redirect to Login
fastify.get('/', async (request, reply) => {
  return reply.redirect('/caseManagersLogin');
});

// 1.2a: Case Managers Login Page - Main Route with PIN Access via SSOT
fastify.get('/caseManagersLogin', async (request, reply) => {
  const { caseManagerPin } = request.query;
  const userIP = request.ip;
  const userAgent = request.headers['user-agent'];

  // ===============================================================
  // SCENARIO A: NO PIN = Show Login Form (Logout/Direct Access)
  // ===============================================================
  if (!caseManagerPin) {
    return reply.view('caseManagersLogin.ejs', {
      title: 'QOLAE Case Managers Login',
      caseManagerPin: '',
      email: '',
      caseManagerName: '',
      isFirstAccess: false,
      tokenStatus: '',
      error: request.query.error || null,
      success: request.query.success || null,
      message: 'Please enter your Case Manager PIN and email address to log in'
    });
  }

  // ===============================================================
  // SCENARIO B: HAS PIN = Email Hyperlink Flow
  // Uses SSOT endpoint /auth/caseManagers/pinAccess
  // ===============================================================

  try {
    const deviceFingerprint = generateDeviceFingerprint(request);

    const ssotResponse = await ssotFetch('/auth/caseManagers/pinAccess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseManagerPin: caseManagerPin,
        deviceFingerprint: deviceFingerprint,
        ipAddress: userIP,
        userAgent: userAgent
      })
    });

    const ssotData = await ssotResponse.json();

    if (!ssotResponse.ok) {
      if (ssotResponse.status === 401) {
        return reply.code(404).send('Invalid Case Manager PIN');
      }
      if (ssotResponse.status === 403) {
        return reply.code(403).send(`
          <h2>Access Revoked</h2>
          <p>Your access has been revoked. Contact support@qolae.com</p>
        `);
      }
      return reply.code(500).send('Internal server error');
    }

    if (!ssotData.success) {
      return reply.code(401).send('Invalid Case Manager PIN');
    }

    // Initialize session if it doesn't exist
    if (!request.session) {
      request.session = {};
    }

    request.session.caseManager = {
      caseManagerPin: ssotData.caseManager.caseManagerPin,
      email: ssotData.caseManager.email,
      firstName: ssotData.caseManager.firstName,
      lastName: ssotData.caseManager.lastName,
      accessToken: ssotData.token,
      tokenStatus: 'active',
      jwtToken: ssotData.token,
      deviceFingerprint: deviceFingerprint,
      isFirstAccess: ssotData.isNewCaseManager,
      authenticated2FA: false,
      authenticatedPassword: false
    };

    // Set HTTP-only JWT cookie
    reply.setCookie('qolaeCaseManagerToken', ssotData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ssotData.expiresIn,
      path: '/',
      domain: process.env.COOKIE_DOMAIN || '.qolae.com'
    });

    return reply.view('caseManagersLogin.ejs', {
      title: 'QOLAE Case Managers Login',
      caseManagerPin: ssotData.caseManager.caseManagerPin,
      email: ssotData.caseManager.email,
      firstName: ssotData.caseManager.firstName,
      lastName: ssotData.caseManager.lastName,
      isFirstAccess: ssotData.isNewCaseManager,
      tokenStatus: 'active',
      error: request.query.error || null,
      success: request.query.success || null
    });

  } catch (error) {
    console.error('[SSOT] CaseManagersLogin error:', error.message);
    return reply.code(500).send('Internal server error');
  }
});

// 1.2b: Backward compatibility redirect
fastify.get('/login', async (request, reply) => {
  const { caseManagerPin } = request.query;
  const redirectUrl = caseManagerPin ? `/caseManagersLogin?caseManagerPin=${caseManagerPin}` : '/caseManagersLogin';
  return reply.redirect(redirectUrl);
});

// 1.3: 2FA Authentication Page
fastify.get('/caseManagers2fa', async (request, reply) => {
  const sessionId = request.cookies.qolaeCaseManagerToken;
  const codeSent = request.query.codeSent === 'true';
  const errorMsg = request.query.error ? decodeURIComponent(request.query.error) : '';

  // Default view data - always pass all variables
  const viewData = {
    title: '2-Way Authentication - QOLAE Case Managers Portal',
    caseManagerPin: '',
    email: '',
    caseManagerName: '',
    authToken: '',
    codeSent: codeSent,
    error: errorMsg,
    success: codeSent ? 'Verification code sent! Check your email inbox.' : ''
  };

  if (!sessionId) {
    viewData.error = 'No active session. Please return to login.';
    return reply.view('caseManagers2fa.ejs', viewData);
  }

  try {
    const sessionRes = await ssotFetch('/auth/caseManagers/session/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionId })
    });
    const sessionData = await sessionRes.json();

    if (!sessionRes.ok || !sessionData.success) {
      viewData.error = sessionData.error || 'Session invalid. Please return to login.';
      return reply.view('caseManagers2fa.ejs', viewData);
    }

    const caseManager = sessionData.caseManager;

    viewData.caseManagerPin = caseManager.caseManagerPin || '';
    viewData.email = caseManager.caseManagerEmail || '';
    viewData.caseManagerName = caseManager.caseManagerName || '';
    viewData.authToken = sessionId;

    return reply.view('caseManagers2fa.ejs', viewData);

  } catch (error) {
    fastify.log.error('2FA page error:', error.message);
    viewData.error = 'An error occurred. Please return to login.';
    return reply.view('caseManagers2fa.ejs', viewData);
  }
});

// 1.4a: Secure Login (Password Setup) - WITH HRCOMPLIANCE GATE
fastify.get('/secureLogin', async (req, reply) => {
  const { verified, caseManagerPin } = req.query;
  const token = req.cookies.qolaeCaseManagerToken;

  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');

  if (!caseManagerPin) {
    return reply.code(400).send('Case Manager PIN required');
  }

  if (!token) {
    return reply.redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=sessionExpired`);
  }

  try {
    const statusRes = await ssotFetch('/auth/caseManagers/loginStatus', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const statusData = await statusRes.json();

    if (!statusRes.ok || !statusData.success) {
      return reply.redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=statusCheckFailed`);
    }

    const caseManager = statusData.caseManager;
    // ===============================================================
    // NOTE: Compliance gate is handled at 2FA stage (caseManagersAuthRoute.js)
    // Consistent with Readers/Lawyers/Clients pattern - single gate only
    // ===============================================================

    const userStatus = {
      isFirstTime: !caseManager.passwordSetupCompleted,
      hasPassword: caseManager.hasPassword,
      tokenStatus: caseManager.pinAccessTokenStatus,
      complianceSubmitted: caseManager.complianceSubmitted,
      complianceApproved: caseManager.complianceApproved
    };

    const progressSteps = [
      { key: 'linkClicked', label: 'Email Link Clicked', completed: true },
      { key: '2faVerified', label: '2FA Verification', completed: userStatus.hasPassword || userStatus.tokenStatus === 'active' },
      { key: 'complianceSubmitted', label: 'Compliance Submitted', completed: userStatus.complianceSubmitted },
      { key: 'passwordCreated', label: 'Password Setup', completed: userStatus.hasPassword },
      { key: 'workspaceAccess', label: 'Workspace Access', completed: userStatus.tokenStatus === 'active' && userStatus.complianceApproved }
    ];

    const completedSteps = progressSteps.filter(step => step.completed).length;
    const progressPercentage = Math.round((completedSteps / progressSteps.length) * 100);

    let uiState = 'unknown';
    let welcomeMessage = '';
    let actionRequired = '';

    const isPasswordReset = req.query.reset === 'true' || req.query.forgot === 'true';
    const fullName = caseManager.caseManagerName || 'Case Manager';

    if (isPasswordReset) {
      uiState = 'forgotPassword';
      welcomeMessage = `Reset Your Password`;
      actionRequired = 'Enter your email to receive a password reset link';
    } else if (userStatus.isFirstTime && !userStatus.hasPassword) {
      uiState = 'firstTimeSetup';
      welcomeMessage = `Welcome ${fullName}! Let's set up your secure workspace.`;
      actionRequired = 'Create your password to activate access';
    } else if (userStatus.hasPassword && userStatus.tokenStatus === 'pending') {
      uiState = 'passwordRequired';
      welcomeMessage = `Welcome back ${fullName}! Complete your setup.`;
      actionRequired = 'Create your password to activate access';
    } else if (userStatus.hasPassword && userStatus.tokenStatus === 'active') {
      uiState = 'returningUser';
      welcomeMessage = `Welcome back ${fullName}!`;
      actionRequired = 'Enter your password to access your workspace';
    } else if (userStatus.tokenStatus === 'revoked') {
      uiState = 'accessRevoked';
      welcomeMessage = `Access Revoked`;
      actionRequired = 'Contact support@qolae.com for assistance';
    }

    // Security logging (non-blocking)
    await ssotFetch('/auth/caseManagers/securityLog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseManagerPin: caseManagerPin,
        eventType: 'secureLoginPageAccessed',
        eventStatus: 'success',
        details: {
          uiState: uiState,
          progressPercentage: progressPercentage,
          completedSteps: completedSteps,
          isPasswordReset: isPasswordReset,
          source: 'CaseManagersLoginPortal'
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        riskScore: 0
      })
    }).catch(() => {});

    return reply.view('secureLogin.ejs', {
      title: 'Secure Login - QOLAE Case Managers Portal',
      verified: verified === 'true' || verified === true,
      caseManagerPin: caseManagerPin,
      state: isPasswordReset ? 'resetPassword' : (userStatus.isFirstTime ? 'createPassword' : 'loginPassword'),
      userStatus: userStatus,
      uiState: uiState,
      welcomeMessage: welcomeMessage,
      actionRequired: actionRequired,
      progressSteps: progressSteps,
      progressPercentage: progressPercentage,
      completedSteps: completedSteps,
      caseManagerName: caseManager.caseManagerName || `${caseManager.firstName || ''} ${caseManager.lastName || ''}`.trim(),
      caseManagerEmail: caseManager.caseManagerEmail || caseManager.email || '',
      tokenStatus: userStatus.tokenStatus,
      isFirstTime: userStatus.isFirstTime,
      hasPassword: userStatus.hasPassword,
      setupCompleted: req.query.setupCompleted === 'true',
      errorMessage: req.query.error ? decodeURIComponent(req.query.error) : '',
      newDevice: req.query.newDevice === 'true',
      previousIp: req.query.previousIp || ''
    });

  } catch (error) {
    console.error('SecureLogin SSOT error:', error.message);

    await ssotFetch('/auth/caseManagers/securityLog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseManagerPin: caseManagerPin,
        eventType: 'secureLoginError',
        eventStatus: 'failure',
        details: { error: error.message, source: 'CaseManagersLoginPortal' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        riskScore: 30
      })
    }).catch(() => {});

    return reply.redirect(`/caseManagersLogin?caseManagerPin=${caseManagerPin}&error=secureLoginFailed`);
  }
});

// 1.4b: Logout
fastify.post('/logout', async (request, reply) => {
  const jwtToken = request.cookies?.qolaeCaseManagerToken;

  if (jwtToken) {
    try {
      const decoded = jwt.verify(jwtToken, process.env.CASEMANAGERS_LOGIN_JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.caseManagerPin) {
        await ssotFetch('/auth/invalidateSession', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userType: 'caseManagers', pin: decoded.caseManagerPin })
        });
      }
    } catch (err) {
      console.error('Session invalidation failed:', err.message);
    }
  }

  reply.clearCookie('qolaeCaseManagerToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    domain: '.qolae.com'
  });

  return reply.redirect('/CaseManagersLogin');
});

// ==============================================
// LOCATION BLOCK 2: HELPER FUNCTIONS
// (checkCaseManagerInSystem removed — Session 127, dead code, auth uses SSOT endpoints directly)
// ==============================================

// ==============================================
// LOCATION BLOCK 3: EXTERNAL ROUTE MODULES
// ==============================================

// ==============================================
// LOCATION BLOCK 4: SERVER STARTUP
// ==============================================

const start = async () => {
  try {
    const { default: caseManagersAuthRoute } = await import('./routes/caseManagersAuthRoute.js');
    await fastify.register(caseManagersAuthRoute);

    await fastify.listen({
      port: process.env.PORT || 3016,
      host: '0.0.0.0'
    });
    const address = fastify.server.address();
    fastify.log.info(`CaseManagersLoginPortal running on port ${address.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

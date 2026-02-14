// ==============================================
// QOLAE CASE MANAGERS DASHBOARD SERVER
// ==============================================
// Purpose: Main server for Case Managers Dashboard
// Handles readers registration, report assignments, and payment approvals
// Author: Liz
// Date: October 7, 2025
// ==============================================

import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import ejs from 'ejs';
import fastifyFormbody from '@fastify/formbody';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================
// SSOT CONFIGURATION
// ==============================================
// Configure base URL for server-to-server calls to SSOT (API-Dashboard)
// Follows LawyersDashboard architecture pattern
const SSOT_BASE_URL = process.env.SSOT_BASE_URL || 'https://api.qolae.com';

// ==============================================
// SSOT HELPER FUNCTIONS
// ==============================================

/**
 * Build case manager bootstrap data from SSOT API
 * Follows LawyersDashboard buildLawyerBootstrapData() pattern
 * @param {string} caseManagerPin - Case Manager PIN
 * @returns {object|null} Bootstrap data or null
 */
async function buildCaseManagerBootstrapData(caseManagerPin) {
  try {
    console.log(`📊 [SSR] Building bootstrap data for Case Manager PIN: ${caseManagerPin}`);

    // Step 1: Get stored JWT token from SSOT (caseManagers-namespaced endpoint)
    const tokenResponse = await fetch(`${SSOT_BASE_URL}/auth/caseManagers/getStoredToken?caseManagerPin=${caseManagerPin}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!tokenResponse.ok) {
      console.warn(`⚠️ [SSR] No valid JWT token found for caseManagerPin: ${caseManagerPin}`);
      return null;
    }

    const tokenData = await tokenResponse.json();
    const { accessToken } = tokenData;

    // Step 2: Call SSOT bootstrap endpoint with stored JWT token (caseManagers-namespaced)
    const bootstrapResponse = await fetch(`${SSOT_BASE_URL}/caseManagers/workspace/bootstrap`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (bootstrapResponse.ok) {
      const bootstrapData = await bootstrapResponse.json();
      console.log(`✅ [SSR] Bootstrap data fetched successfully for ${caseManagerPin}`);
      return bootstrapData;
    } else {
      console.error(`❌ [SSR] SSOT bootstrap failed:`, bootstrapResponse.status);
      return null;
    }

  } catch (error) {
    console.error(`❌ [SSR] Bootstrap error for ${caseManagerPin}:`, error.message);
    return null;
  }
}

// Make bootstrap function available to routes
export { buildCaseManagerBootstrapData, SSOT_BASE_URL };

// ==============================================
// FASTIFY SERVER INITIALIZATION
// ==============================================

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// ==============================================
// MIDDLEWARE REGISTRATION
// ==============================================

// 1. CORS Configuration
await server.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN || 'https://casemanagers.qolae.com',
  credentials: true,
});

// 2. JWT Authentication
await server.register(fastifyJwt, {
  secret: process.env.CASEMANAGERS_LOGIN_JWT_SECRET,
  cookie: {
    cookieName: 'qolaeCaseManagerToken',
    signed: false,
  },
});

// 3. Cookie Support
await server.register(fastifyCookie);

// 4. Form Body Parser
await server.register(fastifyFormbody);

// 5. Static Files
await server.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

// 6. View Engine (EJS)
await server.register(fastifyView, {
  engine: {
    ejs: ejs,
  },
  root: path.join(__dirname, 'views'),
  options: {
    filename: path.join(__dirname, 'views'),
  },
});

// ==============================================
// AUTHENTICATION DECORATOR
// ==============================================
// JWT verification decorator (used by NDA proxy routes and other plugins)
// @fastify/jwt is registered above — request.jwtVerify() is available
server.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'caseManager') {
      throw new Error('Unauthorized role');
    }
  } catch (error) {
    reply.code(401).send({ success: false, error: 'Authentication required' });
  }
});

// ==============================================
// ROUTES REGISTRATION
// ==============================================

// Case Managers Routes (Readers Registration, etc.)
await server.register(import('./routes/caseManagerRoutes.js'));

// NDA Workflow Routes (4-step process)
await server.register(import('./routes/ndaRoutes.js'));

// ==============================================
// ROOT ROUTE
// ==============================================

server.get('/', async (request, reply) => {
  return reply.redirect('/case-managers-dashboard');
});

// ==============================================
// HEALTH CHECK
// ==============================================

server.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    service: 'qolae-case-managers-dashboard',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };
});

// ==============================================
// ERROR HANDLING
// ==============================================

server.setErrorHandler((error, request, reply) => {
  server.log.error(error);

  // Send appropriate error response
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// ==============================================
// SERVER START
// ==============================================

const start = async () => {
  try {
    const port = process.env.PORT || 3006;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🏥 QOLAE CASE MANAGERS DASHBOARD STARTED     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📍 Server running at: http://${host}:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Database: qolae_casemanagers`);
    console.log('');
    console.log('Available Routes:');
    console.log('  🏠 Dashboard: /caseManagersDashboard');
    console.log('  📝 NDA Workflow: /nda/*');
    console.log('  📋 Auto-Assign Case: POST /api/caseManagers/assignCaseAuto');
    console.log('  📊 Cases With Priority: GET /api/caseManagers/casesWithPriority');
    console.log('  🔔 Badge Counts: GET /api/caseManagers/badgeCounts');
    console.log('  ❤️ Health Check: /api/caseManagers/health');
    console.log('');
    console.log('Ready for case management! 🚀');
    console.log('');

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Case Managers Dashboard...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Case Managers Dashboard...');
  await server.close();
  process.exit(0);
});

// Start the server
start();

export default server;

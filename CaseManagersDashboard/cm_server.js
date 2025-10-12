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
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 2. Form Body Parser
await server.register(fastifyFormbody);

// 3. Static Files
await server.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

// 4. View Engine (EJS)
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
// ROUTES REGISTRATION
// ==============================================

// Case Managers Routes (Readers Registration, etc.)
await server.register(import('./routes/caseManagerRoutes.js'));

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
    console.log(`📊 Database: qolae_readers`);
    console.log('');
    console.log('Available Routes:');
    console.log('  🏠 Dashboard: /case-managers-dashboard');
    console.log('  📖 Register Reader: /readers-registration-card');
    console.log('  🔑 Generate PIN: POST /api/case-managers/generate-reader-pin');
    console.log('  🔍 Verify Registration: POST /api/case-managers/verify-medical-registration');
    console.log('  ✅ Register Reader: POST /api/case-managers/register-reader');
    console.log('  ❤️ Health Check: /health');
    console.log('');
    console.log('Ready to register readers! 🚀');
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

// ==============================================
// SESSION MANAGER MIDDLEWARE - CASE MANAGERS
// ==============================================
// Author: Liz
// Purpose: Secure HTTP-only cookie session management for CaseManagersLoginPortal
// Features: 5-hour session, multi-device detection, GDPR compliant
// ==============================================

import { Pool } from 'pg';
import crypto from 'crypto';

// Lazy-loaded database connection
let caseManagersDb = null;

function getDatabase() {
  if (!caseManagersDb) {
    console.log('Initializing database pool with CASEMANAGERS_DATABASE_URL...');
    caseManagersDb = new Pool({
      connectionString: process.env.CASEMANAGERS_DATABASE_URL || 'postgresql://casemanagers_user:CMqolae25@localhost:5432/qolae_casemanagers'
    });
  }
  return caseManagersDb;
}

// ==============================================
// CONFIGURATION
// ==============================================

const SESSION_CONFIG = {
  TIMEOUT_MINUTES: 300,
  TIMEOUT_MS: 5 * 60 * 60 * 1000,      // 5 hours (matches JWT expiry)
  COOKIE_NAME: 'qolaeCaseManagerToken', // JWT-based, role-specific
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 5 * 60 * 60 * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || '.qolae.com'
  }
};

export { SESSION_CONFIG };

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateDeviceFingerprint(userAgent) {
  return crypto.createHash('sha256').update(userAgent || '').digest('hex');
}

function calculateEventHash(eventData) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(eventData))
    .digest('hex');
}

async function logSessionEvent(sessionId, pin, eventType, eventStatus, details = {}) {
  try {
    const eventHash = calculateEventHash({
      sessionId,
      pin,
      eventType,
      eventStatus,
      timestamp: new Date().toISOString()
    });

    await getDatabase().query(`
      INSERT INTO "caseManagerSessionEvents"
      ("sessionId", "pin", "eventType", "eventStatus", details, "eventHash", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [sessionId, pin, eventType, eventStatus, JSON.stringify(details), eventHash]);

    console.log(`Session event logged: ${eventType}/${eventStatus} for ${pin}`);
  } catch (error) {
    console.error('Error logging session event:', error.message);
  }
}

// ==============================================
// CORE SESSION FUNCTIONS
// ==============================================

export async function createSession(caseManager, request) {
  try {
    console.log(`Starting session creation for ${caseManager.pin}...`);

    const sessionToken = generateSessionToken();
    const deviceFingerprint = generateDeviceFingerprint(request.headers['user-agent']);
    const ipAddress = request.ip;
    const expiresAt = new Date(Date.now() + SESSION_CONFIG.TIMEOUT_MS);

    const previousLogin = await getDatabase().query(`
      SELECT "ipAddress", "createdAt"
      FROM "caseManagerSessions"
      WHERE "pin" = $1 AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [caseManager.pin]);

    const previousLoginData = previousLogin.rows[0] || null;
    const sameDevice = previousLoginData?.ipAddress === ipAddress;

    const result = await getDatabase().query(`
      INSERT INTO "caseManagerSessions"
      ("pin", "sessionToken", "ipAddress", "userAgent", "deviceFingerprint",
       "createdAt", "expiresAt", "previousLoginIp", "previousLoginTimestamp", "sameDeviceLogin")
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
      RETURNING id, "sessionToken", "expiresAt"
    `, [
      caseManager.pin,
      sessionToken,
      ipAddress,
      request.headers['user-agent'],
      deviceFingerprint,
      expiresAt,
      previousLoginData?.ipAddress || null,
      previousLoginData?.createdAt || null,
      sameDevice
    ]);

    const sessionId = result.rows[0].id;

    await logSessionEvent(
      sessionId,
      caseManager.pin,
      'sessionCreated',
      'success',
      {
        device: sameDevice ? 'knownDevice' : 'newDevice',
        ipAddress: ipAddress,
        previousLoginIp: previousLoginData?.ipAddress || null
      }
    );

    console.log(`Session created for ${caseManager.pin} (${sameDevice ? 'known device' : 'NEW DEVICE'})`);

    return {
      sessionId,
      sessionToken,
      expiresAt,
      isNewDevice: !sameDevice,
      previousLoginIp: previousLoginData?.ipAddress || null,
      previousLoginTime: previousLoginData?.createdAt || null
    };
  } catch (error) {
    console.error('Session creation error:', error.message);
    throw error;
  }
}

export async function validateSession(sessionToken) {
  try {
    if (!sessionToken) return null;

    const result = await getDatabase().query(`
      SELECT
        cms.id,
        cms."pin",
        cms."createdAt",
        cms."expiresAt",
        cms."isTrustedDevice",
        ns."email",
        ns."firstName",
        ns."lastName"
      FROM "caseManagerSessions" cms
      JOIN "newStarters" ns ON cms."pin" = ns.pin
      WHERE cms."sessionToken" = $1
        AND cms."expiresAt" > NOW()
      LIMIT 1
    `, [sessionToken]);

    if (result.rowCount === 0) {
      console.warn('Invalid or expired session token');
      return null;
    }

    const session = result.rows[0];
    console.log(`Session valid for ${session.pin}`);
    return session;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function updateActivity(sessionToken) {
  try {
    const result = await getDatabase().query(`
      UPDATE "caseManagerSessions"
      SET "lastActivity" = NOW()
      WHERE "sessionToken" = $1 AND "expiresAt" > NOW()
      RETURNING id, "pin"
    `, [sessionToken]);

    if (result.rowCount > 0) {
      console.log(`Activity updated for session ${sessionToken.substring(0, 8)}...`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Activity update error:', error);
    return false;
  }
}

export async function destroySession(sessionToken) {
  try {
    const result = await getDatabase().query(`
      DELETE FROM "caseManagerSessions"
      WHERE "sessionToken" = $1
      RETURNING id, "pin"
    `, [sessionToken]);

    if (result.rowCount > 0) {
      const session = result.rows[0];
      await logSessionEvent(
        session.id,
        session.pin,
        'sessionDestroyed',
        'success',
        { reason: 'userLogout' }
      );
      console.log(`Session destroyed for ${session.pin}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Session destruction error:', error);
    return false;
  }
}

export async function cleanupExpiredSessions() {
  try {
    const db = getDatabase();
    const result = await db.query(`
      DELETE FROM "caseManagerSessions"
      WHERE "expiresAt" < NOW()
      RETURNING "pin"
    `);

    if (result.rowCount > 0) {
      console.log(`Cleaned up ${result.rowCount} expired sessions`);
    }

    return result.rowCount;
  } catch (error) {
    console.error('Session cleanup error:', error.message);
    return 0;
  }
}

// ==============================================
// FASTIFY PLUGIN REGISTRATION
// ==============================================

export default async function sessionMiddleware(fastify, options) {
  setInterval(cleanupExpiredSessions, 60 * 1000);

  fastify.decorate('session', {
    createSession,
    validateSession,
    updateActivity,
    destroySession,
    cleanupExpiredSessions,
    config: SESSION_CONFIG
  });

  console.log('Session middleware registered');
  console.log(`Session timeout: ${SESSION_CONFIG.TIMEOUT_MINUTES} minutes`);
}

// ==============================================
// CASE MANAGERS ROUTES
// ==============================================
// Purpose: Handles all Case Managers Dashboard operations
// including Readers Registration workflow
// Used by: Case Managers Dashboard (casemanagers.qolae.com)
// Database: qolae_readers (PostgreSQL)
// ==============================================

import CaseManagersController from '../controllers/CaseManagersController.js';

export default async function (fastify, opts) {

  // ==============================================
  // LOCATION BLOCK 1: VIEWS & NAVIGATION
  // ==============================================

  /**
   * GET /readers-registration-card
   * Display the Readers Registration Card form
   */
  fastify.get('/readers-registration-card', async (req, reply) => {
    return reply.view('readers-registration-card');
  });

  /**
   * GET /case-managers-dashboard
   * Return to main Case Managers Dashboard
   */
  fastify.get('/case-managers-dashboard', async (req, reply) => {
    return reply.view('casemanagers-dashboard');
  });

  // ==============================================
  // LOCATION BLOCK 2: READER PIN GENERATION
  // ==============================================

  /**
   * POST /api/case-managers/generate-reader-pin
   * Generate unique Reader PIN from reader name
   *
   * Body: { readerName: string }
   * Returns: { success: boolean, pin: string }
   */
  fastify.post('/api/case-managers/generate-reader-pin', async (req, reply) => {
    return await CaseManagersController.generateReaderPIN(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 3: MEDICAL REGISTRATION VERIFICATION
  // ==============================================

  /**
   * POST /api/case-managers/verify-medical-registration
   * Verify NMC/GMC professional registration number
   *
   * Body: {
   *   registrationBody: 'NMC' | 'GMC' | 'Other',
   *   registrationNumber: string
   * }
   * Returns: {
   *   success: boolean,
   *   verified: boolean,
   *   name?: string,
   *   status?: string
   * }
   */
  fastify.post('/api/case-managers/verify-medical-registration', async (req, reply) => {
    return await CaseManagersController.verifyMedicalRegistration(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 4: READER REGISTRATION
  // ==============================================

  /**
   * POST /api/case-managers/register-reader
   * Register a new reader in the system and send invitation email
   *
   * Body: {
   *   readerPin: string,
   *   readerName: string,
   *   email: string,
   *   phone?: string,
   *   readerType: 'first_reader' | 'second_reader',
   *   specialization?: string,
   *   registrationBody?: 'NMC' | 'GMC' | 'Other',
   *   registrationNumber?: string,
   *   registrationVerified?: boolean,
   *   sendEmail: boolean
   * }
   * Returns: {
   *   success: boolean,
   *   message: string,
   *   readerPin: string,
   *   emailSent: boolean
   * }
   */
  fastify.post('/api/case-managers/register-reader', async (req, reply) => {
    return await CaseManagersController.registerReader(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 5: HEALTH CHECK
  // ==============================================

  /**
   * GET /api/case-managers/health
   * Health check for Case Managers API
   */
  fastify.get('/api/case-managers/health', async (req, reply) => {
    return {
      service: 'case-managers',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'qolae_readers'
    };
  });

}

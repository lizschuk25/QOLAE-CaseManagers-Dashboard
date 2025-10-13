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
   * Display Case Managers Dashboard with role-based rendering
   *
   * Role Types:
   * - 'management' (Liz): All 4 tabs (My Cases, Reader Mgmt, Approval Queue, CM Mgmt)
   * - 'operational' (Contractor CMs): My Cases tab only
   */
  fastify.get('/case-managers-dashboard', async (req, reply) => {
    // TODO: Implement authentication to get actual user data
    // For now, default to management role (Liz)
    const userData = {
      cmName: 'Liz',
      userRole: 'management', // 'management' or 'operational'
      pin: 'CM-002690'
    };

    return reply.view('case-managers-dashboard', userData);
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
  // LOCATION BLOCK 5: AUTO-ASSIGN CASE
  // ==============================================

  /**
   * POST /api/case-managers/assign-case-auto
   * Auto-assign case to CM with lowest workload
   * Triggered when Lawyer completes Case Referral form
   *
   * Body: {
   *   casePin: string,
   *   lawyerPin: string,
   *   lawyerName: string,
   *   clientName: string,
   *   caseType: string,
   *   referralData: object
   * }
   * Returns: {
   *   success: boolean,
   *   message: string,
   *   assignedCM: { cmId, cmName, cmPin, currentWorkload },
   *   caseDetails: { caseId, casePin, status, stage, stageLabel }
   * }
   */
  fastify.post('/api/case-managers/assign-case-auto', async (req, reply) => {
    return await CaseManagersController.autoAssignCase(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 6: CASES WITH PRIORITY ALGORITHM
  // ==============================================

  /**
   * GET /api/case-managers/cases-with-priority
   * Get all cases with auto-calculated priority indicators
   *
   * Query Params:
   * - cmPin (optional): Filter by Case Manager PIN
   * - filter (optional): 'urgent' | 'today' | 'ready' | 'pending'
   *
   * Returns: {
   *   success: boolean,
   *   cases: [{
   *     casePin, clientName, assignedCM, status,
   *     workflowStage, stageLabel, progressPercent,
   *     priority: { level, color, emoji, label, days },
   *     daysInStage, stageUpdatedAt, createdAt
   *   }],
   *   count: number
   * }
   */
  fastify.get('/api/case-managers/cases-with-priority', async (req, reply) => {
    return await CaseManagersController.getCasesWithPriority(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 7: BADGE COUNTS (AUTO-REFRESH)
  // ==============================================

  /**
   * GET /api/case-managers/badge-counts
   * Get real-time counts for Action Center badges
   * Auto-refreshes every 30 seconds on dashboard
   *
   * Returns: {
   *   success: boolean,
   *   counts: {
   *     urgent: number,     // Cases stuck >5 days
   *     today: number,      // INA visits today
   *     ready: number,      // Consents received
   *     pending: number,    // Awaiting reader assignment
   *     approvalQueue: number  // Payment + closure approvals
   *   }
   * }
   */
  fastify.get('/api/case-managers/badge-counts', async (req, reply) => {
    return await CaseManagersController.getBadgeCounts(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 7: HEALTH CHECK
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

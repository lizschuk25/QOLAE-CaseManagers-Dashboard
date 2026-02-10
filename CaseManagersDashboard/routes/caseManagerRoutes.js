// ==============================================
// CASE MANAGERS ROUTES
// ==============================================
// Purpose: Handles all Case Managers Dashboard operations
// Used by: Case Managers Dashboard (casemanagers.qolae.com)
// Database: qolae_casemanagers (PostgreSQL)
// Architecture: SSOT Bootstrap Pattern (Follows LawyersDashboard)
// ==============================================

import CaseManagersController from '../controllers/CaseManagersController.js';
import pg from 'pg';

const { Pool } = pg;

// SSOT Base URL (API-Dashboard)
const SSOT_BASE_URL = process.env.SSOT_BASE_URL || 'https://api.qolae.com';

// Database connection for modal-specific queries
const caseManagersDb = new Pool({
  connectionString: process.env.CASEMANAGERS_DATABASE_URL
});

export default async function (fastify, opts) {

  // ==============================================
  // LOCATION BLOCK 1: VIEWS & NAVIGATION
  // ==============================================

  /**
   * GET /readers-registration-card
   * Display the Readers Registration Card form
   */
  fastify.get('/readersRegistrationCard', async (req, reply) => {
    return reply.view('readers-registration-card');
  });

  /**
   * GET /caseManagersDashboard
   * Display Case Managers Dashboard with role-based rendering
   * Architecture: 100% Server-Side, SSOT Bootstrap Pattern (Matches LawyersDashboard)
   *
   * Role Types:
   * - 'management' (Liz): All 4 tabs (My Cases, Reader Mgmt, Approval Queue, CM Mgmt)
   * - 'operational' (Contractor CMs): My Cases tab only
   */
  fastify.get('/caseManagersDashboard', async (req, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');

    const { caseManagerPin, showModal, step } = req.query;
    const currentStep = parseInt(step) || 1;

    if (!caseManagerPin) {
      return reply.code(400).send({ error: 'Case Manager PIN required' });
    }

    try {
      console.log(`🔍 Case Managers Dashboard route called with PIN: ${caseManagerPin}, Modal: ${showModal || 'none'}`);

      // ==============================================
      // SINGLE SOURCE OF TRUTH - SSOT Bootstrap only
      // ==============================================
      // Step 1: Get stored JWT from SSOT
      const tokenResponse = await fetch(`${SSOT_BASE_URL}/auth/caseManagers/getStoredToken?caseManagerPin=${caseManagerPin}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!tokenResponse.ok) {
        console.error(`❌ No valid JWT token found for caseManagerPin: ${caseManagerPin}`);
        return reply.code(401).send({ error: 'Invalid session - please login again' });
      }

      const tokenData = await tokenResponse.json();
      const { accessToken } = tokenData;

      // Step 2: Call SSOT bootstrap endpoint
      const bootstrapResponse = await fetch(`${SSOT_BASE_URL}/caseManagers/workspace/bootstrap`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!bootstrapResponse.ok) {
        console.error(`❌ SSOT bootstrap failed for caseManagerPin: ${caseManagerPin}`);
        return reply.code(401).send({ error: 'Invalid session - please login again' });
      }

      const bootstrapData = await bootstrapResponse.json();

      if (!bootstrapData || !bootstrapData.valid) {
        console.error(`❌ Invalid bootstrap for caseManagerPin: ${caseManagerPin}`);
        return reply.code(401).send({ error: 'Invalid session - please login again' });
      }

      // Extract data from bootstrap response
      const caseManager = {
        caseManagerPin: bootstrapData.user.caseManagerPin,
        caseManagerName: bootstrapData.user.caseManagerName,
        firstName: bootstrapData.user.firstName || '',
        caseManagerEmail: bootstrapData.user.caseManagerEmail,
        phone: bootstrapData.user.phone,
        ndaSigned: bootstrapData.gates.nda.completed,
        userRole: bootstrapData.user.userRole,
        lastLogin: bootstrapData.user.lastLogin
      };

      console.log(`✅ Dashboard loading for ${caseManager.caseManagerName} (${caseManagerPin}) via SSOT Bootstrap`);

      // ===== MODAL DATA LOADING (Server-Side) =====
      let modalData = null;

      if (showModal === 'nda' && caseManagerPin) {
        modalData = {
          type: 'nda',
          caseManager: caseManager,
          currentStep: currentStep
        };
        console.log(`[NDA Modal] Loading step ${currentStep} for ${caseManagerPin}`);
      }

      if (showModal) {
        console.log(`[SSR] Modal requested: ${showModal}, Data loaded: ${modalData ? 'Yes' : 'No'}`);
      }

      // Generate CSRF token
      const csrfToken = fastify.jwt ? fastify.jwt.sign({
        csrf: true,
        caseManagerPin: caseManagerPin,
        timestamp: Date.now()
      }) : 'csrf-placeholder';

      // Pass bootstrap data to EJS template
      return reply.view('casemanagersDashboard', {
        cmName: caseManager.caseManagerName,
        cmFirstName: caseManager.firstName,
        userRole: caseManager.userRole,
        pin: caseManager.caseManagerPin,
        caseManager,
        gates: bootstrapData.gates,
        features: bootstrapData.features,
        stats: bootstrapData.stats,
        showModal: showModal || null,
        modalData: modalData,
        csrfToken: csrfToken,
        currentStep: currentStep
      });

    } catch (error) {
      console.error('❌ ERROR loading case managers dashboard:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      fastify.log.error('Error loading case managers dashboard:', error);
      return reply.code(500).send({ success: false, error: 'Failed to load dashboard', details: error.message });
    }
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
  fastify.post('/api/caseManagers/generateReaderPin', async (req, reply) => {
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
  fastify.post('/api/caseManagers/verifyMedicalRegistration', async (req, reply) => {
    return await CaseManagersController.verifyMedicalRegistration(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 4: READER REGISTRATION(HRCompliance Dashboard responsibility)
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
   *   readerType: 'firstReader' | 'secondReader',
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
  fastify.post('/api/caseManagers/registerReader', async (req, reply) => {
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
  fastify.post('/api/caseManagers/assignCaseAuto', async (req, reply) => {
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
  fastify.get('/api/caseManagers/casesWithPriority', async (req, reply) => {
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
  fastify.get('/api/caseManagers/badgeCounts', async (req, reply) => {
    return await CaseManagersController.getBadgeCounts(req, reply);
  });

  // ==============================================
  // LOCATION BLOCK 7: HEALTH CHECK
  // ==============================================

  /**
   * GET /api/case-managers/health
   * Health check for Case Managers API
   */
  fastify.get('/api/caseManagers/health', async (req, reply) => {
    return {
      service: 'case-managers',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'qolae_readers'
    };
  });

  // ==============================================
  // LOCATION BLOCK 8: INVOICE EMAIL AFTER INA REPORT (TODO)
  // ==============================================
  //
  // Purpose: Send updated invoice to Lawyer after INA report is completed
  // Trigger: When Case Manager marks INA report as complete
  //
  // Flow:
  // 1. INA report completed by Reader(s)
  // 2. Case Manager reviews and approves INA report
  // 3. System generates updated Invoice with final costs
  // 4. Invoice emailed to Lawyer with INA report summary
  //
  // Implementation Notes:
  // - Invoice PDF stored in: /centralRepository/paymentInvoices/Invoice_{clientPin}.pdf
  // - Use sendPaymentInvoiceEmail() from emailController.js
  // - Include: clientPin, lawyerPin, transactionId, serviceType, finalAmount
  //
  // TODO: Implement when INA workflow is complete
  // fastify.post('/api/caseManagers/sendInvoiceAfterIna', async (req, reply) => {
  //   const { clientPin, lawyerPin } = req.body;
  //
  //   // 1. Verify INA report is complete
  //   // 2. Generate updated invoice PDF
  //   // 3. Send invoice email to lawyer
  //   // 4. Log GDPR audit entry
  //
  //   return { success: true, message: 'Invoice sent to lawyer' };
  // });

}

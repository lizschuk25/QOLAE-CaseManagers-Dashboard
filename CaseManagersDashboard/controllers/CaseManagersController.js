// ┌────────────────────────────────────────────┐
// │ QOLAE CaseManagersController.js            │
// │ Author: Liz 👑                             │
// │ Description: Handles Case Managers Dashboard│
// │ Active Exports:                            │
// │ 1️⃣ autoAssignCase                          │
// │ 2️⃣ getCasesWithPriority                    │
// │ 3️⃣ getBadgeCounts                          │
// │ 4️⃣ getWorkspaceFeatures                    │
// └────────────────────────────────────────────┘

import pg from 'pg';
const { Pool } = pg;

// ==============================================
// DATABASE CONNECTIONS
// ==============================================

const caseManagersDb = new Pool({
  connectionString: process.env.CASEMANAGERS_DATABASE_URL
});

// ==============================================
// LOCATION BLOCK A: AUTO-ASSIGNMENT ALGORITHM
// ==============================================
// Assigns cases to CMs based on current workload
// Returns CM with lowest active case count
// ==============================================

async function calculateCMWorkload() {
  try {
    // Get all active case managers
    // TODO: This will need to query a caseManagers table
    // For now, returning mock data structure
    const caseManagers = [
      { cmId: 'cm-1', cmName: 'Emma Thompson', pin: 'CM-002691' },
      { cmId: 'cm-2', cmName: 'David Park', pin: 'CM-002692' },
      { cmId: 'cm-3', cmName: 'Rachel Green', pin: 'CM-002693' }
    ];

    // Count active cases for each CM
    const workloadPromises = caseManagers.map(async (cm) => {
      const result = await caseManagersDb.query(
        `SELECT COUNT(*) as "caseCount"
         FROM cases
         WHERE "assignedCmPin" = $1
         AND "caseStatus" NOT IN ('closed', 'cancelled')`,
        [cm.pin]
      );

      return {
        ...cm,
        activeCount: parseInt(result.rows[0].caseCount) || 0
      };
    });

    const workloads = await Promise.all(workloadPromises);

    // Sort by lowest workload
    workloads.sort((a, b) => a.activeCount - b.activeCount);

    return workloads;
  } catch (error) {
    console.error('❌ Error calculating CM workload:', error);
    throw error;
  }
}

// Helper function to map workflow stage to percentage and label
function getStageInfo(stage) {
  const stageMap = {
    1: { percent: 7, label: 'Stage 1: Case Opened' },
    2: { percent: 14, label: 'Stage 2: Client Contacted' },
    3: { percent: 21, label: 'Stage 3: Consent Sent' },
    4: { percent: 28, label: 'Stage 4: Consent Received' },
    5: { percent: 35, label: 'Stage 5: INA Visit Scheduled' },
    6: { percent: 42, label: 'Stage 6: INA Visit Completed' },
    7: { percent: 50, label: 'Stage 7: R&D Phase' },
    8: { percent: 57, label: 'Stage 8: Report Writing' },
    9: { percent: 64, label: 'Stage 9: Internal Review' },
    10: { percent: 71, label: 'Stage 10: 1st Reader Assigned' },
    11: { percent: 78, label: 'Stage 11: 1st Reader Corrections' },
    12: { percent: 85, label: 'Stage 12: 2nd Reader Assigned' },
    13: { percent: 92, label: 'Stage 13: 2nd Reader Corrections' },
    14: { percent: 100, label: 'Stage 14: Case Closure' }
  };

  return stageMap[stage] || { percent: 0, label: 'Unknown Stage' };
}

// ==============================================
// EXPORTED CONTROLLER FUNCTIONS
// ==============================================

export default {
  // ──────────────────────────────────────────────
  // 1️⃣ AUTO-ASSIGN CASE TO CM
  // ──────────────────────────────────────────────
  // Triggered when Lawyer completes Case Referral form
  // Assigns case to CM with lowest workload
  // ──────────────────────────────────────────────
  autoAssignCase: async (req, reply) => {
    const {
      casePin,
      lawyerPin,
      lawyerName,
      clientName,
      caseType,
      referralData
    } = req.body;

    // Validation
    if (!casePin || !lawyerPin || !clientName || !caseType) {
      return reply.status(400).send({
        success: false,
        error: 'Case PIN, lawyer PIN, client name, and case type are required'
      });
    }

    try {
      console.log(`\n🔄 Auto-assigning case ${casePin}...`);

      // Step 1: Calculate CM workload
      const workloads = await calculateCMWorkload();

      if (!workloads || workloads.length === 0) {
        console.error('❌ No available case managers found');
        return reply.status(500).send({
          success: false,
          error: 'No available case managers'
        });
      }

      // Step 2: Select CM with lowest workload
      const assignedCM = workloads[0];
      console.log(`✅ Selected CM: ${assignedCM.cmName} (Current workload: ${assignedCM.activeCount} cases)`);

      // Step 3: Create case record in cases table
      const caseResult = await caseManagersDb.query(
        `INSERT INTO cases (
          "casePin",
          "lawyerPin",
          "lawyerName",
          "clientName",
          "caseType",
          "assignedCmPin",
          "assignedCmName",
          "assignedAt",
          "caseStatus",
          "workflowStage",
          "referralData",
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, "casePin", "assignedCmName"`,
        [
          casePin,
          lawyerPin,
          lawyerName || 'Unknown',
          clientName,
          caseType,
          assignedCM.pin,
          assignedCM.cmName,
          'pendingContact', // Initial status
          1, // Stage 1: Case Opened
          JSON.stringify(referralData || {})
        ]
      );

      console.log(`✅ Case ${casePin} successfully assigned to ${assignedCM.cmName}`);
      console.log(`   Case ID: ${caseResult.rows[0].id}`);
      console.log(`   Status: pendingContact`);
      console.log(`   Stage: 1 (Case Opened - 7%)`);

      // Step 4: Log activity (GDPR audit trail)
      await caseManagersDb.query(
        `INSERT INTO "caseActivityLog" (
          "casePin",
          "activityType",
          "activityDescription",
          "performedBy",
          "performedAt"
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          casePin,
          'caseAssigned',
          `Case automatically assigned to ${assignedCM.cmName} (lowest workload: ${assignedCM.activeCount} cases)`,
          'system'
        ]
      );

      // Step 5: Return assigned CM details to Lawyers Dashboard
      return reply.send({
        success: true,
        message: `Case successfully assigned to ${assignedCM.cmName}`,
        assignedCM: {
          cmId: assignedCM.cmId,
          cmName: assignedCM.cmName,
          cmPin: assignedCM.pin,
          currentWorkload: assignedCM.activeCount
        },
        caseDetails: {
          caseId: caseResult.rows[0].id,
          casePin: casePin,
          status: 'pendingContact',
          stage: 1,
          stageLabel: 'Case Opened (7%)'
        }
      });

    } catch (error) {
      console.error('❌ Auto-assignment error:', error);

      // Check for duplicate case PIN
      if (error.code === '23505' && error.constraint === 'casesCasePinKey') {
        return reply.status(400).send({
          success: false,
          error: 'This case PIN already exists in the system'
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to assign case. Please try again.'
      });
    }
  },

  // ──────────────────────────────────────────────
  // 5️⃣ GET CASES WITH PRIORITY ALGORITHM
  // ──────────────────────────────────────────────
  // Returns cases with auto-calculated priority indicators
  // Priority based on days stuck in current stage:
  // 🔴 URGENT: >5 days (red)
  // 🟡 ATTENTION: 3-5 days (yellow)
  // 🟢 ON TRACK: <3 days (green)
  // ──────────────────────────────────────────────
  getCasesWithPriority: async (req, reply) => {
    try {
      const { cmPin, filter } = req.query;

      // Base query to get all cases
      let query = `
        SELECT
          "casePin",
          "clientName",
          "assignedCmName",
          "caseStatus",
          "workflowStage",
          "stageUpdatedAt",
          "createdAt",
          "consentReceivedAt",
          "inaVisitDate",
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "stageUpdatedAt")) / 86400 as "daysInStage"
        FROM cases
        WHERE "caseStatus" NOT IN ('closed', 'cancelled')
      `;

      const params = [];

      // Filter by CM if provided
      if (cmPin) {
        params.push(cmPin);
        query += ` AND "assignedCmPin" = $${params.length}`;
      }

      // Apply Action Center filter
      if (filter) {
        switch (filter) {
          case 'urgent':
            query += ` AND (CURRENT_TIMESTAMP - "stageUpdatedAt") > INTERVAL '5 days'`;
            break;
          case 'today':
            query += ` AND "inaVisitDate"::date = CURRENT_DATE`;
            break;
          case 'ready':
            query += ` AND "caseStatus" = 'consentReceived' AND "workflowStage" = 4`;
            break;
          case 'pending':
            query += ` AND "workflowStage" = 9 AND "caseStatus" = 'internalReviewComplete'`;
            break;
        }
      }

      query += ` ORDER BY "stageUpdatedAt" ASC`;

      const result = await caseManagersDb.query(query, params);

      // Calculate priority for each case
      const casesWithPriority = result.rows.map(caseData => {
        const daysInStage = Math.floor(caseData.daysInStage);

        let priority;
        if (daysInStage > 5) {
          priority = {
            level: 'urgent',
            color: '#dc2626', // red
            emoji: '🔴',
            label: 'URGENT',
            days: daysInStage
          };
        } else if (daysInStage >= 3) {
          priority = {
            level: 'attention',
            color: '#ca8a04', // yellow
            emoji: '🟡',
            label: 'ATTENTION',
            days: daysInStage
          };
        } else {
          priority = {
            level: 'on-track',
            color: '#16a34a', // green
            emoji: '🟢',
            label: 'ON TRACK',
            days: daysInStage
          };
        }

        // Map workflow stage to percentage and label
        const stageInfo = getStageInfo(caseData.workflowStage);

        return {
          casePin: caseData.casePin,
          clientName: caseData.clientName,
          assignedCM: caseData.assignedCmName,
          status: caseData.caseStatus,
          workflowStage: caseData.workflowStage,
          stageLabel: stageInfo.label,
          progressPercent: stageInfo.percent,
          priority: priority,
          daysInStage: daysInStage,
          stageUpdatedAt: caseData.stageUpdatedAt,
          createdAt: caseData.createdAt,
          consentReceivedAt: caseData.consentReceivedAt,
          inaVisitDate: caseData.inaVisitDate
        };
      });

      console.log(`✅ Retrieved ${casesWithPriority.length} cases with priority calculations`);

      return reply.send({
        success: true,
        cases: casesWithPriority,
        count: casesWithPriority.length
      });

    } catch (error) {
      console.error('❌ Error fetching cases with priority:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch cases',
        cases: []
      });
    }
  },

  // ──────────────────────────────────────────────
  // 6️⃣ GET BADGE COUNTS (AUTO-REFRESH)
  // ──────────────────────────────────────────────
  // Returns real-time counts for Action Center badges
  // Refreshes every 30 seconds on dashboard
  // ──────────────────────────────────────────────
  getBadgeCounts: async (req, reply) => {
    try {
      // Get current date for 'today' calculations
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));

      // URGENT: Cases stuck in current stage > 5 days
      const urgentResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM cases
         WHERE "caseStatus" NOT IN ('closed', 'cancelled')
         AND (CURRENT_TIMESTAMP - "stageUpdatedAt") > INTERVAL '5 days'`
      );

      // TODAY: INA visits scheduled for today
      const todayResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM "inaVisits"
         WHERE "visitDate"::date = CURRENT_DATE
         AND "visitStatus" = 'scheduled'`
      );

      // READY: Consents received, ready to contact
      const readyResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM cases
         WHERE "caseStatus" = 'consentReceived'
         AND "workflowStage" = 4`
      );

      // PENDING: Cases awaiting reader assignment (stage 9 complete, no reader)
      const pendingResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM cases
         WHERE "workflowStage" = 9
         AND "caseStatus" = 'internalReviewComplete'
         AND (
           (SELECT COUNT(*) FROM "inaReports" WHERE "inaReports"."casePin" = cases."casePin" AND "firstReaderPin" IS NULL) > 0
         )`
      );

      // APPROVAL QUEUE: Payment requests + case closures pending approval
      const approvalResult = await caseManagersDb.query(
        `SELECT
           (SELECT COUNT(*) FROM "inaReports" WHERE "paymentStatus" = 'pendingApproval') +
           (SELECT COUNT(*) FROM cases WHERE "caseStatus" = 'awaitingClosureApproval') as count`
      );

      const counts = {
        urgent: parseInt(urgentResult.rows[0].count) || 0,
        today: parseInt(todayResult.rows[0].count) || 0,
        ready: parseInt(readyResult.rows[0].count) || 0,
        pending: parseInt(pendingResult.rows[0].count) || 0,
        approvalQueue: parseInt(approvalResult.rows[0].count) || 0
      };

      console.log(`📊 Badge counts calculated:`, counts);

      return reply.send({
        success: true,
        counts: counts,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Badge counts error:', error);

      // Return zeros instead of erroring (graceful degradation)
      return reply.send({
        success: true,
        counts: {
          urgent: 0,
          today: 0,
          ready: 0,
          pending: 0,
          approvalQueue: 0
        },
        timestamp: new Date().toISOString(),
        error: 'Failed to calculate accurate counts'
      });
    }
  },

  // ==============================================
  // WORKSPACE FEATURES API - Get Access Control
  // ==============================================
  // Purpose: Return feature access levels based on compliance status
  // Route: GET /api/workspace/features?pin=NS-XX123456
  // Response: Features object with canViewCases, canCreateCases, etc.
  // ==============================================
  getWorkspaceFeatures: async (request, reply) => {
    try {
      const { pin } = request.query;

      // Validate PIN format
      if (!pin || typeof pin !== 'string' || !pin.match(/^NS-/)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid PIN format - must start with NS-'
        });
      }

      console.log(`🔍 Getting workspace features for PIN: ${pin}`);

      // Query caseManagers table for compliance status
      const caseManagerResult = await caseManagersDb.query(
        'SELECT "complianceApproved", status FROM "caseManagers" WHERE pin = $1',
        [pin]
      );

      // If case manager not found
      if (caseManagerResult.rows.length === 0) {
        console.warn(`⚠️ Case manager not found for PIN: ${pin}`);
        return reply.code(404).send({
          success: false,
          error: 'Case manager not found'
        });
      }

      const caseManager = caseManagerResult.rows[0];
      const isApproved = caseManager.complianceApproved === true;

      // Define features based on access level
      const features = {
        canViewCases: true,              // Always allowed
        canCreateCases: isApproved,      // Only after approval
        canEditCases: isApproved,        // Only after approval
        canViewReports: isApproved,      // Only after approval
        canGenerateReports: isApproved,  // Only after approval
        canAssignReaders: isApproved,    // Only after approval
        canViewFinances: isApproved,     // Only after approval
        canAccessSettings: isApproved    // Only after approval
      };

      console.log(`✅ Features returned for PIN ${pin} (approval: ${isApproved})`);

      return reply.send({
        success: true,
        features: features,
        accessLevel: isApproved ? 'full' : 'limited',
        complianceApproved: isApproved,
        status: caseManager.status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Workspace features error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve workspace features',
        details: error.message
      });
    }
  }
};

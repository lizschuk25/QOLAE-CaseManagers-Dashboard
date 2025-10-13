// ┌────────────────────────────────────────────┐
// │ QOLAE CaseManagersController.js            │
// │ Author: Liz 👑                             │
// │ Description: Handles Readers Registration  │
// │ Steps:                                     │
// │ 1️⃣ Generate Reader PIN (RDR-prefix)        │
// │ 2️⃣ Verify NMC/GMC Registration             │
// │ 3️⃣ Register Reader                          │
// │ 4️⃣ Send Email Invitation                   │
// └────────────────────────────────────────────┘

import { Pool } from 'pg';
import { generateCustomizedNDA } from '../utils/generateCustomizedReadersNDA.js';
import { sendReaderInvitationEmail } from '../utils/sendReaderInvitation.js';

// ==============================================
// DATABASE CONNECTIONS
// ==============================================
const readersDb = new Pool({
  connectionString: process.env.READERS_DATABASE_URL
});

const caseManagersDb = new Pool({
  connectionString: process.env.CASEMANAGERS_DATABASE_URL
});

// ==============================================
// LOCATION BLOCK A: READER PIN GENERATOR
// ==============================================
// Generates unique PIN with RDR prefix
// Pattern: RDR-{INITIALS}{6-DIGIT-HASH}
// Example: "John Smith" → "RDR-JS123456"
// ==============================================

function generateReaderPin(readerName) {
  // Extract initials from Reader name
  let initials = '';
  if (readerName && readerName.trim()) {
    initials = readerName
      .trim()
      .split(' ')
      .filter(word => word.match(/[a-zA-Z]/))
      .map(word => {
        // Get first letter of each word
        for (let i = 0; i < word.length; i++) {
          if (word[i].match(/[a-zA-Z]/)) {
            return word[i].toUpperCase();
          }
        }
        return '';
      })
      .join('')
      .substring(0, 2) // Take first 2 initials
      .padEnd(2, 'X'); // Pad with X if less than 2
  } else {
    initials = 'XX'; // Default if no name
  }

  // Create 6-digit numeric hash from full name
  const hash = (readerName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const numericPin = Math.abs(hash % 1000000).toString().padStart(6, '0');

  return `RDR-${initials}${numericPin}`;
}

// ==============================================
// LOCATION BLOCK B: NMC/GMC VERIFICATION
// ==============================================
// Verifies medical professional registration
// Currently mock - will integrate with real NMC/GMC APIs
// ==============================================

async function verifyMedicalRegistration(registrationBody, registrationNumber) {
  console.log(`🔍 Verifying ${registrationBody} registration: ${registrationNumber}`);

  // TODO: Integrate with real NMC/GMC APIs
  // NMC API: https://www.nmc.org.uk/registration/search-the-register/
  // GMC API: https://www.gmc-uk.org/registration-and-licensing/the-medical-register

  // MOCK VERIFICATION (for development)
  // In production, this should call the actual NMC/GMC APIs
  if (registrationBody === 'NMC') {
    // Mock NMC verification
    // Real implementation would call NMC API
    return {
      verified: true,
      name: 'Registered Nurse', // Would come from NMC API
      registrationBody: 'NMC',
      registrationNumber: registrationNumber,
      status: 'Active'
    };
  } else if (registrationBody === 'GMC') {
    // Mock GMC verification
    // Real implementation would call GMC API
    return {
      verified: true,
      name: 'Registered Doctor', // Would come from GMC API
      registrationBody: 'GMC',
      registrationNumber: registrationNumber,
      status: 'Active'
    };
  } else {
    // Other registration bodies - manual verification required
    return {
      verified: true, // Manual approval by Liz
      name: 'Professional',
      registrationBody: registrationBody,
      registrationNumber: registrationNumber,
      status: 'Pending Manual Verification'
    };
  }
}

// ==============================================
// LOCATION BLOCK C: AUTO-ASSIGNMENT ALGORITHM
// ==============================================
// Assigns cases to CMs based on current workload
// Returns CM with lowest active case count
// ==============================================

async function calculateCMWorkload() {
  try {
    // Get all active case managers
    // TODO: This will need to query a case_managers table
    // For now, returning mock data structure
    const caseManagers = [
      { cm_id: 'cm-1', cm_name: 'Emma Thompson', pin: 'CM-002691' },
      { cm_id: 'cm-2', cm_name: 'David Park', pin: 'CM-002692' },
      { cm_id: 'cm-3', cm_name: 'Rachel Green', pin: 'CM-002693' }
    ];

    // Count active cases for each CM
    const workloadPromises = caseManagers.map(async (cm) => {
      const result = await caseManagersDb.query(
        `SELECT COUNT(*) as case_count
         FROM cases
         WHERE assigned_cm_pin = $1
         AND case_status NOT IN ('closed', 'cancelled')`,
        [cm.pin]
      );

      return {
        ...cm,
        activeCount: parseInt(result.rows[0].case_count) || 0
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

// Helper function to detect AJAX requests
function isAjaxRequest(req) {
  return req.headers['content-type'] === 'application/json' ||
         req.headers['accept'] === 'application/json' ||
         req.headers['x-requested-with'] === 'XMLHttpRequest';
}

// ==============================================
// EXPORTED CONTROLLER FUNCTIONS
// ==============================================

export default {
  // ──────────────────────────────────────────────
  // 1️⃣ GENERATE READER PIN
  // ──────────────────────────────────────────────
  generateReaderPIN: async (req, reply) => {
    const { readerName } = req.body;

    if (!readerName || !readerName.trim()) {
      const errorMessage = 'Reader name is required to generate PIN.';

      if (isAjaxRequest(req)) {
        return reply.status(400).send({
          success: false,
          error: errorMessage
        });
      }

      return reply.view('readers-registration-card', {
        error: errorMessage,
        readerName: '',
        pin: ''
      });
    }

    const pin = generateReaderPin(readerName);

    console.log(`✅ Generated Reader PIN: ${pin} for ${readerName}`);

    if (isAjaxRequest(req)) {
      return reply.send({
        success: true,
        pin: pin,
        message: 'Reader PIN generated successfully!'
      });
    }

    return reply.view('readers-registration-card', {
      readerName,
      pin
    });
  },

  // ──────────────────────────────────────────────
  // 2️⃣ VERIFY MEDICAL REGISTRATION (NMC/GMC)
  // ──────────────────────────────────────────────
  verifyMedicalRegistration: async (req, reply) => {
    const { registrationBody, registrationNumber } = req.body;

    if (!registrationBody || !registrationNumber) {
      return reply.status(400).send({
        success: false,
        verified: false,
        error: 'Registration body and number are required'
      });
    }

    try {
      const verificationResult = await verifyMedicalRegistration(
        registrationBody,
        registrationNumber
      );

      if (verificationResult.verified) {
        console.log(`✅ Verified ${registrationBody} registration: ${registrationNumber}`);

        return reply.send({
          success: true,
          verified: true,
          name: verificationResult.name,
          registrationBody: verificationResult.registrationBody,
          registrationNumber: verificationResult.registrationNumber,
          status: verificationResult.status
        });
      } else {
        console.log(`❌ Verification failed for ${registrationBody}: ${registrationNumber}`);

        return reply.send({
          success: false,
          verified: false,
          error: 'Registration number not found or invalid'
        });
      }

    } catch (error) {
      console.error('❌ Medical registration verification error:', error);
      return reply.status(500).send({
        success: false,
        verified: false,
        error: 'Verification service error'
      });
    }
  },

  // ──────────────────────────────────────────────
  // 3️⃣ REGISTER READER
  // ──────────────────────────────────────────────
  registerReader: async (req, reply) => {
    const {
      readerPin,
      readerName,
      email,
      phone,
      readerType,
      specialization,
      registrationBody,
      registrationNumber,
      registrationVerified,
      sendEmail
    } = req.body;

    // Validation
    if (!readerPin || !readerName || !email || !readerType) {
      const errorMessage = 'Reader PIN, name, email, and type are required.';

      if (isAjaxRequest(req)) {
        return reply.status(400).send({
          success: false,
          error: errorMessage
        });
      }

      return reply.view('readers-registration-card', {
        error: errorMessage
      });
    }

    // Additional validation for medical readers
    if (readerType === 'second_reader') {
      if (!specialization || !registrationBody || !registrationNumber) {
        return reply.status(400).send({
          success: false,
          error: 'Medical readers require specialization and registration details'
        });
      }

      if (!registrationVerified) {
        return reply.status(400).send({
          success: false,
          error: 'Please verify the medical registration before registering'
        });
      }
    }

    try {
      // Determine payment rate
      const paymentRate = readerType === 'first_reader' ? 50.00 : 75.00;

      // Insert reader into qolae_readers database
      const result = await readersDb.query(
        `INSERT INTO readers (
          reader_pin,
          reader_name,
          email,
          phone,
          reader_type,
          specialization,
          registration_body,
          registration_number,
          registration_verified,
          registration_verified_at,
          registration_verified_by,
          payment_rate,
          created_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, reader_pin`,
        [
          readerPin,
          readerName,
          email,
          phone || null,
          readerType,
          specialization || null,
          registrationBody || null,
          registrationNumber || null,
          registrationVerified || false,
          registrationVerified ? new Date() : null,
          registrationVerified ? 'Liz' : null,
          paymentRate,
          'Liz'
        ]
      );

      console.log(`✅ Reader registered successfully: ${readerName} (PIN: ${readerPin})`);

      // 📧 Generate NDA & Send email invitation if requested
      if (sendEmail) {
        try {
          console.log(`\n🔄 Starting post-registration workflow for ${readerName}...`);

          // Step 1: Generate customized NDA
          console.log(`📄 Step 1: Generating customized NDA for PIN: ${readerPin}...`);
          const ndaResult = await generateCustomizedNDA(readerPin);

          if (ndaResult.success) {
            console.log(`✅ NDA generated successfully: ${ndaResult.outputPath}`);
          } else {
            console.warn(`⚠️ NDA generation failed: ${ndaResult.error}`);
            // Continue anyway - email will be sent without NDA attachment
          }

          // Step 2: Send invitation email with NDA attachment
          console.log(`📧 Step 2: Sending invitation email to ${email}...`);
          const emailResult = await sendReaderInvitationEmail(
            readerPin,
            readerName,
            email,
            readerType,
            paymentRate
          );

          if (emailResult.success) {
            console.log(`✅ Invitation email sent successfully!`);
            console.log(`   Message ID: ${emailResult.messageId}`);
            console.log(`   Attachments: ${emailResult.attachments.join(', ')}`);
          } else {
            console.warn(`⚠️ Email sending failed: ${emailResult.error}`);
          }

        } catch (workflowError) {
          console.error('⚠️ Post-registration workflow error:', workflowError);
          // Don't fail the registration if NDA/email fails
          // Reader is already in database - Liz can manually send email later
        }
      }

      if (isAjaxRequest(req)) {
        return reply.send({
          success: true,
          message: `${readerName} has been successfully registered!`,
          readerPin: readerPin,
          emailSent: sendEmail
        });
      }

      return reply.view('readers-registration-card', {
        success: true,
        message: `${readerName} has been successfully registered!`
      });

    } catch (error) {
      console.error('❌ Database error registering reader:', error);

      // Check for duplicate email
      if (error.code === '23505' && error.constraint === 'readers_email_key') {
        const errorMessage = 'A reader with this email address already exists.';

        if (isAjaxRequest(req)) {
          return reply.status(400).send({
            success: false,
            error: errorMessage
          });
        }

        return reply.view('readers-registration-card', {
          error: errorMessage
        });
      }

      // Check for duplicate PIN
      if (error.code === '23505' && error.constraint === 'readers_reader_pin_key') {
        const errorMessage = 'This PIN already exists. Please generate a new one.';

        if (isAjaxRequest(req)) {
          return reply.status(400).send({
            success: false,
            error: errorMessage
          });
        }

        return reply.view('readers-registration-card', {
          error: errorMessage
        });
      }

      const errorMessage = 'Failed to register reader. Please try again.';

      if (isAjaxRequest(req)) {
        return reply.status(500).send({
          success: false,
          error: errorMessage
        });
      }

      return reply.view('readers-registration-card', {
        error: errorMessage
      });
    }
  },

  // ──────────────────────────────────────────────
  // 4️⃣ AUTO-ASSIGN CASE TO CM
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
      console.log(`✅ Selected CM: ${assignedCM.cm_name} (Current workload: ${assignedCM.activeCount} cases)`);

      // Step 3: Create case record in cases table
      const caseResult = await caseManagersDb.query(
        `INSERT INTO cases (
          case_pin,
          lawyer_pin,
          lawyer_name,
          client_name,
          case_type,
          assigned_cm_pin,
          assigned_cm_name,
          assigned_at,
          case_status,
          workflow_stage,
          referral_data,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, case_pin, assigned_cm_name`,
        [
          casePin,
          lawyerPin,
          lawyerName || 'Unknown',
          clientName,
          caseType,
          assignedCM.pin,
          assignedCM.cm_name,
          'pending_contact', // Initial status
          1, // Stage 1: Case Opened
          JSON.stringify(referralData || {})
        ]
      );

      console.log(`✅ Case ${casePin} successfully assigned to ${assignedCM.cm_name}`);
      console.log(`   Case ID: ${caseResult.rows[0].id}`);
      console.log(`   Status: pending_contact`);
      console.log(`   Stage: 1 (Case Opened - 7%)`);

      // Step 4: Log activity (GDPR audit trail)
      await caseManagersDb.query(
        `INSERT INTO case_activity_log (
          case_pin,
          activity_type,
          activity_description,
          performed_by,
          performed_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          casePin,
          'case_assigned',
          `Case automatically assigned to ${assignedCM.cm_name} (lowest workload: ${assignedCM.activeCount} cases)`,
          'system'
        ]
      );

      // Step 5: Return assigned CM details to Lawyers Dashboard
      return reply.send({
        success: true,
        message: `Case successfully assigned to ${assignedCM.cm_name}`,
        assignedCM: {
          cmId: assignedCM.cm_id,
          cmName: assignedCM.cm_name,
          cmPin: assignedCM.pin,
          currentWorkload: assignedCM.activeCount
        },
        caseDetails: {
          caseId: caseResult.rows[0].id,
          casePin: casePin,
          status: 'pending_contact',
          stage: 1,
          stageLabel: 'Case Opened (7%)'
        }
      });

    } catch (error) {
      console.error('❌ Auto-assignment error:', error);

      // Check for duplicate case PIN
      if (error.code === '23505' && error.constraint === 'cases_case_pin_key') {
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
          case_pin,
          client_name,
          assigned_cm_name,
          case_status,
          workflow_stage,
          stage_updated_at,
          created_at,
          consent_received_at,
          ina_visit_date,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - stage_updated_at)) / 86400 as days_in_stage
        FROM cases
        WHERE case_status NOT IN ('closed', 'cancelled')
      `;

      const params = [];

      // Filter by CM if provided
      if (cmPin) {
        params.push(cmPin);
        query += ` AND assigned_cm_pin = $${params.length}`;
      }

      // Apply Action Center filter
      if (filter) {
        switch (filter) {
          case 'urgent':
            query += ` AND (CURRENT_TIMESTAMP - stage_updated_at) > INTERVAL '5 days'`;
            break;
          case 'today':
            query += ` AND ina_visit_date::date = CURRENT_DATE`;
            break;
          case 'ready':
            query += ` AND case_status = 'consent_received' AND workflow_stage = 4`;
            break;
          case 'pending':
            query += ` AND workflow_stage = 9 AND case_status = 'internal_review_complete'`;
            break;
        }
      }

      query += ` ORDER BY stage_updated_at ASC`;

      const result = await caseManagersDb.query(query, params);

      // Calculate priority for each case
      const casesWithPriority = result.rows.map(caseData => {
        const daysInStage = Math.floor(caseData.days_in_stage);

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
        const stageInfo = getStageInfo(caseData.workflow_stage);

        return {
          casePin: caseData.case_pin,
          clientName: caseData.client_name,
          assignedCM: caseData.assigned_cm_name,
          status: caseData.case_status,
          workflowStage: caseData.workflow_stage,
          stageLabel: stageInfo.label,
          progressPercent: stageInfo.percent,
          priority: priority,
          daysInStage: daysInStage,
          stageUpdatedAt: caseData.stage_updated_at,
          createdAt: caseData.created_at,
          consentReceivedAt: caseData.consent_received_at,
          inaVisitDate: caseData.ina_visit_date
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
         WHERE case_status NOT IN ('closed', 'cancelled')
         AND (CURRENT_TIMESTAMP - stage_updated_at) > INTERVAL '5 days'`
      );

      // TODAY: INA visits scheduled for today
      const todayResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM ina_visits
         WHERE visit_date::date = CURRENT_DATE
         AND visit_status = 'scheduled'`
      );

      // READY: Consents received, ready to contact
      const readyResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM cases
         WHERE case_status = 'consent_received'
         AND workflow_stage = 4`
      );

      // PENDING: Cases awaiting reader assignment (stage 9 complete, no reader)
      const pendingResult = await caseManagersDb.query(
        `SELECT COUNT(*) as count
         FROM cases
         WHERE workflow_stage = 9
         AND case_status = 'internal_review_complete'
         AND (
           (SELECT COUNT(*) FROM ina_reports WHERE ina_reports.case_pin = cases.case_pin AND first_reader_pin IS NULL) > 0
         )`
      );

      // APPROVAL QUEUE: Payment requests + case closures pending approval
      const approvalResult = await caseManagersDb.query(
        `SELECT
           (SELECT COUNT(*) FROM ina_reports WHERE payment_status = 'pending_approval') +
           (SELECT COUNT(*) FROM cases WHERE case_status = 'awaiting_closure_approval') as count`
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
  }
};

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

// ==============================================
// DATABASE CONNECTION - qolae_readers
// ==============================================
const readersDb = new Pool({
  connectionString: process.env.READERS_DATABASE_URL || 'postgresql://readers_user:readers_password@localhost:5432/qolae_readers'
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

      // 📧 Send email invitation if requested
      if (sendEmail) {
        try {
          // TODO: Integrate with existing email infrastructure
          // For now, log the email that would be sent
          console.log(`📧 Email invitation would be sent to: ${email}`);
          console.log(`   Reader PIN: ${readerPin}`);
          console.log(`   Portal URL: https://readers.qolae.com/login?pin=${readerPin}`);

          // In production, call the email API:
          // await sendReaderInvitationEmail(readerPin, readerName, email);
        } catch (emailError) {
          console.error('⚠️ Email sending failed, but reader was registered:', emailError);
          // Don't fail the registration if email fails
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
  }
};

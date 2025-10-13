// ==============================================
// READER INVITATION EMAIL UTILITY
// ==============================================
// Purpose: Send invitation email to readers with NDA attachment
// Author: Liz & Claude
// Date: October 12, 2025
// Pattern: Following IntroductoryEmail.js pattern
// ==============================================

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================
// HELPER: Get Central Repository Path
// ==============================================
const getCentralRepoPath = (relativePath) => {
  return path.join('/var/www/api.qolae.com/central-repository', relativePath);
};

// ==============================================
// HELPER: Extract First Name
// ==============================================
const getFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

// ==============================================
// HELPER: Generate Reader Invitation Email HTML
// ==============================================
const generateReaderInvitationEmail = (reader) => {
  const logoUrl = 'https://api.qolae.com/central-repository/images/qolaeNewLogo.svg';
  const readerLoginUrl = `https://readers.qolae.com/login?pin=${reader.pin}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          line-height: 1.6;
          background-color: #f9fafb;
        }
        .container {
          background-color: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo img {
          max-width: 500px;
          height: auto;
        }
        .greeting {
          font-size: 16px;
          color: #374151;
          margin-bottom: 20px;
        }
        .pin-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 30px 0;
        }
        .pin-box h2 {
          margin: 0 0 10px 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .pin-box .pin {
          font-size: 28px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 3px;
        }
        .cta-button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .cta-button:hover {
          background: #059669;
        }
        .steps {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin: 25px 0;
        }
        .steps h3 {
          color: #693382;
          margin-top: 0;
        }
        .steps ol {
          margin: 15px 0;
          padding-left: 25px;
        }
        .steps li {
          margin-bottom: 10px;
          color: #374151;
        }
        .signature {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          color: #6b7280;
        }
        .signature p {
          margin: 5px 0;
        }
        .important-note {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .important-note strong {
          color: #92400e;
        }
        a {
          color: #667eea;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <img src="${logoUrl}" alt="QOLAE Logo">
        </div>

        <p class="greeting">Dear ${getFirstName(reader.name)},</p>

        <p>Thank you for agreeing to join QOLAE as a ${reader.type === 'first_reader' ? '<strong>First Reader</strong>' : '<strong>Second Reader (Medical Professional)</strong>'}.</p>

        <p>We are delighted to have you on board to review our confidential Initial Needs Assessment (INA) reports. Your expertise will help ensure accuracy, clarity, and professionalism in our client deliverables.</p>

        <div class="pin-box">
          <h2>Your Unique Reader PIN</h2>
          <div class="pin">${reader.pin}</div>
        </div>

        <div style="text-align: center;">
          <a href="${readerLoginUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
            🔐 Access Your Readers Workspace
          </a>
        </div>

        <div class="steps">
          <h3>📋 Getting Started - Your Next Steps:</h3>
          <ol>
            <li><strong>Click the button above</strong> or use this link: <a href="${readerLoginUrl}" target="_blank">${readerLoginUrl}</a></li>
            <li><strong>Complete 2FA Authentication</strong> - Secure your account with email verification and password creation</li>
            <li><strong>Submit HR Compliance Documents</strong> - Upload your CV and provide 2 professional references (one-time only)</li>
            <li><strong>Review and Sign the NDA</strong> - A customized Non-Disclosure Agreement is attached to this email and will be available in your workspace</li>
            <li><strong>Await Report Assignments</strong> - Once approved, you'll receive report assignments with 24-48 hour deadlines</li>
          </ol>
        </div>

        <div class="important-note">
          <p><strong>⚠️ Important Information:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Your PIN: <strong>${reader.pin}</strong> is your unique identifier</li>
            <li>Payment Rate: <strong>£${reader.paymentRate} per report</strong></li>
            <li>Reports are confidential and must NOT be downloaded - all work is done in your secure workspace</li>
            <li>You'll have <strong>24-48 hours</strong> to review and submit corrections</li>
          </ul>
        </div>

        <p><strong>What's Attached:</strong></p>
        <ul>
          <li>📄 <strong>Customized NDA</strong> - Pre-populated with your details, ready for digital signature</li>
        </ul>

        <p>The entire onboarding process takes approximately <strong>15-20 minutes</strong>. Once your compliance documents are reviewed and approved by our team, you'll be notified and can begin receiving report assignments.</p>

        <p>If you have any questions during this process, please don't hesitate to reach out to me directly.</p>

        <p>We are thrilled to have you join the QOLAE Readers team and look forward to a successful professional collaboration.</p>

        <br>
        <p>Kindest regards and Best wishes,</p>
        <br>
        <p><strong>Liz</strong></p>

        <div class="signature">
          <p>
            <strong>Liz Chukwu.RN</strong><br>
            Clinical Director & Case Manager<br>
            |Case Management & Rehabilitation|Clinical Negligence|Mediation|<br>
            E: <a href="mailto:Liz.Chukwu@qolae.com">Liz.Chukwu@qolae.com</a><br>
            T: 07960 247 764<br>
            QOLAE™
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==============================================
// MAIN FUNCTION: Send Reader Invitation Email
// ==============================================
export async function sendReaderInvitationEmail(readerPin, readerName, readerEmail, readerType, paymentRate) {
  try {
    console.log(`\n📧 === SENDING READER INVITATION EMAIL ===`);
    console.log(`Recipient: ${readerName} (${readerEmail})`);
    console.log(`PIN: ${readerPin}`);
    console.log(`Type: ${readerType}`);

    // 1. Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true,
    });

    // 2. Verify SMTP connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (smtpVerifyError) {
      console.error('❌ SMTP Verification Error:', smtpVerifyError);
      throw new Error('Failed to connect to email server');
    }

    // 3. Prepare reader data for email template
    const readerData = {
      name: readerName,
      pin: readerPin,
      type: readerType,
      paymentRate: paymentRate || (readerType === 'first_reader' ? 50 : 75)
    };

    // 4. Generate email HTML
    const emailHtml = generateReaderInvitationEmail(readerData);

    // 5. Build email message
    const message = {
      from: process.env.EMAIL_FROM || 'Liz Chukwu <Liz.Chukwu@qolae.com>',
      to: readerEmail,
      subject: 'Welcome to QOLAE Readers Team - Your Invitation & Next Steps',
      html: emailHtml,
      attachments: [],
    };

    // 6. Attach customized NDA
    const ndaPath = getCentralRepoPath(`final-nda/NDA_${readerPin}.pdf`);

    if (fs.existsSync(ndaPath)) {
      message.attachments.push({
        filename: `NDA_${readerPin}.pdf`,
        path: ndaPath
      });
      console.log(`✅ NDA attached from: ${ndaPath}`);
    } else {
      console.warn(`⚠️ NDA not found at: ${ndaPath}`);
      // Don't fail the email send if NDA is missing
      // Liz can manually send it later
    }

    // 7. Send email
    console.log('📤 Sending reader invitation email...');
    console.log('📎 Attachments:', message.attachments.map(a => a.filename));

    const info = await transporter.sendMail(message);

    console.log('✅ Reader invitation email sent successfully!');
    console.log('📧 Message ID:', info.messageId || 'not available');

    return {
      success: true,
      messageId: info.messageId || 'not available',
      recipient: readerEmail,
      attachments: message.attachments.map(a => a.filename),
    };

  } catch (error) {
    console.error('❌ READER INVITATION EMAIL ERROR:', error);
    throw error;
  }
}

// Export for use in controller
export default sendReaderInvitationEmail;

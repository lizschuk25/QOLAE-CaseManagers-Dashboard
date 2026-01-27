// ==============================================
// NDA CONTROLLER - CASE MANAGERS DASHBOARD
// ==============================================
// Purpose: Handle NDA workflow (4-step process)
// Pattern: Follows ReadersDashboard NdaController.js
// Author: Claude (following Liz's specification)
// Date: 27th January 2026
// ==============================================

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import crypto from 'crypto';
import { insertSignaturesIntoNDA, flattenNDA } from '../utils/insertSignaturesIntoCaseManagersNDA.js';

const { Pool } = pg;

// Database connection
const caseManagersDb = new Pool({
  connectionString: process.env.CASEMANAGERS_DATABASE_URL
});

// ==============================================
// PREVIEW CACHE (10-minute TTL)
// ==============================================
const previewCache = new Map();
const PREVIEW_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of previewCache.entries()) {
    if (now - value.timestamp > PREVIEW_CACHE_TTL) {
      previewCache.delete(key);
      console.log(`[NDA Cache] Cleaned up expired preview for ${key}`);
    }
  }
}, 60000);

// ==============================================
// DIRECTORY PATHS
// ==============================================
function getDirectoryPaths() {
  const apiCentralRepo = '/var/www/api.qolae.com/centralRepository';

  return {
    finalNdaDir: path.join(apiCentralRepo, 'public', 'finalNda'),
    signedNdaDir: path.join(apiCentralRepo, 'protected', 'signed-nda'),
    signaturesDir: path.join(apiCentralRepo, 'protected', 'signatures')
  };
}

// ==============================================
// CONTROLLER METHODS
// ==============================================

const NdaController = {
  // ==============================================
  // STEP 1 → STEP 2: Continue to Sign
  // ==============================================
  continueToSign: async (request, reply) => {
    try {
      const { caseManagerPin } = request.body;

      if (!caseManagerPin) {
        return reply.code(400).send({ error: 'Case Manager PIN required' });
      }

      console.log(`[NDA] Step 1 → Step 2: Case Manager ${caseManagerPin} continuing to sign`);

      return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=2`);

    } catch (error) {
      console.error('[NDA] continueToSign error:', error.message);
      return reply.code(500).send({ error: 'Failed to proceed to sign step' });
    }
  },

  // ==============================================
  // STEP 2 → STEP 3: Generate Preview
  // ==============================================
  generatePreview: async (request, reply) => {
    try {
      const { caseManagerPin, signatureData, acknowledgmentConfirmed } = request.body;
      const signatureFile = request.body.signatureUpload;

      if (!caseManagerPin) {
        return reply.code(400).send({ error: 'Case Manager PIN required' });
      }

      // Validate acknowledgment
      if (!acknowledgmentConfirmed) {
        console.log(`[NDA] Preview rejected - acknowledgment not confirmed for ${caseManagerPin}`);
        return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=2&error=acknowledgment`);
      }

      // Validate signature
      let finalSignatureData = signatureData;

      if (signatureFile && signatureFile.data) {
        finalSignatureData = `data:${signatureFile.mimetype};base64,${signatureFile.data.toString('base64')}`;
      }

      if (!finalSignatureData || finalSignatureData === 'data:image/png;base64,') {
        console.log(`[NDA] Preview rejected - no signature provided for ${caseManagerPin}`);
        return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=2&error=signature`);
      }

      console.log(`[NDA] Step 2 → Step 3: Generating preview for ${caseManagerPin}`);

      // Get case manager data
      const cmResult = await caseManagersDb.query(
        'SELECT "caseManagerPin", "caseManagerName" FROM "caseManagers" WHERE "caseManagerPin" = $1',
        [caseManagerPin]
      );

      if (cmResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Case Manager not found' });
      }

      const caseManager = cmResult.rows[0];

      // Insert signatures into NDA PDF
      const signatureResult = await insertSignaturesIntoNDA(caseManagerPin, {
        caseManagerSignature: finalSignatureData,
        lizSignature: true
      });

      if (!signatureResult.success) {
        console.error(`[NDA] Signature insertion failed: ${signatureResult.error}`);
        return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=2&error=pdf`);
      }

      // Cache preview data
      previewCache.set(caseManagerPin, {
        pdfPath: signatureResult.outputPath,
        signatureData: finalSignatureData,
        timestamp: Date.now(),
        caseManager: caseManager
      });

      console.log(`[NDA] Preview cached for ${caseManagerPin}, redirecting to step 3`);

      return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=3`);

    } catch (error) {
      console.error('[NDA] generatePreview error:', error.message);
      const caseManagerPin = request.body?.caseManagerPin || '';
      return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=2&error=server`);
    }
  },

  // ==============================================
  // SERVE PREVIEW PDF (for iframe)
  // ==============================================
  servePreviewPdf: async (request, reply) => {
    try {
      const { caseManagerPin } = request.query;

      if (!caseManagerPin) {
        return reply.code(400).send({ error: 'Case Manager PIN required' });
      }

      const cached = previewCache.get(caseManagerPin);

      if (!cached || !cached.pdfPath) {
        console.log(`[NDA] Preview not found in cache for ${caseManagerPin}`);
        return reply.code(404).send({ error: 'Preview not found. Please restart the signing process.' });
      }

      if (!fs.existsSync(cached.pdfPath)) {
        console.error(`[NDA] Preview PDF file not found: ${cached.pdfPath}`);
        return reply.code(404).send({ error: 'Preview PDF not found' });
      }

      const pdfBuffer = fs.readFileSync(cached.pdfPath);

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="NDA_Preview_${caseManagerPin}.pdf"`);

      return reply.send(pdfBuffer);

    } catch (error) {
      console.error('[NDA] servePreviewPdf error:', error.message);
      return reply.code(500).send({ error: 'Failed to serve preview' });
    }
  },

  // ==============================================
  // STEP 3 → STEP 4: Final Sign
  // ==============================================
  signNda: async (request, reply) => {
    try {
      const { caseManagerPin, confirmFromPreview } = request.body;

      if (!caseManagerPin) {
        return reply.code(400).send({ error: 'Case Manager PIN required' });
      }

      if (!confirmFromPreview) {
        return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=3&error=confirm`);
      }

      console.log(`[NDA] Step 3 → Step 4: Finalizing NDA for ${caseManagerPin}`);

      const cached = previewCache.get(caseManagerPin);

      if (!cached) {
        console.log(`[NDA] No cached preview for ${caseManagerPin}, redirecting to step 2`);
        return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=2&error=expired`);
      }

      // Flatten the NDA
      const flattenResult = await flattenNDA(caseManagerPin);

      if (!flattenResult.success) {
        console.error(`[NDA] Flattening failed: ${flattenResult.error}`);
        return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=3&error=flatten`);
      }

      // Generate blockchain hash
      const pdfBuffer = fs.readFileSync(flattenResult.outputPath);
      const blockchainHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      const blockchainTimestamp = new Date().toISOString();

      // Update database
      await caseManagersDb.query(
        `UPDATE "caseManagers"
         SET "ndaSigned" = TRUE,
             "ndaSignedAt" = NOW(),
             "ndaPdfPath" = $1,
             "ndaBlockchainHash" = $2,
             "ndaBlockchainTimestamp" = $3
         WHERE "caseManagerPin" = $4`,
        [flattenResult.outputPath, blockchainHash, blockchainTimestamp, caseManagerPin]
      );

      console.log(`[NDA] NDA signed successfully for ${caseManagerPin}`);
      console.log(`[NDA] Blockchain hash: ${blockchainHash.substring(0, 16)}...`);

      // Clear cache
      previewCache.delete(caseManagerPin);

      return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=4`);

    } catch (error) {
      console.error('[NDA] signNda error:', error.message);
      const caseManagerPin = request.body?.caseManagerPin || '';
      return reply.redirect(`/caseManagersDashboard?caseManagerPin=${caseManagerPin}&showModal=nda&step=3&error=server`);
    }
  },

  // ==============================================
  // VIEW SIGNED NDA
  // ==============================================
  viewSignedNda: async (request, reply) => {
    try {
      const { caseManagerPin } = request.query;

      if (!caseManagerPin) {
        return reply.code(400).send({ error: 'Case Manager PIN required' });
      }

      const result = await caseManagersDb.query(
        'SELECT "ndaPdfPath" FROM "caseManagers" WHERE "caseManagerPin" = $1',
        [caseManagerPin]
      );

      if (result.rows.length === 0 || !result.rows[0].ndaPdfPath) {
        return reply.code(404).send({ error: 'Signed NDA not found' });
      }

      const pdfPath = result.rows[0].ndaPdfPath;

      if (!fs.existsSync(pdfPath)) {
        console.error(`[NDA] Signed NDA file not found: ${pdfPath}`);
        return reply.code(404).send({ error: 'Signed NDA file not found' });
      }

      const pdfBuffer = fs.readFileSync(pdfPath);

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="signedCaseManagersNda${caseManagerPin}.pdf"`);

      return reply.send(pdfBuffer);

    } catch (error) {
      console.error('[NDA] viewSignedNda error:', error.message);
      return reply.code(500).send({ error: 'Failed to retrieve signed NDA' });
    }
  },

  // ==============================================
  // DOWNLOAD SIGNED NDA
  // ==============================================
  downloadSignedNda: async (request, reply) => {
    try {
      const { caseManagerPin } = request.query;

      if (!caseManagerPin) {
        return reply.code(400).send({ error: 'Case Manager PIN required' });
      }

      const result = await caseManagersDb.query(
        'SELECT "ndaPdfPath" FROM "caseManagers" WHERE "caseManagerPin" = $1',
        [caseManagerPin]
      );

      if (result.rows.length === 0 || !result.rows[0].ndaPdfPath) {
        return reply.code(404).send({ error: 'Signed NDA not found' });
      }

      const pdfPath = result.rows[0].ndaPdfPath;

      if (!fs.existsSync(pdfPath)) {
        console.error(`[NDA] Signed NDA file not found: ${pdfPath}`);
        return reply.code(404).send({ error: 'Signed NDA file not found' });
      }

      const pdfBuffer = fs.readFileSync(pdfPath);

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="signedCaseManagersNda${caseManagerPin}.pdf"`);

      return reply.send(pdfBuffer);

    } catch (error) {
      console.error('[NDA] downloadSignedNda error:', error.message);
      return reply.code(500).send({ error: 'Failed to download signed NDA' });
    }
  }
};

export default NdaController;

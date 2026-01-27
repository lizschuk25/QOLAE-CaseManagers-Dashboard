// ==============================================
// NDA ROUTES - CASE MANAGERS DASHBOARD
// ==============================================
// Purpose: Handle NDA workflow (4-step process)
// Pattern: Follows ReadersDashboard ndaRoutes.js
// Author: Claude (following Liz's specification)
// Date: 27th January 2026
// ==============================================

import NdaController from '../controllers/NdaController.js';

async function ndaRoutes(fastify, options) {
  // ==============================================
  // STEP 1 → STEP 2: Continue to Sign
  // ==============================================
  fastify.post('/api/nda/continueToSign', NdaController.continueToSign);

  // ==============================================
  // STEP 2 → STEP 3: Generate Preview
  // ==============================================
  fastify.post('/api/nda/preview', NdaController.generatePreview);

  // ==============================================
  // SERVE PREVIEW PDF (for iframe)
  // ==============================================
  fastify.get('/api/nda/previewPdf', NdaController.servePreviewPdf);

  // ==============================================
  // STEP 3 → STEP 4: Final Sign
  // ==============================================
  fastify.post('/api/nda/sign', NdaController.signNda);

  // ==============================================
  // VIEW SIGNED NDA (Step 4 and future access)
  // ==============================================
  fastify.get('/api/nda/view', NdaController.viewSignedNda);

  // ==============================================
  // DOWNLOAD SIGNED NDA
  // ==============================================
  fastify.get('/api/nda/download', NdaController.downloadSignedNda);
}

export default ndaRoutes;

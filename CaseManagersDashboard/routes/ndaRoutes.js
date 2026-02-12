// ==============================================
// NDA ROUTES - CASE MANAGERS DASHBOARD (THIN PROXY)
// ==============================================
// Purpose: Proxy NDA workflow requests to SSOT API (api.qolae.com)
// Pattern: Follows LawyersDashboard Parent Bridge — NO business logic
// Author: Claude (following Liz's NDA SSOT Refactor spec)
// Date: 11th February 2026
//
// SSOT Architecture:
//   Browser → CaseManagersDashboard (form POST/GET) → api.qolae.com (business logic) → JSON/PDF response
//   CaseManagersDashboard reads JSON → redirects to next step or streams PDF back to browser
//
// Authentication: JWT via @fastify/jwt (cookie: qolaeCaseManagerToken)
// caseManagerPin sourced from JWT payload (request.user.caseManagerPin)
//
// NO direct DB queries, NO PDF manipulation, NO blockchain hashing, NO crypto imports
// ==============================================

async function ndaRoutes(fastify, options) {

  const SSOT_BASE_URL = process.env.SSOT_BASE_URL || 'https://api.qolae.com';

  // ==============================================
  // POST /nda/continueToSign
  // Step 1 → Step 2: Validate case manager, transition to signing
  // ==============================================
  fastify.post('/nda/continueToSign', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const caseManagerPin = request.user.caseManagerPin;

    try {
      const apiResponse = await fetch(
        SSOT_BASE_URL + '/api/caseManagers/nda/continueToSign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseManagerPin })
        }
      );

      const apiData = await apiResponse.json();

      if (apiData.success) {
        return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=2');
      }

      fastify.log.error({ event: 'ndaContinueToSignFailed', caseManagerPin, error: apiData.error });
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=1&error=' + encodeURIComponent('Unable to proceed. Please try again.'));

    } catch (error) {
      fastify.log.error({ event: 'ndaContinueToSignError', caseManagerPin, error: error.message });
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=1&error=' + encodeURIComponent('Unable to proceed. Please try again.'));
    }
  });

  // ==============================================
  // POST /nda/preview
  // Step 2 → Step 3: Submit signature, generate preview
  // ==============================================
  fastify.post('/nda/preview', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const caseManagerPin = request.user.caseManagerPin;
    const { signatureData, acknowledgmentConfirmed } = request.body;

    try {
      const apiResponse = await fetch(
        SSOT_BASE_URL + '/api/caseManagers/nda/preview',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseManagerPin,
            signatureData,
            agreedToTerms: acknowledgmentConfirmed
          })
        }
      );

      const apiData = await apiResponse.json();

      if (apiData.success) {
        return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=3');
      }

      fastify.log.error({ event: 'ndaPreviewFailed', caseManagerPin, error: apiData.error });
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=2&error=' + encodeURIComponent(apiData.error || 'Signature processing failed. Please try again.'));

    } catch (error) {
      fastify.log.error({ event: 'ndaPreviewError', caseManagerPin, error: error.message });
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=2&error=' + encodeURIComponent('Signature processing failed. Please try again.'));
    }
  });

  // ==============================================
  // GET /nda/previewPdf
  // Serve cached preview PDF (proxy stream from SSOT)
  // ==============================================
  fastify.get('/nda/previewPdf', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const caseManagerPin = request.user.caseManagerPin;

    try {
      const apiResponse = await fetch(
        SSOT_BASE_URL + '/api/caseManagers/nda/previewPdf/' + caseManagerPin
      );

      if (!apiResponse.ok) {
        return reply.code(404).send({ error: 'Preview not available' });
      }

      const pdfBuffer = Buffer.from(await apiResponse.arrayBuffer());

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="NDA_Preview_' + caseManagerPin + '.pdf"');
      return reply.send(pdfBuffer);

    } catch (error) {
      fastify.log.error({ event: 'ndaPreviewPdfError', caseManagerPin, error: error.message });
      return reply.code(404).send({ error: 'Preview not available' });
    }
  });

  // ==============================================
  // POST /nda/sign
  // Step 3 → Step 4: Flatten PDF, blockchain hash, complete
  // ==============================================
  fastify.post('/nda/sign', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const caseManagerPin = request.user.caseManagerPin;
    const { confirmFromPreview } = request.body;

    if (!confirmFromPreview) {
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=3&error=' + encodeURIComponent('Please confirm before submitting.'));
    }

    try {
      const apiResponse = await fetch(
        SSOT_BASE_URL + '/api/caseManagers/nda/sign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseManagerPin })
        }
      );

      const apiData = await apiResponse.json();

      if (apiData.success) {
        return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=4');
      }

      fastify.log.error({ event: 'ndaSignFailed', caseManagerPin, error: apiData.error });
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=3&error=' + encodeURIComponent('Signing failed. Please try again.'));

    } catch (error) {
      fastify.log.error({ event: 'ndaSignError', caseManagerPin, error: error.message });
      return reply.redirect('/caseManagersDashboard?caseManagerPin=' + caseManagerPin + '&showModal=nda&step=3&error=' + encodeURIComponent('Signing failed. Please try again.'));
    }
  });

  // ==============================================
  // GET /nda/view
  // Serve signed NDA inline (proxy stream from SSOT)
  // ==============================================
  fastify.get('/nda/view', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const caseManagerPin = request.user.caseManagerPin;

    try {
      const apiResponse = await fetch(
        SSOT_BASE_URL + '/api/caseManagers/nda/view/' + caseManagerPin
      );

      if (!apiResponse.ok) {
        return reply.code(404).send({ error: 'Signed NDA not found' });
      }

      const pdfBuffer = Buffer.from(await apiResponse.arrayBuffer());

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'inline; filename="signedCaseManagersNda' + caseManagerPin + '.pdf"');
      return reply.send(pdfBuffer);

    } catch (error) {
      fastify.log.error({ event: 'ndaViewError', caseManagerPin, error: error.message });
      return reply.code(404).send({ error: 'Signed NDA not found' });
    }
  });

  // ==============================================
  // GET /nda/download
  // Download signed NDA (proxy stream from SSOT)
  // ==============================================
  fastify.get('/nda/download', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    const caseManagerPin = request.user.caseManagerPin;

    try {
      const apiResponse = await fetch(
        SSOT_BASE_URL + '/api/caseManagers/nda/download/' + caseManagerPin
      );

      if (!apiResponse.ok) {
        return reply.code(404).send({ error: 'Signed NDA not found' });
      }

      const pdfBuffer = Buffer.from(await apiResponse.arrayBuffer());

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', 'attachment; filename="signedCaseManagersNda' + caseManagerPin + '.pdf"');
      return reply.send(pdfBuffer);

    } catch (error) {
      fastify.log.error({ event: 'ndaDownloadError', caseManagerPin, error: error.message });
      return reply.code(404).send({ error: 'Signed NDA not found' });
    }
  });
}

export default ndaRoutes;

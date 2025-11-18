// ==============================================
// WORKSPACE FEATURES API - Get Access Control
// ==============================================
// Purpose: Return feature access levels based on compliance status
// Route: GET /api/workspace/features?pin=NS-XX123456
// ==============================================

import { Pool } from 'pg';

// Database connection
const caseManagersDb = new Pool({
  connectionString: process.env.CASEMANAGERS_DATABASE_URL
});

export async function getWorkspaceFeatures(request, reply) {
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

    // Query case_managers table for compliance status
    const caseManagerResult = await caseManagersDb.query(
      'SELECT compliance_approved, status FROM case_managers WHERE pin = $1',
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
    const isApproved = caseManager.compliance_approved === true;

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

// ==============================================
// CASE MANAGERS NDA SIGNATURE INSERTION
// ==============================================
// Purpose: Insert case manager + Liz's signatures into signed NDA
// Pattern: Follows insertSignaturesIntoReadersNDA.js (Rinse & Repeat)
// Author: Liz
// Date: 13th January 2026
// ==============================================

import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const caseManagersDb = new Pool({
  connectionString: process.env.CASEMANAGERS_DATABASE_URL
});

// ==============================================
// HELPER: Get Directory Paths
// ==============================================
function getDirectoryPaths() {
  // Use API Dashboard central repository (following Admin pattern)
  const apiCentralRepo = '/var/www/api.qolae.com/centralRepository';

  return {
    finalNdaDir: path.join(apiCentralRepo, 'public', 'finalNda'),
    signedNdaDir: path.join(apiCentralRepo, 'protected', 'signed-nda'),
    signaturesDir: path.join(apiCentralRepo, 'protected', 'signatures')
  };
}

// ==============================================
// INSERT SIGNATURES INTO NDA
// ==============================================
// Purpose: Insert case manager signature + Liz's signature into button placeholders
// Button fields: CaseManagerSignature, LizsSignature
// ==============================================

async function insertSignaturesIntoNDA(caseManagerPin, signatureData) {
  try {
    console.log(`\n=== INSERTING SIGNATURES INTO CASE MANAGERS NDA ===`);
    console.log(`Case Manager PIN: ${caseManagerPin}`);

    // Load PDF from finalNda folder
    const { finalNdaDir, signedNdaDir, signaturesDir } = getDirectoryPaths();
    const pdfPath = path.join(finalNdaDir, `caseManagersNda${caseManagerPin}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`NDA file not found at: ${pdfPath}`);
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    console.log(`✅ PDF loaded: ${pdfDoc.getPageCount()} pages`);

    // Get form to access button fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`✅ Found ${fields.length} form fields`);

    // Track signature insertion results
    const results = {
      caseManagerSignature: false,
      lizsSignature: false,
    };

    // Helper function to insert signature (uses pdf-lib's button field approach)
    const insertSignature = async (buttonName, signatureImageData) => {
      try {
        const buttonField = form.getButton(buttonName);

        // Load signature image
        let imageBytes;
        if (signatureImageData.startsWith('data:image')) {
          // Base64 data URL
          const base64Data = signatureImageData.split(',')[1];
          imageBytes = Buffer.from(base64Data, 'base64');
        } else if (fs.existsSync(signatureImageData)) {
          // File path
          imageBytes = fs.readFileSync(signatureImageData);
        } else {
          throw new Error(`Invalid signature data for ${buttonName}`);
        }

        // Embed image in PDF
        const signatureImage = await pdfDoc.embedPng(imageBytes);

        // Set image as button appearance
        buttonField.setImage(signatureImage);

        console.log(`  ✅ Inserted signature into ${buttonName}`);
        return true;

      } catch (error) {
        console.error(`  ❌ Failed to insert ${buttonName}: ${error.message}`);
        return false;
      }
    };

    // Insert Liz's signature (button field: LizsSignature)
    if (signatureData.lizSignature) {
      const lizSignaturePath = path.join(signaturesDir, 'lizs-signaturecanvas.png');
      if (fs.existsSync(lizSignaturePath)) {
        results.lizsSignature = await insertSignature('LizsSignature', lizSignaturePath);
      } else {
        console.log(`⚠️ Liz's signature file not found at: ${lizSignaturePath}`);
      }
    }

    // Insert case manager's signature (button field: CaseManagerSignature)
    if (signatureData.caseManagerSignature) {
      results.caseManagerSignature = await insertSignature('CaseManagerSignature', signatureData.caseManagerSignature);
    }

    // Save the signed NDA to protected directory
    const outputFilename = `signedCaseManagersNda${caseManagerPin}.pdf`;
    const outputPath = path.join(signedNdaDir, outputFilename);

    // Ensure output directory exists
    if (!fs.existsSync(signedNdaDir)) {
      fs.mkdirSync(signedNdaDir, { recursive: true });
    }

    const finalPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, finalPdfBytes);

    console.log(`\n=== SIGNATURE INSERTION RESULTS ===`);
    console.log(`✅ PDF saved to: ${outputPath}`);
    console.log('Results:', results);

    return {
      success: true,
      outputPath,
      results,
    };

  } catch (error) {
    console.error(`❌ Signature insertion failed:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ==============================================
// FLATTEN NDA (Make Non-Editable)
// ==============================================
async function flattenNDA(caseManagerPin) {
  try {
    console.log(`\n=== FLATTENING CASE MANAGERS NDA ===`);
    console.log(`Case Manager PIN: ${caseManagerPin}`);

    const { signedNdaDir } = getDirectoryPaths();
    const pdfPath = path.join(signedNdaDir, `signedCaseManagersNda${caseManagerPin}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Signed NDA not found at: ${pdfPath}`);
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Flatten all form fields (makes all fields non-editable)
    const form = pdfDoc.getForm();
    form.flatten();

    console.log('✅ All form fields flattened (signature buttons now permanent)');

    // Save flattened PDF (overwrite)
    const flattenedBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath, flattenedBytes);

    console.log(`✅ Flattened NDA saved to: ${pdfPath}`);

    // Update database - save NDA PDF path
    await caseManagersDb.query(
      'UPDATE "caseManagers" SET "ndaPdfPath" = $1, "ndaSigned" = TRUE, "ndaSignedAt" = NOW() WHERE "caseManagerPin" = $2',
      [pdfPath, caseManagerPin]
    );

    console.log(`✅ Database updated: ndaPdfPath saved for ${caseManagerPin}`);

    return {
      success: true,
      outputPath: pdfPath,
    };

  } catch (error) {
    console.error(`❌ Flattening failed:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ==============================================
// EXPORTS
// ==============================================
export {
  insertSignaturesIntoNDA,
  flattenNDA
};

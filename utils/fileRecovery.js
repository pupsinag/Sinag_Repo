const fs = require('fs');
const path = require('path');

/**
 * Recovers a file path when the stored database path doesn't exist
 * Uses strict matching to ensure we get the correct intern's file
 * 
 * @param {string} storedPath - The file path stored in database
 * @param {string} docType - The document type (e.g., 'resume', 'medical_cert')
 * @param {string} internLastName - The intern's last name (for strict matching)
 * @param {string} uploadsDir - The uploads directory path
 * @returns {string|null} - The recovered file path or null if not found
 */
const recoverFilePath = (storedPath, docType, internLastName, uploadsDir) => {
  // If the stored path exists, use it
  const fullPath = path.join(uploadsDir, storedPath);
  if (fs.existsSync(fullPath)) {
    return storedPath;
  }

  console.log(`[recoverFilePath] File not found: ${storedPath}, searching for alternatives...`);

  // Try to find a file matching the document type and intern last name
  try {
    const files = fs.readdirSync(uploadsDir);
    
    // Build search patterns - STRICT matching to ensure we get the right intern's file
    const lastNamePart = internLastName.toUpperCase().replace(/\s/g, '_');
    const docTypePart = docType.toUpperCase().replace(/_/g, '_');
    
    console.log(`[recoverFilePath] Looking for files with lastName="${lastNamePart}" and docType="${docTypePart}"`);
    
    // Only look for files that have THIS SPECIFIC INTERN'S LAST NAME
    // This prevents accidentally returning another intern's document
    const candidateFiles = files.filter(f => 
      f.toUpperCase().startsWith(lastNamePart) && 
      (f.toUpperCase().includes(docType.toUpperCase()) || f.toUpperCase().includes(docTypePart))
    );
    
    console.log(`[recoverFilePath] Found ${candidateFiles.length} matching files: ${candidateFiles.join(', ')}`);
    
    if (candidateFiles.length > 0) {
      // Return the first (and should be only) matching file
      const recovered = candidateFiles[0];
      console.log(`[recoverFilePath] Using recovered file: ${recovered}`);
      return recovered;
    }

    console.log(`[recoverFilePath] No file found starting with "${lastNamePart}" for ${docType}`);
    return null;
  } catch (err) {
    console.error(`[recoverFilePath] Error searching for alternatives:`, err.message);
    return null;
  }
};

module.exports = { recoverFilePath };

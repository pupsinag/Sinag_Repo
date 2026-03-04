require('dotenv').config();
const models = require('../models');

(async () => {
  try {
    console.log('\n🔧 Clearing bad photo references...\n');
    
    // Update all logs with photo_path to null (fresh slate for testing)
    const result = await models.InternDailyLog.update(
      { photo_path: null },
      { where: { } }
    );
    
    console.log(`✅ Updated ${result[0]} logs\n`);
    console.log('📝 Database is now clean for fresh photo upload testing!\n');
    console.log('Next steps:');
    console.log('   1. Upload new photos via UploadReport');
    console.log('   2. Photos will be stored with proper filenames');
    console.log('   3. Adviser/Supervisor modals will display them correctly\n');
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

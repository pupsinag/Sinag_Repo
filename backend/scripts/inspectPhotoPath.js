require('dotenv').config();
const models = require('../models');

(async () => {
  try {
    const log = await models.InternDailyLog.findOne({ 
      where: { photo_path: { [models.sequelize.Sequelize.Op.not]: null } }
    });
    
    if (log) {
      console.log('Found log ID:', log.id);
      console.log('Stored photo_path:', log.photo_path);
      console.log('Stringified:', JSON.stringify(log.photo_path));
      console.log('Type:', typeof log.photo_path);
      console.log('Is array:', Array.isArray(log.photo_path));
    } else {
      console.log('No logs with photo_path found');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

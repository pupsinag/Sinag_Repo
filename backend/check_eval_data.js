const sequelize = require('./config/database');

(async () => {
  try {
    // Query supervisor evaluations directly
    const [evals] = await sequelize.query('SELECT * FROM supervisor_evaluations LIMIT 5');
    console.log('Total supervisor evaluations found:', evals.length);
    if (evals.length > 0) {
      console.log('Sample evaluation:', JSON.stringify(evals[0], null, 2));
    } else {
      console.log('No supervisor evaluations found!');
    }
    
    // Query supervisor evaluation items
    const [items] = await sequelize.query('SELECT * FROM supervisor_evaluation_items LIMIT 5');
    console.log('\nTotal evaluation items found:', items.length);
    items.slice(0, 3).forEach((item, i) => {
      console.log('\nItem', i+1, ':', JSON.stringify(item, null, 2));
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();

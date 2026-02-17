'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);

// ✅ shared sequelize instance
const sequelize = require('../config/database');

const db = {};

fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js' && file.indexOf('.test.js') === -1;
  })
  .forEach((file) => {
    console.log(`🔄 Loading model: ${file}`);

    try {
      const modelModule = require(path.join(__dirname, file));
      let model;

      // CLASS STYLE (ES6 class extending Model)
      if (typeof modelModule === 'function' && modelModule.prototype instanceof Sequelize.Model) {
        model = modelModule;
      }
      // FACTORY STYLE (function that returns model)
      else if (typeof modelModule === 'function') {
        model = modelModule(sequelize, Sequelize.DataTypes);
      }
      // PLAIN OBJECT (direct export)
      else if (typeof modelModule === 'object' && modelModule.init) {
        model = modelModule;
      } else {
        throw new Error(
          `Invalid model export in file: ${file}. ` +
            `Expected a function (factory) or class extending Model, ` +
            `but got ${typeof modelModule}`,
        );
      }

      if (!model || !model.name) {
        throw new Error(`Model in ${file} does not have a valid 'name' property`);
      }

      db[model.name] = model;
      console.log(`✅ Loaded model: ${model.name}`);
    } catch (error) {
      console.error(`❌ Error loading model ${file}:`, error.message);
      throw error;
    }
  });

// ✅ RUN ASSOCIATIONS ONCE (after all models are loaded)
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    console.log(`🔗 Setting up associations for: ${modelName}`);
    db[modelName].associate(db);
  }
});

// Custom associations for PDF summary reports
// (Intern-User association handled in Intern model)
if (db.SupervisorEvaluation && db.Intern && db.Company) {
  db.SupervisorEvaluation.belongsTo(db.Intern, { foreignKey: 'intern_id', as: 'intern' });
  db.SupervisorEvaluation.belongsTo(db.Company, { foreignKey: 'company_id', as: 'supervisorCompany' });
}

db.SupervisorEvaluation.hasMany(db.SupervisorEvaluationItem, { foreignKey: 'evaluationId', as: 'items' });
db.SupervisorEvaluationItem.belongsTo(db.SupervisorEvaluation, { foreignKey: 'evaluationId', as: 'evaluation' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log(`✅ All models loaded successfully. Total: ${Object.keys(db).length - 2} models`);

module.exports = db;

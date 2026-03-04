/* eslint-env node */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HTEEvaluation = sequelize.define(
  'HTEEvaluation',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    intern_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'interns', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    company_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    student_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    program: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    school_term: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    academic_year: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    evaluation_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    ratings: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    remarks: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    strengths: DataTypes.TEXT,
    improvements: DataTypes.TEXT,
    recommendations: DataTypes.TEXT,

    submitted_by: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    noted_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'hte_evaluations',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    indexes: [
      // Prevent duplicate HTE evaluations per intern per school term
      { name: 'uniq_hte_eval', unique: true, fields: ['intern_id', 'academic_year', 'school_term'] },
    ],
  },
);

// Add associate function for custom associations
HTEEvaluation.associate = (models) => {
  if (models.Company) {
    HTEEvaluation.belongsTo(models.Company, { foreignKey: 'company_id', as: 'hteCompany' });
  }
  if (models.Intern) {
    HTEEvaluation.belongsTo(models.Intern, { foreignKey: 'intern_id', as: 'intern' });
  }
};

module.exports = HTEEvaluation;

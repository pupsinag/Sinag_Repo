/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

  class Company extends Model {}

  Company.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      natureOfBusiness: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      supervisorName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      moaStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      moaEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      moaFile: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      moaFile_content: {
        type: DataTypes.BLOB('long'),
        allowNull: true,
        comment: 'Stores the MOA file content in binary format',
      },

      moaFile_mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'application/octet-stream',
        comment: 'MIME type of the MOA file (e.g., application/pdf)',
      },

      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      forcePasswordChange: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Company',
      tableName: 'companies',
      timestamps: false,
    },
  );

  // ✅ ASSOCIATIONS - DEFINE ONLY ONCE
  Company.associate = (models) => {
    // Company has many Interns
    if (models.Intern) {
      Company.hasMany(models.Intern, {
        foreignKey: 'company_id',
        as: 'AssignedInterns',
        onDelete: 'SET NULL',
      });
    }

    // Company has many Supervisors
    if (models.Supervisor) {
      Company.hasMany(models.Supervisor, {
        foreignKey: 'company_id',
        as: 'supervisors',
        onDelete: 'CASCADE',
      });
    }
  };

  return Company;
};

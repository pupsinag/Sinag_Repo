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

      file_content: {
        type: DataTypes.BLOB('long'),
        allowNull: true,
        comment: 'MOA file content stored as binary data for persistence across redeployments',
      },

      file_mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'application/pdf',
        comment: 'MIME type of the uploaded MOA file',
      },

      file_upload_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the MOA file was uploaded',
      },

      moa_status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending',
        allowNull: true,
        comment: 'Status of MOA (e.g., pending, active, expired, renewing)',
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
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
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

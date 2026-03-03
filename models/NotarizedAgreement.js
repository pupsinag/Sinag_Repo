/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const NotarizedAgreement = sequelize.define(
    'NotarizedAgreement',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      intern_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'interns',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      company_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      file_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      file_content: {
        type: DataTypes.BLOB('long'),
        allowNull: true,
        comment: 'File content stored as binary data for persistence across redeployments',
      },

      file_mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'application/pdf',
        comment: 'MIME type of the uploaded file',
      },

      upload_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending',
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'notarized_agreements',
      timestamps: true,
      underscored: false,
    },
  );

  NotarizedAgreement.associate = (models) => {
    NotarizedAgreement.belongsTo(models.Intern, {
      foreignKey: 'intern_id',
      as: 'intern',
      onDelete: 'CASCADE',
    });

    NotarizedAgreement.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
      onDelete: 'CASCADE',
    });
  };

  return NotarizedAgreement;
};

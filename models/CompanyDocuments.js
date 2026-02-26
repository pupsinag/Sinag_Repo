/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const CompanyDocuments = sequelize.define(
    'CompanyDocuments',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
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

      document_type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Type of document (e.g., moa, agreement, certificate)',
      },

      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      file_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Original file path (for reference)',
      },

      file_content: {
        type: DataTypes.BLOB('long'),
        allowNull: true,
        comment: 'File content stored as binary data for persistence across redeployments',
      },

      file_mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'application/octet-stream',
        comment: 'MIME type of the uploaded file',
      },

      file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'File size in bytes',
      },

      uploaded_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
      },

      remarks: DataTypes.TEXT,
    },
    {
      tableName: 'company_documents',
      timestamps: true,
      underscored: false,
    },
  );

  CompanyDocuments.associate = (models) => {
    CompanyDocuments.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
    });
  };

  return CompanyDocuments;
};

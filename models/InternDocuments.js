/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const InternDocuments = sequelize.define(
    'InternDocuments',
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

      document_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
        defaultValue: 'application/octet-stream',
        comment: 'MIME type of the uploaded file',
      },

      upload_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Optional tracking fields (from migration 021 if they exist)
      download_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: true,
        comment: 'Number of times document was accessed',
      },

      last_accessed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User ID who last accessed the document',
      },

      last_accessed_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When document was last accessed',
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: true,
        comment: 'Document version number if re-uploaded',
      },
    },
    {
      tableName: 'intern_documents',
      timestamps: true,
      underscored: false,
    },
  );

  InternDocuments.associate = (models) => {
    InternDocuments.belongsTo(models.Intern, {
      foreignKey: 'intern_id',
      as: 'intern',
    });
  };

  return InternDocuments;
};

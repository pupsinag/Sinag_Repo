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

      document_type: DataTypes.STRING,
      file_name: DataTypes.STRING,
      file_path: DataTypes.STRING,
      
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
      
      uploaded_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      status: DataTypes.STRING,
      remarks: DataTypes.TEXT,
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

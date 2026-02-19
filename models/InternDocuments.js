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
    });
  };

  return InternDocuments;
};

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
        unique: true,
        references: {
          model: 'interns',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      consent_form: DataTypes.STRING,
      notarized_agreement: DataTypes.STRING,
      resume: DataTypes.STRING,
      cor: DataTypes.STRING,
      insurance: DataTypes.STRING,
      medical_cert: DataTypes.STRING,

      uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'intern_documents',
      timestamps: false,
      underscored: true,
    },
  );

  InternDocuments.associate = (models) => {
    InternDocuments.belongsTo(models.Intern, {
      foreignKey: 'intern_id',
    });
  };

  return InternDocuments;
};

module.exports = (sequelize, DataTypes) => {
  const InternEvaluation = sequelize.define(
    'InternEvaluation',
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
    },
    {
      tableName: 'intern_evaluations',
      timestamps: true,
      underscored: false,
      indexes: [],
    },
  );

  // 🔗 Associations (CONSOLIDATED - only one associate function)
  InternEvaluation.associate = (models) => {
    InternEvaluation.belongsTo(models.Intern, {
      foreignKey: 'intern_id',
      onDelete: 'CASCADE',
    });

    InternEvaluation.hasMany(models.InternEvaluationItem, {
      foreignKey: 'evaluationId',
      as: 'items',
      onDelete: 'CASCADE',
    });
  };

  return InternEvaluation;
};

module.exports = (sequelize, DataTypes) => {
  const InternEvaluationItem = sequelize.define(
    'InternEvaluationItem',
    {
      category: {
        type: DataTypes.ENUM('CHARACTER', 'COMPETENCE'),
        allowNull: false,
      },

      itemText: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      maxScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      score: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'intern_evaluation_items',
      timestamps: true,
    },
  );

  InternEvaluationItem.associate = (models) => {
    InternEvaluationItem.belongsTo(models.InternEvaluation, {
      foreignKey: 'evaluationId',
      onDelete: 'CASCADE',
    });
  };

  return InternEvaluationItem;
};

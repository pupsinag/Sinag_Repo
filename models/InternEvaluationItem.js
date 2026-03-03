module.exports = (sequelize, DataTypes) => {
  const InternEvaluationItem = sequelize.define(
    'InternEvaluationItem',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      evaluationId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'intern_evaluations',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

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
      underscored: false,
    },
  );

  InternEvaluationItem.associate = (models) => {
    if (models.InternEvaluation) {
      InternEvaluationItem.belongsTo(models.InternEvaluation, {
        foreignKey: 'evaluationId',
        as: 'evaluation',
        onDelete: 'CASCADE',
      });
    }
  };

  return InternEvaluationItem;
};

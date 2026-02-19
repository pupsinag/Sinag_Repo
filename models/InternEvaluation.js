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

      internName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      section: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      hteName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      jobDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      totalScore: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      technicalDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      recommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      evaluator: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      designation: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      conforme: {
        type: DataTypes.STRING,
        allowNull: true,
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

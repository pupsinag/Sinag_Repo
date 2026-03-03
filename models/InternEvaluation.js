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

      company_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'companies', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      internName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      program: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      school_term: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      academic_year: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      evaluation_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      overall_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },

      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      submitted_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
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

    if (models.Company) {
      InternEvaluation.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
        onDelete: 'SET NULL',
      });
    }

    InternEvaluation.hasMany(models.InternEvaluationItem, {
      foreignKey: 'evaluationId',
      as: 'items',
      onDelete: 'CASCADE',
    });
  };

  return InternEvaluation;
};

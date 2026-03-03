module.exports = (sequelize, DataTypes) => {
  const SupervisorEvaluation = sequelize.define(
    'SupervisorEvaluation',
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
      supervisor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'supervisors',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      academic_year: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      semester: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    },
    {
      tableName: 'supervisor_evaluations',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      indexes: [
        {
          unique: true,
          fields: ['intern_id', 'supervisor_id', 'academic_year', 'semester'],
          name: 'uniq_supervisor_eval',
        },
        {
          fields: ['supervisor_id'],
          name: 'idx_supervisor_id',
        },
        {
          fields: ['intern_id'],
          name: 'idx_intern_id',
        },
      ],
    },
  );

  // 🔗 ASSOCIATIONS
  SupervisorEvaluation.associate = (models) => {
    if (models.Intern) {
      SupervisorEvaluation.belongsTo(models.Intern, {
        foreignKey: 'intern_id',
        as: 'intern',
        onDelete: 'CASCADE',
      });
    }

    if (models.Supervisor) {
      SupervisorEvaluation.belongsTo(models.Supervisor, {
        foreignKey: 'supervisor_id',
        as: 'supervisor',
        onDelete: 'CASCADE',
      });
    }

    if (models.Company) {
      SupervisorEvaluation.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
        onDelete: 'CASCADE',
      });
    }

    if (models.User) {
      SupervisorEvaluation.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'SET NULL',
      });
    }

    if (models.SupervisorEvaluationItem) {
      SupervisorEvaluation.hasMany(models.SupervisorEvaluationItem, {
        foreignKey: 'evaluation_id',
        as: 'items',
        onDelete: 'CASCADE',
      });
    }
  };

  return SupervisorEvaluation;
};

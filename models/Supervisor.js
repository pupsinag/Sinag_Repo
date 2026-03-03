module.exports = (sequelize, DataTypes) => {
  const Supervisor = sequelize.define(
    'Supervisor',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
    },
    {
      tableName: 'supervisors',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      underscored: false,
    }
  );

  Supervisor.associate = (models) => {
    if (models.Company) {
      Supervisor.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
        onDelete: 'CASCADE',
      });
    }

    if (models.Intern) {
      Supervisor.hasMany(models.Intern, {
        foreignKey: 'supervisor_id',
        as: 'interns',
        onDelete: 'SET NULL',
      });
    }

    if (models.User) {
      Supervisor.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'SET NULL',
      });
    }

    if (models.SupervisorEvaluation) {
      Supervisor.hasMany(models.SupervisorEvaluation, {
        foreignKey: 'supervisor_id',
        as: 'evaluations',
        onDelete: 'CASCADE',
      });
    }
  };

  return Supervisor;
};
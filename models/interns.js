/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

  class Intern extends Model {}

  Intern.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },

      status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Declined'),
        defaultValue: 'Pending',
      },

      remarks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      adviser_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      supervisor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'supervisors',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      company_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },

      position: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      program: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },

      year_section: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      required_hours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Intern',
      tableName: 'interns',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,
    },
  );

  // ✅ ASSOCIATIONS - ONLY DEFINE ONCE
  Intern.associate = (models) => {
    // Intern belongs to User (the intern student)
    if (models.User) {
      Intern.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'User',
        onDelete: 'CASCADE',
      });
    }

    // Intern belongs to Supervisor
    if (models.Supervisor) {
      Intern.belongsTo(models.Supervisor, {
        foreignKey: 'supervisor_id',
        as: 'Supervisor',
        onDelete: 'SET NULL',
      });
    }

    // Intern has an Adviser (User)
    if (models.User) {
      Intern.belongsTo(models.User, {
        foreignKey: 'adviser_id',
        as: 'Adviser',
        onDelete: 'SET NULL',
      });
    }

    // Intern can have many InternDocuments
    if (models.InternDocuments) {
      Intern.hasMany(models.InternDocuments, {
        foreignKey: 'intern_id',
        as: 'InternDocuments',
        onDelete: 'CASCADE',
      });
    }

    // Intern can have many InternDailyLogs
    if (models.InternDailyLog) {
      Intern.hasMany(models.InternDailyLog, {
        foreignKey: 'intern_id',
        as: 'DailyLogs',
        onDelete: 'CASCADE',
      });
    }

    // Intern belongs to Company (previously called HTE)
    if (models.Company) {
      Intern.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company',
        onDelete: 'SET NULL',
      });
    }

    // Intern can have many InternEvaluations
    if (models.InternEvaluation) {
      Intern.hasMany(models.InternEvaluation, {
        foreignKey: 'intern_id',
        as: 'Evaluations',
        onDelete: 'CASCADE',
      });
    }
  };

  return Intern;
};

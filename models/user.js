/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

  class User extends Model {}

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },

      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      firstName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'firstName', // ✅ Exact column name in DB
      },

      lastName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'lastName', // ✅ Exact column name in DB
      },

      mi: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      studentId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'studentId', // ✅ Exact column name in DB
      },

      role: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      program: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      yearSection: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'yearSection',
      },

      guardian: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      resetCode: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'resetCode', // ✅ Exact column name in DB
      },

      resetCodeExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'resetCodeExpires', // ✅ Exact column name in DB
      },

      forcePasswordChange: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Changed from true to ensure new users must change password
        field: 'forcePasswordChange', // ✅ Exact column name in DB
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      underscored: false, // ✅ Database uses camelCase
    },
  );

  // ✅ ASSOCIATIONS
  User.associate = (models) => {
    if (models.Intern) {
      User.hasOne(models.Intern, {
        foreignKey: 'user_id',
        as: 'Intern',
        onDelete: 'CASCADE',
      });
    }

    if (models.InternEvaluation) {
      User.hasMany(models.InternEvaluation, {
        foreignKey: 'user_id',
        as: 'InternEvaluations',
        onDelete: 'CASCADE',
      });
    }

    // Removed invalid association to HTEEvaluation (no user_id in hte_evaluations)

    if (models.SupervisorEvaluation) {
      User.hasMany(models.SupervisorEvaluation, {
        foreignKey: 'user_id',
        as: 'SupervisorEvaluations',
        onDelete: 'CASCADE',
      });
    }
  };

  return User;
};

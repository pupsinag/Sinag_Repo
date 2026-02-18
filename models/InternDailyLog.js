/* eslint-env node */
module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

  class InternDailyLog extends Model {}

  InternDailyLog.init(
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

      day_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      log_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      time_in: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      time_out: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      total_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Auto-calculated from time_in and time_out',
      },

      tasks_accomplished: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      skills_enhanced: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      learning_applied: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      photo_path: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Array of filenames for uploaded photos (up to 5)',
      },

      supervisor_status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending',
      },

      adviser_status: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending',
      },

      supervisor_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      adviser_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      supervisor_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when supervisor approved',
      },

      adviser_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when adviser approved',
      },
    },
    {
      sequelize,
      modelName: 'InternDailyLog',
      tableName: 'intern_daily_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,
      indexes: [
        // One log per intern per calendar date
        { name: 'uniq_daily_log_date', unique: true, fields: ['intern_id', 'log_date'] },
        // One log per intern per day number
        { name: 'uniq_daily_log_day', unique: true, fields: ['intern_id', 'day_no'] },
      ],
    },
  );

  InternDailyLog.associate = (models) => {
    InternDailyLog.belongsTo(models.Intern, {
      foreignKey: 'intern_id',
      onDelete: 'CASCADE',
    });
  };

  return InternDailyLog;
};

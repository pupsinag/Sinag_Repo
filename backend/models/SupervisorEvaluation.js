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
      },
      supervisor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      evaluation_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      overall_rating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
          fields: ['intern_id', 'supervisor_id', 'evaluation_date'],
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

  return SupervisorEvaluation;
};

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
      company_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
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

  return SupervisorEvaluation;
};

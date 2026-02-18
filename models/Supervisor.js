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
    }
  );

  Supervisor.associate = (models) => {
    Supervisor.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
    Supervisor.hasMany(models.Intern, { foreignKey: 'supervisor_id', as: 'interns' });
    Supervisor.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Supervisor;
};
/**
 * SupervisorEvaluationItem Model
 * Represents an individual evaluation item for a supervisor evaluation.
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  const SupervisorEvaluationItem = sequelize.define(
    'SupervisorEvaluationItem',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Primary key',
      },
      evaluationId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'evaluation_id',
        references: {
          model: 'supervisor_evaluations',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Foreign key to supervisor_evaluations',
      },
      section: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Section/category of the evaluation',
      },
      indicator: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Evaluation question or indicator',
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Numeric rating for this item',
      },
    },
    {
      tableName: 'supervisorevaluationitems',
      timestamps: false, // <-- Add this line
      underscored: true,
      // Add indexes, hooks, or scopes here if needed
    },
  );
  return SupervisorEvaluationItem;
};

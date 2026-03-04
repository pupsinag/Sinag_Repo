module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('supervisor_evaluations', 'remarks', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('supervisor_evaluations', 'remarks');
  },
};

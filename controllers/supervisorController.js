const db = require('../models');

// Get supervisor by ID
const getSupervisorById = async (req, res) => {
  try {
    const { id } = req.params;

    const supervisor = await db.Supervisor.findByPk(id, {
      include: [{ model: db.Company, as: 'company' }],
    });

    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    res.json(supervisor);
  } catch (error) {
    console.error('Error fetching supervisor:', error);
    res.status(500).json({ message: 'Failed to fetch supervisor' });
  }
};

module.exports = {
  getSupervisorById,
};

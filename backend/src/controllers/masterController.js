const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all masters (helper to fetch all categories in one go for forms)
const getAllMasters = async (req, res) => {
  try {
    const [timberTypes, parties] = await Promise.all([
      prisma.timberType.findMany(),
      prisma.party.findMany(),
    ]);

    res.json({
      timberTypes,
      parties,
    });
  } catch (error) {
    console.error("Error fetching masters:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Generic CRUD factory for masters
const createMasterCRUD = (model) => {
  return {
    getAll: async (req, res) => {
      try {
        const data = await prisma[model].findMany();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    },
    create: async (req, res) => {
      try {
        const data = await prisma[model].create({ data: req.body });
        res.status(201).json(data);
      } catch (error) {
        console.error(`Error creating ${model}:`, error);
        res.status(400).json({ error: `Failed to create ${model}. Ensure unique fields are not duplicated.` });
      }
    },
    update: async (req, res) => {
      try {
        const data = await prisma[model].update({
          where: { id: parseInt(req.params.id) },
          data: req.body,
        });
        res.json(data);
      } catch (error) {
        res.status(400).json({ error: `Failed to update ${model}` });
      }
    },
    delete: async (req, res) => {
      try {
        await prisma[model].delete({
          where: { id: parseInt(req.params.id) },
        });
        res.json({ success: true });
      } catch (error) {
        res.status(400).json({ error: `Failed to delete ${model}. It might be in use.` });
      }
    }
  };
};

module.exports = {
  getAllMasters,
  timberType: createMasterCRUD('timberType'),
  party: createMasterCRUD('party'),
};

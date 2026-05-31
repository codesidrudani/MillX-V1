const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getMills = async (req, res) => {
  try {
    const mills = await prisma.mill.findMany({
      include: {
        _count: { select: { users: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(mills);
  } catch (error) {
    console.error("Error fetching mills:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createMill = async (req, res) => {
  try {
    const { millName, millAddress, adminName, adminEmail, adminPassword } = req.body;

    if (!millName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: "Mill name, admin name, admin email and admin password are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const mill = await tx.mill.create({
        data: {
          name: millName,
          address: millAddress || null,
        }
      });

      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'admin',
          millId: mill.id,
        },
        select: { id: true, email: true, name: true, role: true }
      });

      return { mill, admin };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating mill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateMillStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'FROZEN'].includes(status)) {
      return res.status(400).json({ error: "Status must be ACTIVE or FROZEN" });
    }

    const mill = await prisma.mill.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json(mill);
  } catch (error) {
    console.error("Error updating mill status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getMills,
  createMill,
  updateMillStatus,
};

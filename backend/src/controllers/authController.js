const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { mill: true }
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.mill && user.mill.status === 'FROZEN') {
      return res.status(403).json({ error: "PAYMENT_PENDING" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || "millx_offline_secret_key_2026",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mill: user.mill ? {
          id: user.mill.id,
          name: user.mill.name,
          address: user.mill.address,
        } : null
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  login,
  me,
};

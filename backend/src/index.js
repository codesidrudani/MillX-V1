require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Main API Router
app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    // Attempt database connection to verify
    await prisma.$connect();
    console.log("Connected to the database");
    
    // Seed default admin account on start if no users exist
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("Admin@1234", 10);
      await prisma.user.create({
        data: {
          name: "Administrator",
          email: "admin@millx.com",
          password: hashedPassword,
          role: "admin",
        },
      });
      console.log("Default admin account seeded: admin@millx.com / Admin@1234");
    }
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});

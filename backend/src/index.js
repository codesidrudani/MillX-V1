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

const path = require("path");

// Main API Router
app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve frontend static files
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDistPath));

// Catch-all route for React Router
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    // Attempt database connection to verify
    await prisma.$connect();
    console.log("Connected to the database");
    
    // Seed default superadmin account on start if it doesn't exist
    const superadminExists = await prisma.user.findUnique({ where: { email: "superadmin@millx.com" } });
    if (!superadminExists) {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("SuperAdmin@123", 10);
      await prisma.user.create({
        data: {
          name: "Super Admin",
          email: "superadmin@millx.com",
          password: hashedPassword,
          role: "superadmin",
        },
      });
      console.log("Default superadmin account seeded: superadmin@millx.com / SuperAdmin@123");
    }

    // Seed default admin account on start if it doesn't exist
    const adminExists = await prisma.user.findUnique({ where: { email: "admin@millx.com" } });
    if (!adminExists) {
      const bcrypt = require("bcryptjs");
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

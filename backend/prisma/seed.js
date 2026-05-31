const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@millx.com";
  const password = "SuperAdmin@123";
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Superadmin already exists:", email);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: "Super Admin",
      role: "superadmin",
      millId: null,
    },
  });

  console.log("Superadmin created successfully!");
  console.log("  Email:", email);
  console.log("  Password:", password);
  console.log("  User ID:", user.id);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

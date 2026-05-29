const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.userId },
      include: { mill: true }
    });
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    if (user.mill && user.mill.status === 'FROZEN') {
      return res.status(403).json({ error: "PAYMENT_PENDING" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

module.exports = authenticate;

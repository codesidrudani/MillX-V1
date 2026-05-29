const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  try {
    const totalLogs = await prisma.logInventory.count({ where: { status: 'IN_STOCK', millId: req.user.millId } });
    const totalSawnSizes = await prisma.sawnSizeInventory.count({ where: { status: 'IN_STOCK', millId: req.user.millId } });
    
    // Dispatched today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dispatchedToday = await prisma.outgoingBatch.count({
      where: {
        millId: req.user.millId,
        date: { gte: startOfToday }
      }
    });

    const recentActivity = await prisma.auditLog.findMany({
      where: { millId: req.user.millId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } }
      }
    });

    res.json({
      totalLogs,
      totalSawnSizes,
      dispatchedToday,
      recentActivity
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getDashboardStats
};

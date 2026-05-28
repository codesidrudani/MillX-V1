const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createIncomingBatch = async (req, res) => {
  try {
    const { date, permitNo, source, sourceType, partyId, mode, items } = req.body;

    if (!date || !permitNo || !partyId || !items || !items.length) {
      return res.status(400).json({ error: "Missing required fields or items" });
    }

    // Prepare nested create based on mode
    let logsData = [];
    let sawnSizesData = [];

    if (mode === 'log') {
      logsData = items.map(item => ({
        logNo: item.logNo,
        timberTypeId: parseInt(item.timberTypeId) || null,
        length: parseFloat(item.length),
        girth: parseFloat(item.girth),
        volume: parseFloat(item.volume),
      }));
    } else if (mode === 'sawn_size') {
      sawnSizesData = items.map(item => ({
        timberTypeId: parseInt(item.timberTypeId) || null,
        isReeper: Boolean(item.isReeper),
        runningFeet: item.isReeper ? parseFloat(item.runningFeet) : null,
        thickness: item.isReeper ? 0 : parseFloat(item.thickness),
        width: item.isReeper ? 0 : parseFloat(item.width),
        length: item.isReeper ? null : parseFloat(item.length),
        quantity: item.isReeper ? null : parseInt(item.quantity, 10),
        volume: item.isReeper ? null : parseFloat(item.volume),
      }));
    } else {
      return res.status(400).json({ error: "Invalid mode" });
    }

    const batch = await prisma.$transaction(async (tx) => {
      const b = await tx.incomingBatch.create({
        data: {
          date: new Date(date),
          permitNo,
          source: source || null,
          sourceType: sourceType || null,
          partyId: parseInt(partyId),
          logs: { create: logsData },
          sawnSizes: { create: sawnSizesData }
        },
        include: { logs: true, sawnSizes: true, party: true }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE',
          entity: 'IncomingBatch',
          entityId: b.id,
          details: JSON.stringify({ permitNo: b.permitNo, date: b.date })
        }
      });

      return b;
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error("Error creating incoming batch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getInStockInventory = async (req, res) => {
  try {
    const [logs, sawnSizes] = await Promise.all([
      prisma.logInventory.findMany({
        where: { status: 'IN_STOCK' },
        include: { incomingBatch: { include: { party: true } } }
      }),
      prisma.sawnSizeInventory.findMany({
        where: { status: 'IN_STOCK' },
        include: { incomingBatch: { include: { party: true } } }
      })
    ]);

    res.json({ logs, sawnSizes });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createIncomingBatch,
  getInStockInventory
};

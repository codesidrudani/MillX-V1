const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getIncoming = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const batches = await prisma.incomingBatch.findMany({
      where,
      include: {
        party: true,
        logs: { include: { timberType: true } },
        sawnSizes: { include: { timberType: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(batches);
  } catch (error) {
    console.error("Error fetching incoming records:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOutgoing = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const batches = await prisma.outgoingBatch.findMany({
      where,
      include: {
        party: true,
        logUsages: { include: { logInventory: { include: { timberType: true } } } },
        sizeUsages: { include: { sawnSizeInventory: { include: { timberType: true } } } },
        producedSizes: { include: { timberType: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(batches);
  } catch (error) {
    console.error("Error fetching outgoing records:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteIncoming = async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);

    // Check if any items are utilized
    const logs = await prisma.logInventory.findMany({ where: { incomingBatchId: batchId } });
    const sizes = await prisma.sawnSizeInventory.findMany({ where: { incomingBatchId: batchId } });

    const isUtilized = logs.some(l => l.status === 'UTILIZED') || sizes.some(s => s.status === 'UTILIZED');
    
    if (isUtilized) {
      return res.status(400).json({ error: "Cannot delete this incoming batch because some of its items have already been utilized in an outgoing batch." });
    }

    await prisma.$transaction(async (tx) => {
      // Safe to delete items
      await tx.logInventory.deleteMany({ where: { incomingBatchId: batchId } });
      await tx.sawnSizeInventory.deleteMany({ where: { incomingBatchId: batchId } });
      
      const batch = await tx.incomingBatch.delete({ where: { id: batchId } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'DELETE',
          entity: 'IncomingBatch',
          entityId: batchId,
          details: JSON.stringify({ permitNo: batch.permitNo, date: batch.date })
        }
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting incoming batch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOutgoing = async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);

    await prisma.$transaction(async (tx) => {
      // 1. Get the usages
      const logUsages = await tx.logUsage.findMany({ where: { outgoingBatchId: batchId } });
      const sizeUsages = await tx.sawnSizeUsage.findMany({ where: { outgoingBatchId: batchId } });

      const logIds = logUsages.map(u => u.logInventoryId);
      const sizeIds = sizeUsages.map(u => u.sawnSizeInventoryId);

      // 2. Restore the inventory status back to IN_STOCK
      if (logIds.length > 0) {
        await tx.logInventory.updateMany({
          where: { id: { in: logIds } },
          data: { status: 'IN_STOCK' }
        });
      }
      if (sizeIds.length > 0) {
        await tx.sawnSizeInventory.updateMany({
          where: { id: { in: sizeIds } },
          data: { status: 'IN_STOCK' }
        });
      }

      // 3. Delete the usages
      await tx.logUsage.deleteMany({ where: { outgoingBatchId: batchId } });
      await tx.sawnSizeUsage.deleteMany({ where: { outgoingBatchId: batchId } });

      // 4. Delete the produced sizes
      await tx.outgoingSawnSize.deleteMany({ where: { outgoingBatchId: batchId } });

      // 5. Delete the batch
      const batch = await tx.outgoingBatch.delete({ where: { id: batchId } });

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'DELETE',
          entity: 'OutgoingBatch',
          entityId: batchId,
          details: JSON.stringify({ permitNo: batch.permitNo, date: batch.date })
        }
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting outgoing batch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getIncoming,
  getOutgoing,
  deleteIncoming,
  deleteOutgoing,
  getAuditLogs
};

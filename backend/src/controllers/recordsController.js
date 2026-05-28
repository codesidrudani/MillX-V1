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

const deleteIncomingLog = async (req, res) => {
  const { id } = req.params;
  try {
    const log = await prisma.logInventory.findUnique({ where: { id: parseInt(id) } });
    if (!log) return res.status(404).json({ error: "Log not found" });
    if (log.status === 'UTILIZED') return res.status(400).json({ error: "Cannot delete a utilized log" });
    
    await prisma.logInventory.delete({ where: { id: parseInt(id) } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DELETE', entity: 'LogInventory', entityId: parseInt(id), details: log.logNo }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Internal server error" }); }
};

const deleteIncomingSize = async (req, res) => {
  const { id } = req.params;
  try {
    const size = await prisma.sawnSizeInventory.findUnique({ where: { id: parseInt(id) } });
    if (!size) return res.status(404).json({ error: "Size not found" });
    if (size.status === 'UTILIZED') return res.status(400).json({ error: "Cannot delete a utilized size" });
    
    await prisma.sawnSizeInventory.delete({ where: { id: parseInt(id) } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DELETE', entity: 'SawnSizeInventory', entityId: parseInt(id), details: 'Size deleted' }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Internal server error" }); }
};

const addIncomingItem = async (req, res) => {
  const { id } = req.params; 
  const { mode, item } = req.body;
  
  try {
    if (mode === 'log') {
      const log = await prisma.logInventory.create({
        data: {
          incomingBatchId: parseInt(id),
          logNo: item.logNo,
          timberTypeId: parseInt(item.timberTypeId) || null,
          length: parseFloat(item.length),
          girth: parseFloat(item.girth),
          volume: parseFloat(item.volume),
        }
      });
      await prisma.auditLog.create({ data: { userId: req.user.id, action: 'CREATE', entity: 'LogInventory', entityId: log.id, details: log.logNo } });
      res.json(log);
    } else {
      const size = await prisma.sawnSizeInventory.create({
        data: {
          incomingBatchId: parseInt(id),
          timberTypeId: parseInt(item.timberTypeId) || null,
          isReeper: Boolean(item.isReeper),
          runningFeet: item.isReeper ? parseFloat(item.runningFeet) : null,
          thickness: item.isReeper ? 0 : parseFloat(item.thickness),
          width: item.isReeper ? 0 : parseFloat(item.width),
          length: item.isReeper ? null : parseFloat(item.length),
          quantity: item.isReeper ? null : parseInt(item.quantity, 10),
          volume: item.isReeper ? null : parseFloat(item.volume),
        }
      });
      await prisma.auditLog.create({ data: { userId: req.user.id, action: 'CREATE', entity: 'SawnSizeInventory', entityId: size.id, details: 'Size added' } });
      res.json(size);
    }
  } catch (error) { res.status(500).json({ error: "Internal server error" }); }
};

const deleteOutgoingProducedSize = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.outgoingSawnSize.delete({ where: { id: parseInt(id) } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'DELETE', entity: 'OutgoingSawnSize', entityId: parseInt(id), details: 'Produced size deleted' } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Internal server error" }); }
};

const deleteOutgoingUsage = async (req, res) => {
  const { type, id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      if (type === 'log') {
        const usage = await tx.logUsage.findUnique({ where: { id: parseInt(id) } });
        if (!usage) return;
        await tx.logInventory.update({ where: { id: usage.logInventoryId }, data: { status: 'IN_STOCK' } });
        await tx.logUsage.delete({ where: { id: parseInt(id) } });
      } else {
        const usage = await tx.sawnSizeUsage.findUnique({ where: { id: parseInt(id) } });
        if (!usage) return;
        await tx.sawnSizeInventory.update({ where: { id: usage.sawnSizeInventoryId }, data: { status: 'IN_STOCK' } });
        await tx.sawnSizeUsage.delete({ where: { id: parseInt(id) } });
      }
      await tx.auditLog.create({ data: { userId: req.user.id, action: 'DELETE', entity: type === 'log' ? 'LogUsage' : 'SawnSizeUsage', entityId: parseInt(id), details: 'Usage deleted and stock restored' } });
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Internal server error" }); }
};

const addOutgoingProducedSize = async (req, res) => {
  const { id } = req.params; 
  const { size } = req.body;
  try {
    const prodSize = await prisma.outgoingSawnSize.create({
      data: {
        outgoingBatchId: parseInt(id),
        timberTypeId: parseInt(size.timberTypeId) || null,
        isReeper: Boolean(size.isReeper),
        runningFeet: size.isReeper ? parseFloat(size.runningFeet) : null,
        thickness: size.isReeper ? 0 : parseFloat(size.thickness),
        width: size.isReeper ? 0 : parseFloat(size.width),
        length: size.isReeper ? null : parseFloat(size.length),
        quantity: size.isReeper ? null : parseInt(size.quantity, 10),
        totalVolume: size.isReeper ? null : parseFloat(size.totalVolume),
      }
    });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'CREATE', entity: 'OutgoingSawnSize', entityId: prodSize.id, details: 'Produced size added' } });
    res.json(prodSize);
  } catch (error) { res.status(500).json({ error: "Internal server error" }); }
};

module.exports = {
  getIncoming,
  getOutgoing,
  deleteIncoming,
  deleteOutgoing,
  getAuditLogs,
  deleteIncomingLog,
  deleteIncomingSize,
  addIncomingItem,
  deleteOutgoingProducedSize,
  deleteOutgoingUsage,
  addOutgoingProducedSize
};

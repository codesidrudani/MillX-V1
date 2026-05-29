const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createOutgoingBatch = async (req, res) => {
  try {
    const { date, permitNo, vehicleNo, partyId, mode, utilizedItemIds, producedSizes } = req.body;

    if (!date || !permitNo || !partyId || !utilizedItemIds || !producedSizes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // We use a transaction to ensure atomic updates (creating batch, usages, outputs, AND updating status)
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create the OutgoingBatch and its Produced Sizes
      const batch = await tx.outgoingBatch.create({
        data: {
          millId: req.user.millId,
          date: new Date(date),
          permitNo,
          vehicleNo: vehicleNo || null,
          partyId: parseInt(partyId),
          producedSizes: {
            create: producedSizes.map(size => ({
              millId: req.user.millId,
              timberTypeId: parseInt(size.timberTypeId) || null,
              isReeper: Boolean(size.isReeper),
              runningFeet: size.isReeper ? parseFloat(size.runningFeet) : null,
              thickness: size.isReeper ? 0 : parseFloat(size.thickness),
              width: size.isReeper ? 0 : parseFloat(size.width),
              length: size.isReeper ? null : parseFloat(size.length),
              quantity: size.isReeper ? null : parseInt(size.quantity, 10),
              totalVolume: size.isReeper ? null : parseFloat(size.totalVolume),
            }))
          }
        }
      });

      // 2. Link utilized items and update their status to UTILIZED
      if (mode === 'log') {
        const logUsagesData = utilizedItemIds.map(id => ({
          millId: req.user.millId,
          outgoingBatchId: batch.id,
          logInventoryId: parseInt(id)
        }));
        await tx.logUsage.createMany({ data: logUsagesData });

        await tx.logInventory.updateMany({
          where: { millId: req.user.millId, id: { in: utilizedItemIds.map(id => parseInt(id)) } },
          data: { status: 'UTILIZED' }
        });
      } else if (mode === 'sawn_size') {
        const sizeUsagesData = utilizedItemIds.map(id => ({
          millId: req.user.millId,
          outgoingBatchId: batch.id,
          sawnSizeInventoryId: parseInt(id)
        }));
        await tx.sawnSizeUsage.createMany({ data: sizeUsagesData });

        await tx.sawnSizeInventory.updateMany({
          where: { millId: req.user.millId, id: { in: utilizedItemIds.map(id => parseInt(id)) } },
          data: { status: 'UTILIZED' }
        });
      }

      await tx.auditLog.create({
        data: {
          millId: req.user.millId,
          userId: req.user.id,
          action: 'CREATE',
          entity: 'OutgoingBatch',
          entityId: batch.id,
          details: JSON.stringify({ permitNo: batch.permitNo, date: batch.date })
        }
      });

      return batch;
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating outgoing batch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createOutgoingBatch
};

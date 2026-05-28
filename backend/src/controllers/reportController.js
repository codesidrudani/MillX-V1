const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateReportForPeriod = (start, end, allLogs, allSizeInv, allProduced, showSubtype, showScientificName) => {
  const logGroups = {}; 
  const sizeGroups = {}; 

  allLogs.forEach(log => {
    const isIncomingBefore = log.incomingBatch.date < start;
    const isIncomingDuring = log.incomingBatch.date >= start && log.incomingBatch.date <= end;
    
    const isUtilized = log.status === 'UTILIZED' && log.usages.length > 0;
    const utilizedDate = isUtilized ? log.usages[0].outgoingBatch.date : null;
    
    const isSawnBefore = isUtilized && utilizedDate < start;
    const isSawnDuring = isUtilized && utilizedDate >= start && utilizedDate <= end;

    let typeName = log.timberType?.name || 'Unknown';
    if ((showScientificName === 'true' || showScientificName === true) && log.timberType?.scientificName) {
      typeName = log.timberType.scientificName;
    }
    
    let groupKey = typeName;
    if (showSubtype === 'true' || showSubtype === true) {
      const source = log.incomingBatch.source || 'Unknown';
      const sourceType = log.incomingBatch.sourceType || 'Unknown';
      groupKey = `${typeName} - ${source} (${sourceType})`;
    }

    if (!logGroups[groupKey]) {
      logGroups[groupKey] = {
        timberType: typeName, key: groupKey,
        opening: 0, openingNos: 0,
        incoming: 0, incomingNos: 0,
        sawn: 0, sawnNos: 0,
        closing: 0, closingNos: 0
      };
    }

    if (isIncomingBefore && !isSawnBefore) {
      logGroups[groupKey].opening += log.volume;
      logGroups[groupKey].openingNos += 1;
    }
    if (isIncomingDuring) {
      logGroups[groupKey].incoming += log.volume;
      logGroups[groupKey].incomingNos += 1;
    }
    if (isSawnDuring) {
      logGroups[groupKey].sawn += log.volume;
      logGroups[groupKey].sawnNos += 1;
    }
  });

  Object.values(logGroups).forEach(g => {
    g.closing = g.opening + g.incoming - g.sawn;
    g.closingNos = g.openingNos + g.incomingNos - g.sawnNos;
  });

  const initSizeGroup = (key) => {
    if (!sizeGroups[key]) {
      sizeGroups[key] = {
        key, timberType: key.split(' - ')[0],
        openingSizes: 0, openingReepers: 0,
        productionSizes: 0, productionReepers: 0,
        outgoingSizes: 0, outgoingReepers: 0,
        closingSizes: 0, closingReepers: 0
      };
    }
  };

  allSizeInv.forEach(size => {
    const isIncomingBefore = size.incomingBatch.date < start;
    const isIncomingDuring = size.incomingBatch.date >= start && size.incomingBatch.date <= end;
    
    const isUtilized = size.status === 'UTILIZED' && size.usages.length > 0;
    const utilizedDate = isUtilized ? size.usages[0].outgoingBatch.date : null;
    
    const isSawnBefore = isUtilized && utilizedDate < start;
    const isSawnDuring = isUtilized && utilizedDate >= start && utilizedDate <= end;

    let typeName = size.timberType?.name || 'Unknown';
    if ((showScientificName === 'true' || showScientificName === true) && size.timberType?.scientificName) {
      typeName = size.timberType.scientificName;
    }
    
    let groupKey = typeName;
    if (showSubtype === 'true' || showSubtype === true) {
      const source = size.incomingBatch.source || 'Unknown';
      const sourceType = size.incomingBatch.sourceType || 'Unknown';
      groupKey = `${typeName} - ${source} (${sourceType})`;
    }

    initSizeGroup(groupKey);

    const val = size.isReeper ? (size.runningFeet || 0) : (size.volume || 0);

    if (isIncomingBefore && !isSawnBefore) {
      if (size.isReeper) sizeGroups[groupKey].openingReepers += val;
      else sizeGroups[groupKey].openingSizes += val;
    }
    if (isIncomingDuring) {
      if (size.isReeper) sizeGroups[groupKey].productionReepers += val;
      else sizeGroups[groupKey].productionSizes += val;
    }
    if (isSawnDuring) {
      if (size.isReeper) sizeGroups[groupKey].outgoingReepers += val;
      else sizeGroups[groupKey].outgoingSizes += val;
    }
  });

  allProduced.forEach(size => {
    const isProducedDuring = size.outgoingBatch.date >= start && size.outgoingBatch.date <= end;
    if (isProducedDuring) {
      let typeName = size.timberType?.name || 'Unknown';
      if ((showScientificName === 'true' || showScientificName === true) && size.timberType?.scientificName) {
        typeName = size.timberType.scientificName;
      }
      
      let groupKey = typeName;
      initSizeGroup(groupKey);
      const val = size.isReeper ? (size.runningFeet || 0) : (size.totalVolume || 0);
      if (size.isReeper) {
        sizeGroups[groupKey].productionReepers += val;
        sizeGroups[groupKey].outgoingReepers += val;
      } else {
        sizeGroups[groupKey].productionSizes += val;
        sizeGroups[groupKey].outgoingSizes += val;
      }
    }
  });

  Object.values(sizeGroups).forEach(g => {
    g.closingSizes = g.openingSizes + g.productionSizes - g.outgoingSizes;
    g.closingReepers = g.openingReepers + g.productionReepers - g.outgoingReepers;
  });

  return {
    roundLogs: Object.values(logGroups),
    sawnSizes: Object.values(sizeGroups)
  };
};

const getReports = async (req, res) => {
  try {
    const { startDate, endDate, showSubtype, showScientificName, groupByMonth, year } = req.query;

    const allLogs = await prisma.logInventory.findMany({
      include: { incomingBatch: true, timberType: true, usages: { include: { outgoingBatch: true } } }
    });
    const allSizeInv = await prisma.sawnSizeInventory.findMany({
      include: { incomingBatch: true, timberType: true, usages: { include: { outgoingBatch: true } } }
    });
    const allProduced = await prisma.outgoingSawnSize.findMany({
      include: { outgoingBatch: true, timberType: true }
    });

    if (groupByMonth === 'true' && year) {
      const targetYear = parseInt(year);
      const yearStart = new Date(targetYear, 0, 1);
      const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59, 999);

      const yearlyTotal = generateReportForPeriod(yearStart, yearEnd, allLogs, allSizeInv, allProduced, showSubtype, showScientificName);
      
      const monthly = [];
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(targetYear, i, 1);
        const mEnd = new Date(targetYear, i + 1, 0, 23, 59, 59, 999); // last day of month
        const mData = generateReportForPeriod(mStart, mEnd, allLogs, allSizeInv, allProduced, showSubtype, showScientificName);
        monthly.push({
          monthName: `${monthNames[i]} ${targetYear}`,
          roundLogs: mData.roundLogs,
          sawnSizes: mData.sawnSizes
        });
      }

      return res.json({
        isGrouped: true,
        yearlyTotal,
        monthly
      });
    } else {
      const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      const singleReport = generateReportForPeriod(start, end, allLogs, allSizeInv, allProduced, showSubtype, showScientificName);
      return res.json({
        isGrouped: false,
        roundLogs: singleReport.roundLogs,
        sawnSizes: singleReport.sawnSizes
      });
    }
  } catch (error) {
    console.error("Error generating reports:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const generateRegistersForPeriod = async (start, end, showScientificName) => {
  // Form 44a: Intake (Incoming Logs)
  const logsIntake = await prisma.logInventory.findMany({
    where: { incomingBatch: { date: { gte: start, lte: end } } },
    include: { incomingBatch: { include: { party: true } }, timberType: true },
    orderBy: { incomingBatch: { date: 'asc' } }
  });

  const form44a = logsIntake.map((log, index) => {
    let typeName = log.timberType?.name || '';
    if ((showScientificName === 'true' || showScientificName === true) && log.timberType?.scientificName) {
      typeName = log.timberType.scientificName;
    }

    return {
      slNo: index + 1,
      partyNameAddress: `${log.incomingBatch.party?.name || ''}\n${log.incomingBatch.party?.address || ''}`.trim(),
      source: log.incomingBatch.source || '',
      dateOfReceipt: log.incomingBatch.date,
      permitNo: log.incomingBatch.permitNo,
      logNo: log.logNo,
      kind: typeName,
      length: log.length,
      girth: log.girth,
      volume: log.volume
    };
  });

  // Form 44b: Out-turn (Outgoing Sizes)
  const sizesOutturn = await prisma.outgoingSawnSize.findMany({
    where: { outgoingBatch: { date: { gte: start, lte: end } } },
    include: { outgoingBatch: true, timberType: true },
    orderBy: { outgoingBatch: { date: 'asc' } }
  });

  const form44b = sizesOutturn.map(size => {
    if (size.isReeper) {
      return {
        dateOfIssue: size.outgoingBatch.date,
        number: size.quantity || '',
        length: size.runningFeet || 0, // Store running feet in length
        width: '',
        thickness: '',
        volume: '',
        remarks: 'Reeper'
      };
    } else {
      return {
        dateOfIssue: size.outgoingBatch.date,
        number: size.quantity || '',
        length: size.length || 0,
        width: size.width || 0,
        thickness: size.thickness || 0,
        volume: size.totalVolume || 0,
        remarks: ''
      };
    }
  });

  return { form44a, form44b };
};

const getRegisters = async (req, res) => {
  try {
    const { startDate, endDate, showScientificName, groupByMonth, year } = req.query;

    if (groupByMonth === 'true' && year) {
      const targetYear = parseInt(year);
      const yearStart = new Date(targetYear, 0, 1);
      const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59, 999);

      const yearlyTotal = await generateRegistersForPeriod(yearStart, yearEnd, showScientificName);
      
      const monthly = [];
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      
      for (let i = 0; i < 12; i++) {
        const mStart = new Date(targetYear, i, 1);
        const mEnd = new Date(targetYear, i + 1, 0, 23, 59, 59, 999);
        const mData = await generateRegistersForPeriod(mStart, mEnd, showScientificName);
        monthly.push({
          monthName: `${monthNames[i]} ${targetYear}`,
          form44a: mData.form44a,
          form44b: mData.form44b
        });
      }

      return res.json({
        isGrouped: true,
        yearlyTotal,
        monthly
      });
    } else {
      const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      const singleRegister = await generateRegistersForPeriod(start, end, showScientificName);
      return res.json({
        isGrouped: false,
        form44a: singleRegister.form44a,
        form44b: singleRegister.form44b
      });
    }
  } catch (error) {
    console.error("Error fetching registers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getReports,
  getRegisters
};

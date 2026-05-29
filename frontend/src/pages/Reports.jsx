import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../store/useAuth';
import { Download, Filter, Search, Calendar, FileText, Table as TableIcon } from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from '../utils/dateFormatter';

const Reports = () => {
  const { user } = useAuth();
  const millTitle = user?.mill ? `M/s ${user.mill.name}${user.mill.address ? ', ' + user.mill.address : ''}` : 'Mill Report';
  const [data, setData] = useState({ roundLogs: [], sawnSizes: [], yearlyTotal: null, monthly: null, isGrouped: false });
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [activeReport, setActiveReport] = useState('logs_detailed'); // 'logs_detailed' or 'sizes_detailed'
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSubtype, setShowSubtype] = useState(false);
  const [showScientificName, setShowScientificName] = useState(false);
  const [hideZero, setHideZero] = useState(true);
  const [unit, setUnit] = useState('cft'); // 'cft' or 'cbm'
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports', {
        params: { startDate, endDate, showSubtype, showScientificName, groupByMonth, year }
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, showSubtype, showScientificName, groupByMonth, year]);

  const conversionRate = unit === 'cbm' ? 35.3147 : 1;
  const formatVol = (val) => (val / conversionRate).toFixed(3);
  const isLogs = activeReport === 'logs_detailed';

  const filterTableData = (tableData) => {
    if (hideZero) {
      if (isLogs) {
        return tableData.filter(r => r.opening > 0 || r.incoming > 0 || r.sawn > 0 || r.closing > 0);
      } else {
        return tableData.filter(r => r.openingSizes > 0 || r.openingReepers > 0 || r.productionSizes > 0 || r.productionReepers > 0 || r.outgoingSizes > 0 || r.outgoingReepers > 0 || r.closingSizes > 0 || r.closingReepers > 0);
      }
    }
    return tableData;
  };

  const addTotalsRow = (tableData) => {
    if (tableData.length > 0) {
      const totals = { key: 'Total', isTotal: true };
      if (isLogs) {
        totals.openingNos = tableData.reduce((sum, r) => sum + (r.openingNos || 0), 0);
        totals.opening = tableData.reduce((sum, r) => sum + (r.opening || 0), 0);
        totals.incomingNos = tableData.reduce((sum, r) => sum + (r.incomingNos || 0), 0);
        totals.incoming = tableData.reduce((sum, r) => sum + (r.incoming || 0), 0);
        totals.sawnNos = tableData.reduce((sum, r) => sum + (r.sawnNos || 0), 0);
        totals.sawn = tableData.reduce((sum, r) => sum + (r.sawn || 0), 0);
        totals.closingNos = tableData.reduce((sum, r) => sum + (r.closingNos || 0), 0);
        totals.closing = tableData.reduce((sum, r) => sum + (r.closing || 0), 0);
      } else {
        ['openingSizes', 'openingReepers', 'productionSizes', 'productionReepers', 'outgoingSizes', 'outgoingReepers', 'closingSizes', 'closingReepers'].forEach(k => {
          totals[k] = tableData.reduce((sum, r) => sum + (r[k] || 0), 0);
        });
      }
      return [...tableData, totals];
    }
    return tableData;
  };

  const getFilteredData = (sourceData) => {
    const rawData = isLogs ? sourceData.roundLogs : sourceData.sawnSizes;
    return addTotalsRow(filterTableData(rawData));
  };

  // The data rendered on screen is always just ONE table (the single report or the yearly total)
  const displayData = data.isGrouped ? getFilteredData(data.yearlyTotal) : getFilteredData(data);

  // Helper for generating an Excel sheet block
  const appendExcelTable = (sheet, title, dataBlock, startRow) => {
    sheet.mergeCells(`A${startRow}:K${startRow}`);
    const subtitleCell = sheet.getCell(`A${startRow}`);
    subtitleCell.value = title;
    subtitleCell.alignment = { horizontal: 'center' };

    if (isLogs) {
      sheet.getRow(startRow + 1).values = ['Kind', 'Opening Stock', '', 'Receipt', '', 'Total', '', 'Disposal', '', 'Closing Balance', ''];
      sheet.mergeCells(`A${startRow+1}:A${startRow+3}`); 
      sheet.mergeCells(`B${startRow+1}:C${startRow+1}`); sheet.mergeCells(`D${startRow+1}:E${startRow+1}`); sheet.mergeCells(`F${startRow+1}:G${startRow+1}`); sheet.mergeCells(`H${startRow+1}:I${startRow+1}`); sheet.mergeCells(`J${startRow+1}:K${startRow+1}`);
      
      sheet.getRow(startRow + 2).values = ['', 'R Logs', '', 'R Logs', '', 'R Logs', '', 'R Logs', '', 'R Logs', ''];
      sheet.mergeCells(`B${startRow+2}:C${startRow+2}`); sheet.mergeCells(`D${startRow+2}:E${startRow+2}`); sheet.mergeCells(`F${startRow+2}:G${startRow+2}`); sheet.mergeCells(`H${startRow+2}:I${startRow+2}`); sheet.mergeCells(`J${startRow+2}:K${startRow+2}`);
      
      const unitLbl = unit === 'cbm' ? 'Cmtr' : 'Cft';
      sheet.getRow(startRow + 3).values = ['', 'Nos', unitLbl, 'Nos', unitLbl, 'Nos', unitLbl, 'Nos', unitLbl, 'Nos', unitLbl];

      [1, 2, 3].forEach(offset => {
        sheet.getRow(startRow + offset).eachCell(cell => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      let currRow = startRow + 4;
      dataBlock.forEach(row => {
        const totalNos = (row.openingNos || 0) + (row.incomingNos || 0);
        const totalVol = (row.opening || 0) + (row.incoming || 0);
        const excelRow = sheet.addRow([
          row.key,
          row.openingNos || 0, Number(formatVol(row.opening || 0)),
          row.incomingNos || 0, Number(formatVol(row.incoming || 0)),
          totalNos, Number(formatVol(totalVol)),
          row.sawnNos || 0, Number(formatVol(row.sawn || 0)),
          row.closingNos || 0, Number(formatVol(row.closing || 0))
        ]);
        excelRow.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        if (row.isTotal) excelRow.font = { bold: true };
        currRow++;
      });
      return currRow; // next available start row
    } else {
      sheet.getRow(startRow + 1).values = ['Kind', 'Opening Stock', '', 'Out turn', '', 'Total', '', 'Disposal', '', 'Closing Balance', ''];
      sheet.mergeCells(`A${startRow+1}:A${startRow+2}`); 
      sheet.mergeCells(`B${startRow+1}:C${startRow+1}`); sheet.mergeCells(`D${startRow+1}:E${startRow+1}`); sheet.mergeCells(`F${startRow+1}:G${startRow+1}`); sheet.mergeCells(`H${startRow+1}:I${startRow+1}`); sheet.mergeCells(`J${startRow+1}:K${startRow+1}`);
      
      sheet.getRow(startRow + 2).values = ['', 'Sizes', 'Reepers', 'Sizes', 'Reepers', 'Sizes', 'Reepers', 'Sizes', 'Reepers', 'Sizes', 'Reepers'];

      [1, 2].forEach(offset => {
        sheet.getRow(startRow + offset).eachCell(cell => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      let currRow = startRow + 3;
      dataBlock.forEach(row => {
        const totalSizes = (row.openingSizes || 0) + (row.productionSizes || 0);
        const totalReepers = (row.openingReepers || 0) + (row.productionReepers || 0);
        const excelRow = sheet.addRow([
          row.key,
          Number(formatVol(row.openingSizes || 0)), row.openingReepers || 0,
          Number(formatVol(row.productionSizes || 0)), row.productionReepers || 0,
          Number(formatVol(totalSizes)), totalReepers,
          Number(formatVol(row.outgoingSizes || 0)), row.outgoingReepers || 0,
          Number(formatVol(row.closingSizes || 0)), row.closingReepers || 0
        ]);
        excelRow.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        if (row.isTotal) excelRow.font = { bold: true };
        currRow++;
      });
      return currRow;
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    sheet.mergeCells('A1:K1'); 
    const titleCell = sheet.getCell('A1');
    titleCell.value = millTitle;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A1').border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

    let currentStartRow = 2;

    if (data.isGrouped) {
      // Export 12 monthly tables
      data.monthly.forEach((monthData) => {
        const mTable = getFilteredData(monthData);
        if (mTable.length > 0) {
          const title = isLogs 
            ? `Opening Stock,Receipt,Disposal of Timber round logs for the month of ${monthData.monthName}`
            : `Out turn & Disposal of Timber Sawn Sizes for the month of ${monthData.monthName}`;
          currentStartRow = appendExcelTable(sheet, title, mTable, currentStartRow);
          currentStartRow += 2; // Gap between tables
        }
      });
    } else {
      // Single table
      const title = isLogs 
        ? `Opening Stock,Receipt,Disposal of Timber round logs for the period of ${formatDate(startDate)} to ${formatDate(endDate)}`
        : `Out turn & Disposal of Timber Sawn Sizes for the period of ${formatDate(startDate)} to ${formatDate(endDate)}`;
      currentStartRow = appendExcelTable(sheet, title, displayData, currentStartRow);
    }

    sheet.getColumn(1).width = 25;

    // Print setup
    sheet.pageSetup.printArea = `A1:K${currentStartRow - 1}`;
    sheet.pageSetup.printTitlesRow = isLogs ? '3:5' : '3:4';
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.fitToWidth = 1;
    sheet.pageSetup.fitToHeight = 0;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MillX_${activeReport}_Report.xlsx`;
    link.click();
    setShowExportMenu(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    let startY = 28;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(millTitle, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const generateTable = (title, tableData, yPos) => {
      doc.text(title, doc.internal.pageSize.width / 2, yPos - 6, { align: 'center' });
      
      let head, body;
      if (isLogs) {
        head = [
          [ { content: 'Kind', rowSpan: 3 }, { content: 'Opening Stock', colSpan: 2 }, { content: 'Receipt', colSpan: 2 }, { content: 'Total', colSpan: 2 }, { content: 'Disposal', colSpan: 2 }, { content: 'Closing Balance', colSpan: 2 } ],
          [ { content: 'R Logs', colSpan: 2 }, { content: 'R Logs', colSpan: 2 }, { content: 'R Logs', colSpan: 2 }, { content: 'R Logs', colSpan: 2 }, { content: 'R Logs', colSpan: 2 } ],
          [ 'Nos', unit === 'cbm' ? 'Cmtr' : 'Cft', 'Nos', unit === 'cbm' ? 'Cmtr' : 'Cft', 'Nos', unit === 'cbm' ? 'Cmtr' : 'Cft', 'Nos', unit === 'cbm' ? 'Cmtr' : 'Cft', 'Nos', unit === 'cbm' ? 'Cmtr' : 'Cft' ]
        ];

        body = tableData.map(row => {
          const totalNos = (row.openingNos || 0) + (row.incomingNos || 0);
          const totalVol = (row.opening || 0) + (row.incoming || 0);
          return [
            row.key,
            row.openingNos || 0, formatVol(row.opening || 0),
            row.incomingNos || 0, formatVol(row.incoming || 0),
            totalNos, formatVol(totalVol),
            row.sawnNos || 0, formatVol(row.sawn || 0),
            row.closingNos || 0, formatVol(row.closing || 0)
          ];
        });
      } else {
        head = [
          [ { content: 'Kind', rowSpan: 2 }, { content: 'Opening Stock', colSpan: 2 }, { content: 'Out turn', colSpan: 2 }, { content: 'Total', colSpan: 2 }, { content: 'Disposal', colSpan: 2 }, { content: 'Closing Balance', colSpan: 2 } ],
          [ 'Sizes', 'Reepers', 'Sizes', 'Reepers', 'Sizes', 'Reepers', 'Sizes', 'Reepers', 'Sizes', 'Reepers' ]
        ];

        body = tableData.map(row => {
          const totalSizes = (row.openingSizes || 0) + (row.productionSizes || 0);
          const totalReepers = (row.openingReepers || 0) + (row.productionReepers || 0);
          return [
            row.key,
            formatVol(row.openingSizes || 0), row.openingReepers || 0,
            formatVol(row.productionSizes || 0), row.productionReepers || 0,
            formatVol(totalSizes), totalReepers,
            formatVol(row.outgoingSizes || 0), row.outgoingReepers || 0,
            formatVol(row.closingSizes || 0), row.closingReepers || 0
          ];
        });
      }

      doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [0, 0, 0] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didParseCell: function (cellData) {
          if (cellData.row.index === body.length - 1) cellData.cell.styles.fontStyle = 'bold';
        },
        margin: { top: 20 }
      });
      return doc.lastAutoTable.finalY + 20; // Return next start Y with gap
    };

    if (data.isGrouped) {
      let currentY = startY;
      data.monthly.forEach((monthData) => {
        const mTable = getFilteredData(monthData);
        if (mTable.length > 0) {
          const title = isLogs 
            ? `Opening Stock,Receipt,Disposal of Timber round logs for the month of ${monthData.monthName}`
            : `Out turn & Disposal of Timber Sawn Sizes for the month of ${monthData.monthName}`;
          currentY = generateTable(title, mTable, currentY);
          
          if (currentY > doc.internal.pageSize.height - 40) {
            doc.addPage();
            currentY = 20;
          }
        }
      });
    } else {
      const title = isLogs 
        ? `Opening Stock,Receipt,Disposal of Timber round logs for the period of ${formatDate(startDate)} to ${formatDate(endDate)}`
        : `Out turn & Disposal of Timber Sawn Sizes for the period of ${formatDate(startDate)} to ${formatDate(endDate)}`;
      generateTable(title, displayData, startY);
    }

    doc.save(`MillX_${activeReport}_Report.pdf`);
    setShowExportMenu(false);
  };

  const renderTableData = () => {
    if (displayData.length === 0) {
      return (
        <tr>
          <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
            No data found for the selected period and filters.
          </td>
        </tr>
      );
    }

    return displayData.map((row, idx) => {
      const isTotal = row.isTotal;
      const trClass = isTotal ? "bg-gray-100 font-bold" : "hover:bg-gray-50";

      if (isLogs) {
        const totalNos = (row.openingNos || 0) + (row.incomingNos || 0);
        const totalVol = (row.opening || 0) + (row.incoming || 0);
        return (
          <tr key={idx} className={trClass}>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r">{row.key}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{row.openingNos || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right border-r">{formatVol(row.opening || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">{row.incomingNos || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 border-r">{formatVol(row.incoming || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right bg-blue-50/30">{totalNos}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right bg-blue-50/30 border-r">{formatVol(totalVol)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">{row.sawnNos || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 border-r">{formatVol(row.sawn || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{row.closingNos || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{formatVol(row.closing || 0)}</td>
          </tr>
        );
      } else {
        const totalSizes = (row.openingSizes || 0) + (row.productionSizes || 0);
        const totalReepers = (row.openingReepers || 0) + (row.productionReepers || 0);
        return (
          <tr key={idx} className={trClass}>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r">{row.key}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{formatVol(row.openingSizes || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right border-r">{row.openingReepers || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">{formatVol(row.productionSizes || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 border-r">{row.productionReepers || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right bg-blue-50/30">{formatVol(totalSizes)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right bg-blue-50/30 border-r">{totalReepers}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">{formatVol(row.outgoingSizes || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 border-r">{row.outgoingReepers || 0}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{formatVol(row.closingSizes || 0)}</td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{row.closingReepers || 0}</td>
          </tr>
        );
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center relative">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detailed Periodic Reports</h1>
          <p className="text-gray-500">Aggregated periodic stock movement</p>
        </div>
        
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center space-x-2 px-4 py-2 bg-forest-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-forest-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu">
                <button onClick={exportExcel} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                  <TableIcon className="w-4 h-4 text-green-600" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button onClick={exportPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Export to PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
            <input 
              type="checkbox" 
              checked={groupByMonth} 
              onChange={(e) => setGroupByMonth(e.target.checked)} 
              className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
            />
            <span className="text-sm font-bold text-gray-800">12 Month Report (Yearly)</span>
          </label>

          {groupByMonth ? (
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-forest-500 focus:border-forest-500 font-medium">
                {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-forest-500 focus:border-forest-500" 
                />
              </div>
              <span className="text-gray-500 font-medium">to</span>
              <div className="flex items-center space-x-2">
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-forest-500 focus:border-forest-500" 
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6">
          <select 
            value={unit} 
            onChange={(e) => setUnit(e.target.value)} 
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-forest-500 focus:border-forest-500 font-medium text-gray-700"
          >
            <option value="cft">Cubic Feet (cft)</option>
            <option value="cbm">Cubic Meters (cbm)</option>
          </select>

          {isLogs && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showSubtype} 
                onChange={(e) => setShowSubtype(e.target.checked)} 
                className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
              />
              <span className="text-sm font-medium text-gray-700">Show Subtype (Source)</span>
            </label>
          )}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showScientificName} 
              onChange={(e) => setShowScientificName(e.target.checked)} 
              className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
            />
            <span className="text-sm font-medium text-gray-700">Show Scientific Name</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={hideZero} 
              onChange={(e) => setHideZero(e.target.checked)} 
              className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
            />
            <span className="text-sm font-medium text-gray-700">Hide Zero Movement</span>
          </label>
        </div>
      </div>

      {groupByMonth && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-center space-x-3">
          <span className="font-bold">Yearly Total Mode:</span>
          <span>The table below shows the aggregated totals for {year}. When you click "Export Data", the resulting PDF/Excel file will automatically be split into 12 separate monthly tables.</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveReport('logs_detailed')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeReport === 'logs_detailed'
                  ? 'border-forest-500 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detailed Round Logs Report
            </button>
            <button
              onClick={() => setActiveReport('sizes_detailed')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeReport === 'sizes_detailed'
                  ? 'border-forest-500 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detailed Sizes & Reepers Report
            </button>
          </nav>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Generating report...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  {isLogs ? (
                    <>
                      <tr>
                        <th rowSpan={2} className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase border-b border-r align-bottom">Kind</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Opening Stock</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Receipt</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r bg-blue-50/30">Total</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Disposal</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b">Closing Balance</th>
                      </tr>
                      <tr>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Nos</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r">{unit === 'cbm' ? 'Cmtr' : 'Cft'}</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Nos</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r">{unit === 'cbm' ? 'Cmtr' : 'Cft'}</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b bg-blue-50/30">Nos</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r bg-blue-50/30">{unit === 'cbm' ? 'Cmtr' : 'Cft'}</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Nos</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r">{unit === 'cbm' ? 'Cmtr' : 'Cft'}</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Nos</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">{unit === 'cbm' ? 'Cmtr' : 'Cft'}</th>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <th rowSpan={2} className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase border-b border-r align-bottom">Kind</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Opening Stock</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Out turn</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r bg-blue-50/30">Total</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Disposal</th>
                        <th colSpan={2} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b">Closing Balance</th>
                      </tr>
                      <tr>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Sizes ({unit})</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r">Reepers (R.Ft)</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Sizes ({unit})</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r">Reepers (R.Ft)</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b bg-blue-50/30">Sizes ({unit})</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r bg-blue-50/30">Reepers (R.Ft)</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Sizes ({unit})</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b border-r">Reepers (R.Ft)</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Sizes ({unit})</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500 border-b">Reepers (R.Ft)</th>
                      </tr>
                    </>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renderTableData()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;

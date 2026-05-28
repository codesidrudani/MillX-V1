import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Download, Calendar, FileText, Table as TableIcon } from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Registers = () => {
  const [data, setData] = useState({ form44a: [], form44b: [], yearlyTotal: null, monthly: null, isGrouped: false });
  const [loading, setLoading] = useState(true);
  
  const [activeForm, setActiveForm] = useState('44a'); // '44a' or '44b'
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // New options
  const [showScientificName, setShowScientificName] = useState(false);
  const [unit, setUnit] = useState('cft'); // 'cft' or 'cbm'
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/registers', {
        params: { startDate, endDate, showScientificName, groupByMonth, year }
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch registers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegisters();
  }, [startDate, endDate, showScientificName, groupByMonth, year]);

  const is44a = activeForm === '44a';
  
  const conversionRate = unit === 'cbm' ? 35.3147 : 1;
  const formatVol = (val) => val ? (parseFloat(val) / conversionRate).toFixed(3) : '';
  const formatLength = (val) => val ? (unit === 'cbm' ? (parseFloat(val) * 0.3048).toFixed(2) : parseFloat(val)) : '';
  const formatInchToMeter = (val) => val ? (unit === 'cbm' ? (parseFloat(val) * 0.0254).toFixed(3) : parseFloat(val)) : '';
  
  const volHeader = unit === 'cbm' ? 'Cmtr' : 'Cft';
  const lengthHeader = unit === 'cbm' ? 'Length\n(m)' : 'Length';
  const girthHeader = unit === 'cbm' ? 'Girth\n(m)' : 'Girth';
  const widthHeader = unit === 'cbm' ? 'Width\n(m)' : 'Width';
  const thicknessHeader = unit === 'cbm' ? 'Thickness\n(m)' : 'Thickness';

  // Determine what data to show in the UI table
  let tableData = [];
  if (data.isGrouped && data.yearlyTotal) {
    tableData = is44a ? data.yearlyTotal.form44a : data.yearlyTotal.form44b;
  } else {
    tableData = is44a ? data.form44a : data.form44b;
  }

  // Helper for generating an Excel sheet block
  const appendExcelTable = (sheet, title, blockData, startRow, isForm44a) => {
    if (isForm44a) {
      sheet.mergeCells(`A${startRow}:L${startRow}`);
      const titleCell = sheet.getCell(`A${startRow}`);
      titleCell.value = title;
      titleCell.font = { bold: true };
      titleCell.alignment = { horizontal: 'center' };

      const headersRow = startRow + 1;
      sheet.getRow(headersRow).values = [
        'Sl\nNo', 
        'Name & address of\nthe person entrust-\ning sawing on\njob work', 
        'whence\nreceived', 
        'Date of\nreceipt in\nthe saw-pit\nor sawmill', 
        'Pass or\npermit\nNo & date\nif any', 
        'Marks\nif any', 
        'Log No', 
        'Kind', 
        lengthHeader, 
        girthHeader, 
        `Vol\n${volHeader}`, 
        'Signature of the\nperson entru-\nsting sawing\non job work'
      ];

      sheet.getRow(headersRow).height = 60;
      sheet.getRow(headersRow).eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });

      let currRow = headersRow + 1;
      blockData.forEach((row, idx) => {
        const tr = sheet.addRow([
          row.slNo,
          row.partyNameAddress,
          row.source,
          new Date(row.dateOfReceipt).toLocaleDateString(),
          row.permitNo,
          '', // Marks
          row.logNo,
          row.kind,
          Number(formatLength(row.length)),
          Number(formatInchToMeter(row.girth)),
          Number(formatVol(row.volume)),
          '' // Signature
        ]);
        tr.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        currRow++;
      });
      return currRow;

    } else {
      sheet.mergeCells(`A${startRow}:I${startRow}`);
      const titleCell = sheet.getCell(`A${startRow}`);
      titleCell.value = title;
      titleCell.font = { bold: true };
      titleCell.alignment = { horizontal: 'center' };

      const headersRow = startRow + 1;
      sheet.getRow(headersRow).values = [
        'Date of issue\nfor sawing', 
        'Number', 
        lengthHeader, 
        widthHeader, 
        thicknessHeader, 
        `Volume\n${volHeader}`, 
        'Date of delivery\nof the sawn\nmaterials', 
        'Signature of the person\ntaking delivery of the\nsawn materials', 
        'Remarks'
      ];

      sheet.getRow(headersRow).height = 50;
      sheet.getRow(headersRow).eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });

      let currRow = headersRow + 1;
      blockData.forEach((row) => {
        const tr = sheet.addRow([
          new Date(row.dateOfIssue).toLocaleDateString(),
          row.number,
          Number(formatLength(row.length)),
          Number(formatInchToMeter(row.width)),
          Number(formatInchToMeter(row.thickness)),
          row.remarks === 'Reeper' ? '' : Number(formatVol(row.volume)),
          '', // Date of delivery
          '', // Signature
          row.remarks
        ]);
        tr.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        currRow++;
      });
      return currRow;
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(is44a ? 'Form 44a' : 'Form 44b');

    // Master Headers
    if (is44a) {
      sheet.mergeCells('A1:L1');
      sheet.getCell('A1').value = "(KARNATAKA FOREST RULES, 1969)";
      sheet.mergeCells('A2:L2');
      sheet.getCell('A2').value = "FORM 44 [164(3)]";
      sheet.mergeCells('A3:L3');
      sheet.getCell('A3').value = "REGISTER SHOWING THE INTAKE OF THE TIMBER UNDERTAKEN FOR SAWING ON JOB WORK";
      sheet.mergeCells('A4:L4');
      sheet.getCell('A4').value = "IN-TAKE";
      
      [1, 2, 3, 4].forEach(r => {
        const cell = sheet.getCell(`A${r}`);
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      
      sheet.getColumn(2).width = 25;
      sheet.getColumn(4).width = 15;
      sheet.getColumn(5).width = 15;
      sheet.getColumn(12).width = 20;
    } else {
      sheet.mergeCells('A1:I1');
      sheet.getCell('A1').value = "KARNATAKA FOREST DEPARTMENT";
      sheet.mergeCells('A2:I2');
      sheet.getCell('A2').value = "(KARNATAKA FOREST RULES, 1969)";
      sheet.mergeCells('A3:I3');
      sheet.getCell('A3').value = "FORM 44 [164(3)]";
      sheet.mergeCells('A4:I4');
      sheet.getCell('A4').value = "REGISTER SHOWING THE INTAKE OF THE TIMBER UNDERTAKEN FOR SAWING ON JOB WORK";
      sheet.mergeCells('A5:I5');
      sheet.getCell('A5').value = "Out-turn and delivery";
      
      [1, 2, 3, 4, 5].forEach(r => {
        const cell = sheet.getCell(`A${r}`);
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      
      sheet.getColumn(1).width = 15;
      sheet.getColumn(7).width = 20;
      sheet.getColumn(8).width = 25;
      sheet.getColumn(9).width = 15;
    }

    let currentStartRow = is44a ? 6 : 7;

    if (data.isGrouped) {
      data.monthly.forEach((monthData) => {
        const mData = is44a ? monthData.form44a : monthData.form44b;
        if (mData.length > 0) {
          const title = `For the month of ${monthData.monthName}`;
          currentStartRow = appendExcelTable(sheet, title, mData, currentStartRow, is44a);
          currentStartRow += 2; // Gap
        }
      });
    } else {
      const monthName = new Date(startDate).toLocaleString('default', { month: 'long', year: 'numeric' });
      const title = `For the period of ${startDate} to ${endDate}`;
      appendExcelTable(sheet, title, tableData, currentStartRow, is44a);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Form44${is44a ? 'a' : 'b'}_Register.xlsx`;
    link.click();
    setShowExportMenu(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    
    const drawHeader = (docData) => {
      if (docData.pageNumber === 1) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        if (is44a) {
          doc.text("(KARNATAKA FOREST RULES, 1969)", doc.internal.pageSize.width / 2, 10, { align: 'center' });
          doc.text("FORM 44 [164(3)]", doc.internal.pageSize.width / 2, 15, { align: 'center' });
          doc.text("REGISTER SHOWING THE INTAKE OF THE TIMBER UNDERTAKEN FOR SAWING ON JOB WORK", doc.internal.pageSize.width / 2, 20, { align: 'center' });
          doc.text("IN-TAKE", doc.internal.pageSize.width / 2, 25, { align: 'center' });
        } else {
          doc.text("KARNATAKA FOREST DEPARTMENT", doc.internal.pageSize.width / 2, 10, { align: 'center' });
          doc.text("(KARNATAKA FOREST RULES, 1969)", doc.internal.pageSize.width / 2, 15, { align: 'center' });
          doc.text("FORM 44 [164(3)]", doc.internal.pageSize.width / 2, 20, { align: 'center' });
          doc.text("REGISTER SHOWING THE INTAKE OF THE TIMBER UNDERTAKEN FOR SAWING ON JOB WORK", doc.internal.pageSize.width / 2, 25, { align: 'center' });
          doc.text("Out-turn and delivery", doc.internal.pageSize.width / 2, 30, { align: 'center' });
        }
      }
    };

    const generateTable = (title, blockData, yPos) => {
      doc.text(title, doc.internal.pageSize.width / 2, yPos - 3, { align: 'center' });
      
      let head, body;
      if (is44a) {
        head = [[
          'Sl\nNo', 'Name & address of\nthe person entrust-\ning sawing on\njob work', 
          'whence\nreceived', 'Date of\nreceipt in\nthe saw-pit\nor sawmill', 
          'Pass or\npermit\nNo & date\nif any', 'Marks\nif any', 'Log No', 
          'Kind', lengthHeader, girthHeader, `Vol\n${volHeader}`, 'Signature of the\nperson entru-\nsting sawing\non job work'
        ]];

        body = blockData.map(row => [
          row.slNo, row.partyNameAddress, row.source, new Date(row.dateOfReceipt).toLocaleDateString(),
          row.permitNo, '', row.logNo, row.kind, formatLength(row.length), formatInchToMeter(row.girth), formatVol(row.volume), ''
        ]);
      } else {
        head = [[
          'Date of issue\nfor sawing', 'Number', lengthHeader, widthHeader, thicknessHeader, 
          `Volume\n${volHeader}`, 'Date of delivery\nof the sawn\nmaterials', 
          'Signature of the person\ntaking delivery of the\nsawn materials', 'Remarks'
        ]];

        body = blockData.map(row => [
          new Date(row.dateOfIssue).toLocaleDateString(), row.number, formatLength(row.length), 
          formatInchToMeter(row.width), formatInchToMeter(row.thickness), row.remarks === 'Reeper' ? '' : formatVol(row.volume), '', '', row.remarks
        ]);
      }

      doc.autoTable({
        startY: yPos,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: 8 },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: 8 },
        margin: { top: 35 }, 
        didDrawPage: drawHeader
      });
      return doc.lastAutoTable.finalY + 15;
    };

    let startY = 35;

    if (data.isGrouped) {
      let currentY = startY;
      data.monthly.forEach((monthData) => {
        const mData = is44a ? monthData.form44a : monthData.form44b;
        if (mData.length > 0) {
          const title = `For the month of ${monthData.monthName}`;
          currentY = generateTable(title, mData, currentY);
          
          if (currentY > doc.internal.pageSize.height - 40) {
            doc.addPage();
            currentY = 20;
          }
        }
      });
    } else {
      generateTable('', tableData, startY);
    }

    doc.save(`Form44${is44a ? 'a' : 'b'}_Register.pdf`);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center relative">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Official Registers</h1>
          <p className="text-gray-500">Transaction logbooks for Form 44a and 44b</p>
        </div>
        
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center space-x-2 px-4 py-2 bg-forest-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-forest-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Register</span>
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

          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showScientificName} 
              onChange={(e) => setShowScientificName(e.target.checked)} 
              className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
            />
            <span className="text-sm font-medium text-gray-700">Show Scientific Name</span>
          </label>
        </div>
      </div>

      {groupByMonth && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-center space-x-3">
          <span className="font-bold">Yearly Total Mode:</span>
          <span>The table below shows the combined register for {year}. When you click "Export Data", the resulting PDF/Excel file will automatically be split into 12 separate monthly tables.</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveForm('44a')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeForm === '44a'
                  ? 'border-forest-500 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Form 44a (In-Take)
            </button>
            <button
              onClick={() => setActiveForm('44b')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeForm === '44b'
                  ? 'border-forest-500 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Form 44b (Out-Turn)
            </button>
          </nav>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Fetching registers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  {is44a ? (
                    <tr>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Sl No</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Name & address of the person...</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">whence received</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Date of receipt...</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Pass or permit No...</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Marks if any</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Log No</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Kind</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r whitespace-pre-line">{lengthHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r whitespace-pre-line">{girthHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Vol {volHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b">Signature...</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Date of issue for sawing</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Number</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r whitespace-pre-line">{lengthHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r whitespace-pre-line">{widthHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r whitespace-pre-line">{thicknessHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Volume {volHeader}</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Date of delivery...</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b border-r">Signature...</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase border-b">Remarks</th>
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                        No records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, idx) => (
                      is44a ? (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.slNo}</td>
                          <td className="px-3 py-2 whitespace-pre-line text-sm text-center border-r">{row.partyNameAddress}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.source}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{new Date(row.dateOfReceipt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.permitNo}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r"></td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.logNo}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.kind}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{formatLength(row.length)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{formatInchToMeter(row.girth)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{formatVol(row.volume)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center"></td>
                        </tr>
                      ) : (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{new Date(row.dateOfIssue).toLocaleDateString()}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.number}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{formatLength(row.length)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{formatInchToMeter(row.width)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{formatInchToMeter(row.thickness)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r">{row.remarks === 'Reeper' ? '' : formatVol(row.volume)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r"></td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center border-r"></td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center">{row.remarks}</td>
                        </tr>
                      )
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Registers;

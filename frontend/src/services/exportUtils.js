/**
 * Export utilities for Payment Status reports
 * Supports: CSV, Excel (XLSX), PDF
 */

/**
 * Export data as CSV
 */
export const exportAsCSV = (data, filename, currencySymbol = '₹') => {
  const headers = ['#', 'Tenant Name', 'Email', 'Bed Info', `Rent (${currencySymbol})`, `Bill Amount (${currencySymbol})`, 'Status'];
  const rows = data.map((item, idx) => [
    idx + 1,
    item.name,
    item.email,
    item.bed_info,
    item.rent,
    item.billAmount,
    item.payment_status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

/**
 * Export data as Excel (XLSX)
 * Using: npm install xlsx
 */
export const exportAsExcel = async (data, filename, monthName, currencySymbol = '₹') => {
  try {
    // Import dynamically to reduce bundle size
    const XLSX = await import('xlsx');
    const xlsxLib = XLSX.default || XLSX;

    if (!xlsxLib) {
      throw new Error('XLSX library not loaded');
    }

    const formattedData = data.map((item, idx) => ({
      '#': idx + 1,
      'Tenant Name': item.name,
      'Email': item.email,
      'Bed Info': item.bed_info,
      [`Rent (${currencySymbol})`]: item.rent,
      [`Bill Amount (${currencySymbol})`]: item.billAmount,
      'Status': item.payment_status,
    }));

    // Create worksheet and workbook
    const sheet = xlsxLib.utils.json_to_sheet(formattedData);
    const workbook = xlsxLib.utils.book_new();
    xlsxLib.utils.book_append_sheet(workbook, sheet, monthName);

    // Set column widths for better readability
    const maxWidth = 20;
    const colWidths = Object.keys(formattedData[0] || {}).map(() => maxWidth);
    sheet['!cols'] = colWidths.map(w => ({ wch: w }));

    // Write file
    xlsxLib.writeFile(workbook, `${filename}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error(`Excel export failed: ${error.message}`);
  }
};

/**
 * Export data as PDF - Simple text-based approach
 * This is more reliable than html2canvas approach
 */
export const exportAsPDF = async (data, filename, monthName, summaryStats, currencySymbol = '₹') => {
  try {
    // Import jsPDF
    const jsPDFModule = await import('jspdf');
    const { jsPDF } = jsPDFModule;

    if (!jsPDF) {
      throw new Error('jsPDF library not loaded');
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 14;
    let yPosition = 15;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Status Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Month
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(String(monthName || ''), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;

    // Generated date
    const generatedDate = new Date().toLocaleDateString();
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Generated: ' + generatedDate, pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPosition += 12;

    // Summary Stats Box
    doc.setFillColor(230, 240, 250);
    doc.roundedRect(leftMargin, yPosition, pageWidth - leftMargin * 2, 14, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const statsY = yPosition + 9;
    const statsSpacing = (pageWidth - leftMargin * 2) / 4;
    doc.text('Total Tenants: ' + String(summaryStats.total), leftMargin + 8, statsY);
    doc.setTextColor(34, 139, 34);
    doc.text('Paid: ' + String(summaryStats.paid), leftMargin + statsSpacing + 8, statsY);
    doc.setTextColor(220, 50, 50);
    doc.text('Unpaid: ' + String(summaryStats.unpaid), leftMargin + statsSpacing * 2 + 8, statsY);
    doc.setTextColor(130, 130, 130);
    doc.text('NA: ' + String(summaryStats.na), leftMargin + statsSpacing * 3 + 8, statsY);
    doc.setTextColor(0, 0, 0);
    yPosition += 20;

    // Table column config
    const headers = ['#', 'Tenant Name', 'Email', 'Bed Info', `Rent (${currencySymbol})`, `Bill (${currencySymbol})`, 'Month', 'Status'];
    const colWidths = [10, 35, 50, 35, 25, 25, 30, 30];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const rowHeight = 8;

    // Draw header row
    const drawTableHeader = (y) => {
      doc.setFillColor(44, 62, 80);
      doc.rect(leftMargin, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let x = leftMargin;
      headers.forEach((header, idx) => {
        doc.text(header, x + 2, y + 5.5);
        x += colWidths[idx];
      });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      return y + rowHeight;
    };

    yPosition = drawTableHeader(yPosition);

    // Draw table rows
    doc.setFontSize(8);

    data.forEach((item, rowIdx) => {
      // Check if new page needed
      if (yPosition + rowHeight > pageHeight - 15) {
        doc.addPage();
        yPosition = 15;
        yPosition = drawTableHeader(yPosition);
      }

      // Alternate row colors
      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(leftMargin, yPosition, tableWidth, rowHeight, 'F');
      }

      // Draw bottom border for each row
      doc.setDrawColor(220, 220, 220);
      doc.line(leftMargin, yPosition + rowHeight, leftMargin + tableWidth, yPosition + rowHeight);

      // Row data — ensure ALL values are plain ASCII strings
      const rowData = [
        String(rowIdx + 1),
        String(item.name || ''),
        String(item.email || ''),
        String(item.bed_info || ''),
        currencySymbol + ' ' + String(item.rent || 0),
        currencySymbol + ' ' + String(item.billAmount || 0),
        String(monthName || ''),
        String(item.payment_status || ''),
      ];

      // Color the status cell
      doc.setFont('helvetica', 'normal');
      let x = leftMargin;
      rowData.forEach((cell, cellIdx) => {
        // Truncate text to fit column
        const maxChars = Math.floor(colWidths[cellIdx] / 2);
        const displayText = cell.length > maxChars ? cell.substring(0, maxChars) + '..' : cell;

        // Style status column
        if (cellIdx === 7) {
          if (cell === 'Paid') {
            doc.setTextColor(34, 139, 34);
            doc.setFont('helvetica', 'bold');
          } else if (cell === 'Bill Generated') {
            doc.setTextColor(220, 120, 0);
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setTextColor(130, 130, 130);
          }
        } else {
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', 'normal');
        }

        doc.text(displayText, x + 2, yPosition + 5.5);
        x += colWidths[cellIdx];
      });

      doc.setTextColor(0, 0, 0);
      yPosition += rowHeight;
    });

    // Footer on each page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(
        'Page ' + String(i) + ' of ' + String(totalPages),
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    doc.save(filename + '.pdf');
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('PDF export failed: ' + error.message);
  }
};

/**
 * Main export function that handles all formats
 */
export const exportPaymentData = async (format, data, monthName, summaryStats, currencySymbol = '₹') => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Payment_Status_${monthName.replace(/\s+/g, '_')}_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        exportAsCSV(data, filename, currencySymbol);
        return { success: true, message: 'CSV exported successfully' };

      case 'excel':
      case 'xlsx':
        await exportAsExcel(data, filename, monthName, currencySymbol);
        return { success: true, message: 'Excel file exported successfully' };

      case 'pdf':
        await exportAsPDF(data, filename, monthName, summaryStats, currencySymbol);
        return { success: true, message: 'PDF exported successfully' };

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error(`Error exporting as ${format}:`, error);
    throw error;
  }
};

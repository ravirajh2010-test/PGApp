/**
 * Export utilities for Payment Status reports
 * Supports: CSV, Excel (XLSX), PDF
 */

/**
 * Export data as CSV
 */
export const exportAsCSV = (data, filename) => {
  const headers = ['#', 'Tenant Name', 'Email', 'Bed Info', 'Rent (₹)', 'Bill Amount (₹)', 'Status'];
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
export const exportAsExcel = async (data, filename, monthName) => {
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
      'Rent (₹)': item.rent,
      'Bill Amount (₹)': item.billAmount,
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
export const exportAsPDF = async (data, filename, monthName, summaryStats) => {
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
    let yPosition = 15;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Payment Status Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Month & Date
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(String(monthName || 'N/A'), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;

    // Generated date
    const generatedDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${generatedDate}`, pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    // Summary Stats Box
    doc.setFillColor(230, 240, 250);
    doc.rect(15, yPosition, pageWidth - 30, 20, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Tenants: ${String(summaryStats.total)}`, 20, yPosition + 6);
    doc.text(`Paid: ${String(summaryStats.paid)}`, 80, yPosition + 6);
    doc.text(`Unpaid: ${String(summaryStats.unpaid)}`, 140, yPosition + 6);
    doc.text(`NA: ${String(summaryStats.na)}`, 200, yPosition + 6);
    yPosition += 25;

    // Table Headers
    const headers = ['#', 'Tenant Name', 'Email', 'Bed', 'Rent', 'Bill Amount', 'Status'];
    const colWidths = [8, 28, 32, 18, 16, 22, 24];
    const rowHeight = 6;

    doc.setFillColor(66, 139, 202);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);

    let xPosition = 15;
    headers.forEach((header, idx) => {
      doc.text(String(header), xPosition + 1, yPosition + 4, { maxWidth: colWidths[idx] - 2 });
      xPosition += colWidths[idx];
    });

    yPosition += rowHeight;

    // Table Body
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    data.forEach((item, rowIdx) => {
      // Check if new page needed
      if (yPosition + rowHeight > pageHeight - 15) {
        doc.addPage();
        yPosition = 15;

        // Repeat header on new page
        doc.setFillColor(66, 139, 202);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        xPosition = 15;
        headers.forEach((header, idx) => {
          doc.text(String(header), xPosition + 1, yPosition + 4, { maxWidth: colWidths[idx] - 2 });
          xPosition += colWidths[idx];
        });
        yPosition += rowHeight;

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
      }

      // Alternate row colors
      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(15, yPosition, pageWidth - 30, rowHeight, 'F');
      }

      // Row data - convert ALL values to strings
      const rowData = [
        String(rowIdx + 1),
        String(item.name || '').substring(0, 20),
        String(item.email || '').substring(0, 25),
        String(item.bed_info || ''),
        `₹${String(item.rent || 0)}`,
        `₹${String(item.billAmount || 0)}`,
        String(item.payment_status || ''),
      ];

      xPosition = 15;
      rowData.forEach((cell, cellIdx) => {
        doc.text(cell, xPosition + 1, yPosition + 4, { maxWidth: colWidths[cellIdx] - 2 });
        xPosition += colWidths[cellIdx];
      });

      yPosition += rowHeight;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(
        `Page ${String(i)} of ${String(totalPages)}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    doc.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
};

/**
 * Main export function that handles all formats
 */
export const exportPaymentData = async (format, data, monthName, summaryStats) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Payment_Status_${monthName.replace(/\s+/g, '_')}_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        exportAsCSV(data, filename);
        return { success: true, message: 'CSV exported successfully' };

      case 'excel':
      case 'xlsx':
        await exportAsExcel(data, filename, monthName);
        return { success: true, message: 'Excel file exported successfully' };

      case 'pdf':
        await exportAsPDF(data, filename, monthName, summaryStats);
        return { success: true, message: 'PDF exported successfully' };

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error(`Error exporting as ${format}:`, error);
    throw error;
  }
};

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
 * Requires: npm install xlsx
 */
export const exportAsExcel = async (data, filename, monthName) => {
  try {
    // Dynamically import xlsx to avoid bundle size issues
    const { default: XLSX } = await import('xlsx');

    const formattedData = data.map((item, idx) => ({
      '#': idx + 1,
      'Tenant Name': item.name,
      'Email': item.email,
      'Bed Info': item.bed_info,
      'Rent (₹)': item.rent,
      'Bill Amount (₹)': item.billAmount,
      'Status': item.payment_status,
    }));

    const sheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, monthName);

    // Set column widths
    const maxWidth = 20;
    const colWidths = Object.keys(formattedData[0] || {}).map(() => maxWidth);
    sheet['!cols'] = colWidths.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export Excel file. Please try CSV instead.');
  }
};

/**
 * Export data as PDF
 * Requires: npm install jspdf html2canvas
 */
export const exportAsPDF = async (data, filename, monthName, summaryStats) => {
  try {
    // Dynamically import jsPDF
    const { jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

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
    doc.text('Payment Status Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Month & Date
    doc.setFontSize(12);
    doc.text(`Month: ${monthName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;

    // Summary Stats
    doc.setFontSize(10);
    const summaryText = [
      `Total Tenants: ${summaryStats.total || 0}`,
      `Paid: ${summaryStats.paid || 0}`,
      `Unpaid: ${summaryStats.unpaid || 0}`,
      `NA: ${summaryStats.na || 0}`,
    ];
    summaryText.forEach((text, idx) => {
      doc.text(text, 15, yPosition + (idx * 5));
    });
    yPosition += summaryText.length * 5 + 5;

    // Table
    const headers = ['#', 'Tenant Name', 'Email', 'Bed', 'Rent', 'Bill Amount', 'Status'];
    const rows = data.map((item, idx) => [
      idx + 1,
      item.name.substring(0, 15), // Truncate long names
      item.email.substring(0, 18), // Truncate long emails
      item.bed_info,
      `₹${item.rent}`,
      `₹${item.billAmount}`,
      item.payment_status,
    ]);

    const tableStartY = yPosition;
    const rowHeight = 6;
    const colWidths = [8, 25, 28, 15, 15, 18, 20];

    // Draw table header
    doc.setFillColor(66, 139, 202); // Blue header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');

    let xPosition = 10;
    headers.forEach((header, idx) => {
      doc.rect(xPosition, tableStartY, colWidths[idx], rowHeight, 'F');
      doc.text(header, xPosition + 1, tableStartY + 4, { maxWidth: colWidths[idx] - 2 });
      xPosition += colWidths[idx];
    });

    // Draw table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    let currentY = tableStartY + rowHeight;
    rows.forEach((row, rowIdx) => {
      // Check if we need a new page
      if (currentY + rowHeight > pageHeight - 10) {
        doc.addPage();
        currentY = 10;

        // Add header on new page
        doc.setFillColor(66, 139, 202);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        xPosition = 10;
        headers.forEach((header, idx) => {
          doc.rect(xPosition, currentY, colWidths[idx], rowHeight, 'F');
          doc.text(header, xPosition + 1, currentY + 4, { maxWidth: colWidths[idx] - 2 });
          xPosition += colWidths[idx];
        });
        currentY += rowHeight;

        // Reset text color and font
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
      }

      // Alternate row colors
      if (rowIdx % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(10, currentY, pageWidth - 20, rowHeight, 'F');
      }

      xPosition = 10;
      row.forEach((cell, cellIdx) => {
        doc.text(cell, xPosition + 1, currentY + 4, { maxWidth: colWidths[cellIdx] - 2 });
        xPosition += colWidths[cellIdx];
      });

      currentY += rowHeight;
    });

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    for (let i = 1; i <= pageCount; i++) {
      doc.page = i;
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF file. Please try CSV or Excel instead.');
  }
};

/**
 * Main export function that handles all formats
 */
export const exportPaymentData = async (format, data, monthName, summaryStats) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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

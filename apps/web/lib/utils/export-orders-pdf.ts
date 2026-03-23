import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { EnrichedTrade } from '@paper-market/core';

type RGB = [number, number, number];

const GREEN:  RGB = [22, 163, 74];
const RED:    RGB = [220, 38, 38];
const SLATE9: RGB = [15, 23, 42];
const SLATE5: RGB = [100, 116, 139];
const SLATE4: RGB = [148, 163, 184];
const BLUE6:  RGB = [37, 99, 235];
const YELLOW: RGB = [234, 179, 8];

/** Plain number, no currency symbol — e.g. "1,420.00" */
const formatNum = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

/** For the summary pill only — needs "Rs." prefix */
const formatINR = (value: number): string => `Rs. ${formatNum(value)}`;

export const generateOrdersPDF = (
  trades: EnrichedTrade[],
  filename: string
): void => {
  const doc    = new jsPDF('l', 'pt', 'a4');
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 40;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('Paper Pro \u2014 Order History', MARGIN, 44);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE5);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm:ss')}`, MARGIN, 60);

  // ── Summary pill ──────────────────────────────────────────────────────────
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const totalPnL     = closedTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const profitCount  = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const lossCount    = closedTrades.filter((t) => (t.pnl ?? 0) < 0).length;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MARGIN, 72, PAGE_W - MARGIN * 2, 32, 4, 4, 'F');

  const sy = 92;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('Total:', MARGIN + 12, sy);
  doc.setFont('helvetica', 'normal');
  doc.text(String(trades.length), MARGIN + 48, sy);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('Realized P&L:', MARGIN + 120, sy);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...(totalPnL >= 0 ? GREEN : RED));
  doc.text(formatINR(totalPnL), MARGIN + 208, sy);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('Profit:', MARGIN + 390, sy);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREEN);
  doc.text(String(profitCount), MARGIN + 430, sy);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('Loss:', MARGIN + 460, sy);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...RED);
  doc.text(String(lossCount), MARGIN + 494, sy);

  // ── Table ─────────────────────────────────────────────────────────────────
  const rows = trades.map((trade) => {
    const isClosed = trade.status === 'CLOSED';
    const pnl      = trade.pnl ?? 0;

    return [
      format(new Date(trade.entryTime), 'dd MMM yy, HH:mm'),
      trade.symbol +
        (trade.expiryDate
          ? '\n' + format(new Date(trade.expiryDate), 'dd MMM yy')
          : ''),
      trade.side,
      String(trade.quantity),
      trade.orderType === 'MARKET' && trade.entryPrice === 0
        ? 'Market'
        : formatNum(trade.entryPrice),
      isClosed && trade.exitPrice != null ? formatNum(trade.exitPrice) : '\u2014',
      isClosed ? formatNum(pnl) : '\u2014',
      trade.status,
    ];
  });

  autoTable(doc, {
    startY: 116,
    // Column headers include "(Rs.)" on price columns so the unit is clear
    head: [['Date', 'Instrument', 'Side', 'Qty', 'Entry (Rs.)', 'Exit (Rs.)', 'P&L (Rs.)', 'Status']],
    body: rows,
    theme: 'grid',
    tableWidth: PAGE_W - MARGIN * 2,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: [241, 245, 249] as RGB,
      textColor: SLATE9,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      textColor: [30, 41, 59] as RGB,
      overflow: 'linebreak',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 96  },
      1: { cellWidth: 124 },
      2: { cellWidth: 38,  halign: 'center' },
      3: { cellWidth: 30,  halign: 'right'  },
      4: { cellWidth: 96,  halign: 'right'  },
      5: { cellWidth: 96,  halign: 'right'  },
      6: { cellWidth: 100, halign: 'right'  },
      7: { cellWidth: 62  },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as RGB,
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;

      // Side
      if (data.column.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        if (data.cell.raw === 'BUY')  data.cell.styles.textColor = GREEN;
        if (data.cell.raw === 'SELL') data.cell.styles.textColor = RED;
      }

      // P&L — use the original numeric value to decide colour, not the string
      if (data.column.index === 6 && String(data.cell.raw) !== '\u2014') {
        data.cell.styles.fontStyle = 'bold';
        const pnl = trades[data.row.index]?.pnl ?? 0;
        data.cell.styles.textColor = pnl >= 0 ? GREEN : RED;
      }

      // Status
      if (data.column.index === 7) {
        switch (data.cell.raw) {
          case 'OPEN':       data.cell.styles.textColor = BLUE6;  break;
          case 'CLOSED':     data.cell.styles.textColor = SLATE5; break;
          case 'FILLED':     data.cell.styles.textColor = GREEN;  break;
          case 'CANCELLED':
          case 'REJECTED':   data.cell.styles.textColor = SLATE4; break;
          case 'PENDING':
          case 'PROCESSING': data.cell.styles.textColor = YELLOW; break;
        }
      }
    },
    didDrawPage: (data) => {
      const pageH      = doc.internal.pageSize.getHeight();
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE4);
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, MARGIN, pageH - 16);
      doc.text('Paper Pro \u2014 paperpromarket.com', PAGE_W - MARGIN, pageH - 16, { align: 'right' });
    },
  });

  doc.save(filename);
};
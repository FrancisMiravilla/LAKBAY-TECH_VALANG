// PDF and Excel export for the Reports page. Both libraries are loaded on
// demand so they don't weigh down the main admin bundle.

export const SUMMARY_FIELDS = [
  { key: 'total_tourists', label: 'Registered tourists' },
  { key: 'new_users', label: 'New sign-ups' },
  { key: 'active_users', label: 'Active players' },
  { key: 'qr_checkins', label: 'QR check-ins' },
  { key: 'catches', label: 'Creature catches' },
  { key: 'ar_detections', label: 'AR exhibit detections' },
  { key: 'badges', label: 'Badges unlocked' },
  { key: 'revenue_php', label: 'Revenue (PHP)', money: true },
  { key: 'coins_sold', label: 'Coins sold' },
  { key: 'paid_transactions', label: 'Paid transactions' },
  { key: 'promotions_published', label: 'Published promotions (all time)' },
  { key: 'trivia_pending', label: 'Trivia awaiting review (all time)' },
];

export const TRIVIA_LABELS = { approved: 'Approved', pending: 'Pending review', rejected: 'Rejected' };
export const PROMO_LABELS = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending review',
  APPROVED_PENDING_PAYMENT: 'Approved, awaiting payment',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
};

const fmtNum = (n) => Number(n || 0).toLocaleString('en-PH');
const fmtMoney = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fileBase = (report) => `lakbay-report_${report.range.start}_to_${report.range.end}`;

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

const statusRows = (map, labels) =>
  Object.keys(labels).map((k) => [labels[k], map?.[k] || 0]);

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Rasterize a Recharts <svg> so it can be placed in the PDF.
async function svgToPng(svg, scale = 2) {
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL('image/png'), ratio: height / width };
}

/**
 * charts: [{ title, element (chart container), legend: [{label, color}] }]
 */
export async function exportPdf(report, charts) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const contentW = pageW - M * 2;
  const NAVY = [12, 36, 97];
  let y = 0;

  const ensure = (h) => {
    if (y + h > pageH - 16) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (text) => {
    ensure(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(text, M, y + 5);
    y += 9;
  };

  // Title band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setFillColor(251, 191, 36);
  doc.rect(0, 30, pageW, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('LAKBAY Tourism & Engagement Report', M, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `${prettyDate(report.range.start)} - ${prettyDate(report.range.end)}  (${report.range.days} days, Philippine time)`,
    M, 21,
  );
  doc.setFontSize(8.5);
  doc.text(`Generated ${new Date(report.generated_at).toLocaleString('en-PH')}`, M, 26.5);
  y = 38;

  // KPI tiles, 4 per row
  heading('Summary');
  const tileW = (contentW - 3 * 4) / 4;
  const tileH = 18;
  SUMMARY_FIELDS.forEach((f, i) => {
    const col = i % 4;
    if (col === 0) ensure(tileH + 4);
    const x = M + col * (tileW + 4);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, tileW, tileH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(f.label, tileW - 6), x + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    const v = report.summary[f.key];
    doc.text(f.money ? `PHP ${fmtMoney(v)}` : fmtNum(v), x + 3, y + 14.5);
    if (col === 3 || i === SUMMARY_FIELDS.length - 1) y += tileH + 4;
  });
  y += 2;

  // Charts
  for (const chart of charts) {
    const svg = chart.element?.querySelector('svg.recharts-surface');
    if (!svg) continue;
    const { data, ratio } = await svgToPng(svg);
    const h = Math.min(contentW * ratio, 95);
    const w = h / ratio;
    ensure(h + 18);
    heading(chart.title);
    doc.addImage(data, 'PNG', M, y, w, h);
    y += h + 2;
    if (chart.legend?.length > 1) {
      let lx = M;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      chart.legend.forEach((l) => {
        doc.setFillColor(l.color);
        doc.rect(lx, y + 0.5, 3, 3, 'F');
        doc.text(l.label, lx + 4.5, y + 3.2);
        lx += doc.getTextWidth(l.label) + 12;
      });
      y += 7;
    }
    y += 4;
  }

  // Tables
  const table = (title, head, body, columnStyles = {}) => {
    ensure(30);
    heading(title);
    if (!body.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('No data in this period.', M, y + 3);
      y += 10;
      return;
    }
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: M, right: M },
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles,
      didParseCell: (cell) => {
        if (cell.section === 'head' && columnStyles[cell.column.index]?.halign) {
          cell.cell.styles.halign = columnStyles[cell.column.index].halign;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  };
  const right = { halign: 'right' };

  table('Most visited places (QR check-ins)', ['#', 'Place', 'Check-ins'],
    report.top_spots.map((s, i) => [i + 1, s.name, fmtNum(s.checkins)]), { 0: { cellWidth: 10 }, 2: right });
  table('Activity mix', ['Activity', 'Count'],
    report.activity_types.map((a) => [a.label, fmtNum(a.count)]), { 1: right });
  table('Registered visitors', ['Visitor type', 'Players'],
    report.visitor_types.map((v) => [v.label, fmtNum(v.count)]), { 1: right });
  table('Top players by XP', ['Rank', 'In-game name', 'Visitor type', 'Level', 'XP'],
    report.top_players.map((p) => [p.rank, p.in_game_name, p.visitor_type, p.level, fmtNum(p.xp)]),
    { 0: { cellWidth: 14 }, 3: right, 4: right });
  table('Trivia questions (all time)', ['Status', 'Questions'],
    statusRows(report.trivia_status, TRIVIA_LABELS), { 1: right });
  table('Business promotions (all time)', ['Status', 'Promotions'],
    statusRows(report.promotion_status, PROMO_LABELS), { 1: right });
  table('Daily breakdown', ['Date', 'Check-ins', 'Catches', 'AR', 'New sign-ups', 'Revenue (PHP)'],
    report.daily.map((d) => [d.date, d.checkins, d.catches, d.ar, d.new_users, fmtMoney(d.revenue)]),
    { 1: right, 2: right, 3: right, 4: right, 5: right });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('LAKBAY - Zamboanga City cultural discovery', M, pageH - 8);
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 8, { align: 'right' });
  }

  doc.save(`${fileBase(report)}.pdf`);
}

export async function exportExcel(report) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LAKBAY Admin';
  wb.created = new Date();
  const MONEY = '"₱"#,##0.00';

  const sheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16, style: c.style }));
    ws.addRows(rows);
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C2461' } };
    head.alignment = { vertical: 'middle' };
    head.height = 20;
    return ws;
  };

  const summary = sheet('Summary', [
    { header: 'Metric', key: 'metric', width: 36 },
    { header: 'Value', key: 'value', width: 18 },
  ], [
    { metric: 'Report period', value: `${report.range.start} to ${report.range.end}` },
    { metric: 'Days', value: report.range.days },
    { metric: 'Generated', value: new Date(report.generated_at).toLocaleString('en-PH') },
    ...SUMMARY_FIELDS.map((f) => ({ metric: f.label, value: report.summary[f.key] })),
  ]);
  SUMMARY_FIELDS.forEach((f, i) => {
    if (f.money) summary.getCell(`B${i + 5}`).numFmt = MONEY;
  });

  sheet('Daily', [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'QR check-ins', key: 'checkins' },
    { header: 'Catches', key: 'catches' },
    { header: 'AR detections', key: 'ar' },
    { header: 'New sign-ups', key: 'new_users' },
    { header: 'Revenue', key: 'revenue', style: { numFmt: MONEY } },
  ], report.daily);

  sheet('Top Places', [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Place', key: 'name', width: 40 },
    { header: 'QR check-ins', key: 'checkins' },
  ], report.top_spots.map((s, i) => ({ rank: i + 1, ...s })));

  sheet('Activity', [
    { header: 'Activity', key: 'label', width: 24 },
    { header: 'Count', key: 'count' },
  ], report.activity_types);

  sheet('Visitors', [
    { header: 'Visitor type', key: 'label', width: 26 },
    { header: 'Players', key: 'count' },
  ], report.visitor_types);

  sheet('Top Players', [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'In-game name', key: 'in_game_name', width: 24 },
    { header: 'Visitor type', key: 'visitor_type', width: 14 },
    { header: 'Level', key: 'level', width: 10 },
    { header: 'XP', key: 'xp', width: 12 },
  ], report.top_players);

  sheet('Content Status', [
    { header: 'Area', key: 'area', width: 22 },
    { header: 'Status', key: 'status', width: 28 },
    { header: 'Count', key: 'count', width: 10 },
  ], [
    ...statusRows(report.trivia_status, TRIVIA_LABELS).map(([status, count]) => ({ area: 'Trivia questions', status, count })),
    ...statusRows(report.promotion_status, PROMO_LABELS).map(([status, count]) => ({ area: 'Promotions', status, count })),
  ]);

  const buf = await wb.xlsx.writeBuffer();
  saveBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileBase(report)}.xlsx`,
  );
}

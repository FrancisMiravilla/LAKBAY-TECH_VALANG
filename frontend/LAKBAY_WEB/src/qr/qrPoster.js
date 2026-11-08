// Printable A4 QR poster for a spot: branding, how-to steps and the QR code.
import QRCodeLib from 'qrcode';
import glyphUrl from '../assets/lakbay_icon_glyph.png';

const NAVY = '#0C2461';
const GOLD = '#FBBF24';
const TEAL = '#0F9D8A';
const INK = '#0F172A';
const MUTED = '#64748B';
const VINTA = ['#DC2626', '#FBBF24', '#16A34A', '#1A56DB', '#EA580C'];

const STEPS = [
  { title: 'Get the app', text: 'Download LAKBAY and sign in or create an account.' },
  { title: 'Open Scan & Discover', text: 'On the Explore tab, tap Scan & Discover.' },
  { title: 'Scan this code', text: 'Point your camera at the QR code until it reads.' },
  { title: 'Learn & earn', text: 'Unlock the story, take the quiz, earn XP and badges.' },
];

const toDataUrl = (url) =>
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));

function vintaStripe(doc, y, width, band = 1.3) {
  VINTA.forEach((color, i) => {
    doc.setFillColor(color);
    doc.rect(0, y + i * band, width, band, 'F');
  });
  return y + VINTA.length * band;
}

function pill(doc, text, cx, y, fill, color) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const w = doc.getTextWidth(text) + 12;
  doc.setFillColor(fill);
  doc.roundedRect(cx - w / 2, y, w, 8, 4, 4, 'F');
  doc.setTextColor(color);
  doc.text(text, cx, y + 5.4, { align: 'center' });
  return w;
}

/**
 * spot: { name, location, hook, xp_reward, required_level }
 */
export async function downloadQrPoster(code, spot) {
  const [{ jsPDF }, glyph, qr] = await Promise.all([
    import('jspdf'),
    toDataUrl(glyphUrl),
    QRCodeLib.toDataURL(code, {
      errorCorrectionLevel: 'H',
      width: 1400,
      margin: 1,
      color: { dark: NAVY, light: '#FFFFFF' },
    }),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cx = W / 2;
  const name = spot?.name || 'Cultural Spot';

  doc.setProperties({ title: `LAKBAY QR - ${name}`, creator: 'LAKBAY Admin' });

  // ── Header ──
  doc.setFillColor(NAVY);
  doc.rect(0, 0, W, 42, 'F');
  doc.addImage(glyph, 'PNG', 16, 8, 26, 26);
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('LAKBAY', 48, 22);
  doc.setTextColor(GOLD);
  doc.setFontSize(9);
  doc.text('ZAMBOANGA  ·  EXPLORE  ·  JOURNEY', 48, 30, { charSpace: 0.6 });
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Cultural Discovery Spot', W - 16, 22, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(GOLD);
  doc.text('Mabuhay!', W - 16, 29, { align: 'right' });
  let y = vintaStripe(doc, 42, W);

  // ── Title ──
  y += 13;
  doc.setTextColor(TEAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SCAN ME TO DISCOVER THE STORY OF', cx, y, { align: 'center', charSpace: 0.8 });

  doc.setTextColor(NAVY);
  doc.setFontSize(28);
  const nameLines = doc.splitTextToSize(name, W - 36).slice(0, 2);
  y += 12;
  doc.text(nameLines, cx, y, { align: 'center', lineHeightFactor: 1.1 });
  y += (nameLines.length - 1) * 11 + 3;

  if (spot?.hook) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(MUTED);
    const hook = doc.splitTextToSize(`“${spot.hook}”`, W - 50).slice(0, 2);
    y += 6;
    doc.text(hook, cx, y, { align: 'center' });
    y += (hook.length - 1) * 5.5;
  }
  if (spot?.location) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    y += 6;
    doc.text(spot.location, cx, y, { align: 'center' });
  }

  // ── QR card ──
  const qrSize = 100;
  const pad = 7;
  const card = qrSize + pad * 2;
  const cardX = cx - card / 2;
  const cardY = y + 6;
  doc.setFillColor('#FFFFFF');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.4);
  doc.roundedRect(cardX, cardY, card, card, 6, 6, 'FD');
  // corner brackets
  doc.setDrawColor(TEAL);
  doc.setLineWidth(1.6);
  const b = 12;
  const o = 3.5;
  [[cardX - o, cardY - o, 1, 1], [cardX + card + o, cardY - o, -1, 1],
    [cardX - o, cardY + card + o, 1, -1], [cardX + card + o, cardY + card + o, -1, -1]].forEach(([x0, y0, dx, dy]) => {
    doc.line(x0, y0, x0 + b * dx, y0);
    doc.line(x0, y0, x0, y0 + b * dy);
  });
  doc.addImage(qr, 'PNG', cardX + pad, cardY + pad, qrSize, qrSize);
  // logo in the middle (error correction H keeps it scannable)
  const logo = qrSize * 0.2;
  doc.setFillColor('#FFFFFF');
  doc.roundedRect(cx - logo / 2 - 1.5, cardY + card / 2 - logo / 2 - 1.5, logo + 3, logo + 3, 2.5, 2.5, 'F');
  doc.addImage(glyph, 'PNG', cx - logo / 2, cardY + card / 2 - logo / 2, logo, logo);
  y = cardY + card + 8;

  // ── Rewards ──
  const xpText = `+${spot?.xp_reward || 50} XP on your first scan`;
  const lvl = Number(spot?.required_level || 1);
  const lvlText = lvl > 1 ? `Unlocks at Level ${lvl}` : 'Open to all explorers';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const w1 = doc.getTextWidth(xpText) + 12;
  const w2 = doc.getTextWidth(lvlText) + 12;
  const gap = 6;
  const startX = cx - (w1 + w2 + gap) / 2;
  pill(doc, xpText, startX + w1 / 2, y, '#FEF3C7', '#92400E');
  pill(doc, lvlText, startX + w1 + gap + w2 / 2, y, '#CCFBF1', '#115E59');
  y += 16;

  // ── How to use ──
  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('HOW TO USE', cx, y, { align: 'center', charSpace: 0.8 });
  y += 5;
  const M = 16;
  const colW = (W - M * 2) / STEPS.length;
  STEPS.forEach((s, i) => {
    const colX = M + colW * i;
    const ccx = colX + colW / 2;
    doc.setFillColor(i % 2 ? TEAL : NAVY);
    doc.circle(ccx, y + 6, 5, 'F');
    doc.setTextColor('#FFFFFF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(i + 1), ccx, y + 8.1, { align: 'center' });
    doc.setTextColor(INK);
    doc.setFontSize(10);
    doc.text(s.title, ccx, y + 17, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(doc.splitTextToSize(s.text, colW - 8), ccx, y + 22, { align: 'center', lineHeightFactor: 1.25 });
    if (i < STEPS.length - 1) {
      doc.setDrawColor('#CBD5E1');
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([1, 1.2], 0);
      doc.line(ccx + 7, y + 6, ccx + colW - 7, y + 6);
      doc.setLineDashPattern([], 0);
    }
  });

  // ── Footer ──
  const footY = H - 16;
  vintaStripe(doc, footY - 6.5, W);
  doc.setFillColor(NAVY);
  doc.rect(0, footY, W, 16, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Please do not remove or cover this sign.', M, footY + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#CBD5E1');
  doc.text('LAKBAY  ·  Cultural Discovery in Zamboanga City', W - M, footY + 9.5, { align: 'right' });

  doc.save(`LAKBAY_${name.replace(/[^\w-]+/g, '_')}_QR_Poster.pdf`);
}

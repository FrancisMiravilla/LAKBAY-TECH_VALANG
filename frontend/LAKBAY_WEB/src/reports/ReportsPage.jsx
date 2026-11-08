import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { FileText, FileSpreadsheet, Download, RefreshCw, Users, QrCode, Sparkles, Eye, Coins, UserPlus, Activity, Wallet } from 'lucide-react';
import qrService from '../api/qrService';
import { exportExcel, exportPdf, PROMO_LABELS, TRIVIA_LABELS } from './reportExport';
import './ReportsPage.css';

// Categorical slots 1-3 (validated all-pairs for CVD in both modes). Single-measure
// charts use slot 1 only.
const PALETTE = {
  light: { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', grid: '#E2E8F0', axis: '#64748B' },
  dark: { s1: '#3987e5', s2: '#d95926', s3: '#199e70', grid: '#2A3152', axis: '#94A3B8' },
};

const PRESETS = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: '365', label: '12 months', days: 365 },
  { id: 'custom', label: 'Custom' },
];

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoLocal(d);
};
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
const fmt = (n) => Number(n || 0).toLocaleString('en-PH');
const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ChartTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rp-tooltip">
      {label && <div className="rp-tooltip-title">{/^\d{4}-\d{2}-\d{2}$/.test(label) ? shortDate(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="rp-tooltip-row">
          <span className="rp-swatch" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}</span>
          <strong>{money ? peso(p.value) : fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="rp-legend">
      {items.map((i) => (
        <span key={i.label}><span className="rp-swatch" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, chartRef, children, wide, empty }) {
  return (
    <div className={`rp-card ${wide ? 'rp-wide' : ''}`}>
      <div className="rp-card-head">
        <h4>{title}</h4>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div ref={chartRef}>
        {empty ? <div className="rp-empty">No data in this period.</div> : children}
      </div>
    </div>
  );
}

export default function ReportsPage({ appTheme = 'light' }) {
  const c = PALETTE[appTheme === 'dark' ? 'dark' : 'light'];
  const [preset, setPreset] = useState('30');
  const [range, setRange] = useState({ start: daysAgo(29), end: daysAgo(0) });
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading');
  const [exporting, setExporting] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const reqId = useRef(0);

  const dailyRef = useRef(null);
  const spotsRef = useRef(null);
  const visitorsRef = useRef(null);
  const activityRef = useRef(null);
  const signupsRef = useRef(null);
  const revenueRef = useRef(null);

  const fetchReport = (r) => {
    const id = ++reqId.current;
    return qrService.getReports(r)
      .then(({ data }) => {
        if (id !== reqId.current) return;
        setReport(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (id !== reqId.current) return;
        console.error(err);
        setStatus('error');
      });
  };

  useEffect(() => {
    fetchReport(range);
  }, [range]);

  const choosePreset = (p) => {
    setPreset(p.id);
    if (p.days) {
      setStatus('loading');
      setRange({ start: daysAgo(p.days - 1), end: daysAgo(0) });
    }
  };

  const changeCustom = (key, value) => {
    if (!value) return;
    setPreset('custom');
    setStatus('loading');
    setRange((r) => ({ ...r, [key]: value }));
  };

  const refresh = () => {
    setStatus('loading');
    fetchReport(range);
  };

  const s = report?.summary;
  const daily = useMemo(() => report?.daily || [], [report]);
  const totals = useMemo(() => daily.reduce(
    (t, d) => ({ checkins: t.checkins + d.checkins, catches: t.catches + d.catches, ar: t.ar + d.ar, users: t.users + d.new_users, revenue: t.revenue + d.revenue }),
    { checkins: 0, catches: 0, ar: 0, users: 0, revenue: 0 },
  ), [daily]);
  const visitorTotal = (report?.visitor_types || []).reduce((n, v) => n + v.count, 0);

  const activityLegend = [
    { label: 'QR check-ins', color: c.s1 },
    { label: 'Catches', color: c.s2 },
    { label: 'AR detections', color: c.s3 },
  ];
  const visitorColors = { local: c.s1, tourist: c.s2 };
  const visitorLegend = (report?.visitor_types || []).map((v) => ({ label: v.label, color: visitorColors[v.type] || c.s3 }));

  const runExport = async (kind) => {
    if (!report) return;
    setExporting(kind);
    try {
      if (kind === 'pdf') {
        await exportPdf(report, [
          { title: 'Daily activity', element: dailyRef.current, legend: activityLegend },
          { title: 'Most visited places', element: spotsRef.current },
          { title: 'Registered visitors', element: visitorsRef.current, legend: visitorLegend },
          { title: 'Activity mix', element: activityRef.current },
          { title: 'New sign-ups per day', element: signupsRef.current },
          { title: 'Revenue per day (PHP)', element: revenueRef.current },
        ]);
      } else {
        await exportExcel(report);
      }
    } catch (err) {
      console.error(err);
      alert(`Couldn't create the ${kind === 'pdf' ? 'PDF' : 'Excel'} file. Please try again.`);
    } finally {
      setExporting(null);
    }
  };

  const tiles = s ? [
    { label: 'Registered tourists', value: fmt(s.total_tourists), icon: Users, note: `${fmt(s.new_users)} new in period` },
    { label: 'Active players', value: fmt(s.active_users), icon: Activity, note: 'scanned, caught or found AR' },
    { label: 'QR check-ins', value: fmt(s.qr_checkins), icon: QrCode, note: 'first visits to a marker' },
    { label: 'Creature catches', value: fmt(s.catches), icon: Sparkles },
    { label: 'AR detections', value: fmt(s.ar_detections), icon: Eye },
    { label: 'New sign-ups', value: fmt(s.new_users), icon: UserPlus },
    { label: 'Revenue', value: peso(s.revenue_php), icon: Wallet, note: `${fmt(s.paid_transactions)} paid transactions` },
    { label: 'Coins sold', value: fmt(s.coins_sold), icon: Coins },
  ] : [];

  const axisProps = { stroke: c.axis, tick: { fill: c.axis, fontSize: 11 }, tickLine: false, axisLine: { stroke: c.grid } };
  const loading = status === 'loading';

  return (
    <section className="content-card rp-root" style={{ gap: '20px' }}>
      <div className="rp-toolbar">
        <h3 className="card-title">
          <FileText className="card-title-icon" size={18} />
          Tourism & Engagement Report
        </h3>
        <div className="rp-actions">
          <button type="button" className="btn btn-secondary" onClick={() => runExport('excel')} disabled={!report || loading || !!exporting}>
            <FileSpreadsheet size={16} /> {exporting === 'excel' ? 'Preparing…' : 'Download Excel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => runExport('pdf')} disabled={!report || loading || !!exporting}>
            <Download size={16} /> {exporting === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="rp-filters">
        <div className="rp-presets" role="group" aria-label="Report period">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`rp-chip ${preset === p.id ? 'active' : ''}`}
              onClick={() => choosePreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="rp-dates">
          <label>From <input type="date" value={range.start} max={range.end} onChange={(e) => changeCustom('start', e.target.value)} /></label>
          <label>To <input type="date" value={range.end} min={range.start} max={daysAgo(0)} onChange={(e) => changeCustom('end', e.target.value)} /></label>
          <button type="button" className="rp-icon-btn" onClick={refresh} title="Refresh" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'rp-spin' : ''} />
          </button>
        </div>
      </div>

      {status === 'error' && !report ? (
        <div className="rp-empty">Couldn't load the report. <button type="button" className="rp-link" onClick={refresh}>Try again</button></div>
      ) : !report ? (
        <div className="rp-tiles">{[...Array(8)].map((_, i) => <div key={i} className="rp-tile rp-skeleton" />)}</div>
      ) : (
        <div className={loading ? 'rp-dim' : ''}>
          {status === 'error' && <div className="rp-banner">Couldn't refresh. Showing the last loaded report.</div>}
          <p className="rp-period">
            {shortDate(report.range.start)}, {report.range.start.slice(0, 4)} – {shortDate(report.range.end)}, {report.range.end.slice(0, 4)}
            {' · '}{report.range.days} days · Philippine time
          </p>

          <div className="rp-tiles">
            {tiles.map((t) => (
              <div key={t.label} className="rp-tile">
                <div className="rp-tile-top"><span>{t.label}</span><t.icon size={16} /></div>
                <strong>{t.value}</strong>
                {t.note && <small>{t.note}</small>}
              </div>
            ))}
          </div>

          <div className="rp-grid">
            <ChartCard
              wide
              title="Daily activity"
              subtitle={`${fmt(totals.checkins)} check-ins · ${fmt(totals.catches)} catches · ${fmt(totals.ar)} AR`}
              chartRef={dailyRef}
            >
              <Legend items={activityLegend} />
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={daily} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="checkins" name="QR check-ins" stroke={c.s1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="catches" name="Catches" stroke={c.s2} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="ar" name="AR detections" stroke={c.s3} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Most visited places" subtitle="QR check-ins in period" chartRef={spotsRef} empty={!report.top_spots.length}>
              <ResponsiveContainer width="100%" height={Math.max(160, report.top_spots.length * 34 + 30)}>
                <BarChart data={report.top_spots} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={c.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...axisProps} />
                  <YAxis type="category" dataKey="name" width={130} {...axisProps} tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar dataKey="checkins" name="Check-ins" fill={c.s1} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Registered visitors" subtitle={`${fmt(visitorTotal)} tourists, all time`} chartRef={visitorsRef} empty={!visitorTotal}>
              <Legend items={visitorLegend} />
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={report.visitor_types}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                    label={({ percent, x, y, textAnchor }) => (
                      <text x={x} y={y} textAnchor={textAnchor} fill={c.axis} fontSize={12} fontWeight={600}>{`${Math.round(percent * 100)}%`}</text>
                    )}
                    labelLine={false}
                  >
                    {report.visitor_types.map((v) => <Cell key={v.type} fill={visitorColors[v.type] || c.s3} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Activity mix" subtitle="Logged player actions in period" chartRef={activityRef} empty={!report.activity_types.length}>
              <ResponsiveContainer width="100%" height={Math.max(150, report.activity_types.length * 40 + 30)}>
                <BarChart data={report.activity_types} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={c.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...axisProps} />
                  <YAxis type="category" dataKey="label" width={120} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar dataKey="count" name="Actions" fill={c.s1} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="New sign-ups per day" subtitle={`${fmt(totals.users)} in period`} chartRef={signupsRef}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar dataKey="new_users" name="Sign-ups" fill={c.s1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue per day" subtitle={`${peso(totals.revenue)} from paid transactions`} chartRef={revenueRef}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={(v) => `₱${fmt(v)}`} />
                  <Tooltip content={<ChartTooltip money />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar dataKey="revenue" name="Revenue" fill={c.s1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="rp-grid rp-tables">
            <div className="rp-card">
              <div className="rp-card-head"><h4>Top players by XP</h4></div>
              {report.top_players.length ? (
                <table className="rp-table">
                  <thead><tr><th>#</th><th>Player</th><th>Type</th><th className="num">Level</th><th className="num">XP</th></tr></thead>
                  <tbody>
                    {report.top_players.map((p) => (
                      <tr key={p.rank + p.in_game_name}>
                        <td>{p.rank}</td><td>{p.in_game_name}</td><td className="cap">{p.visitor_type}</td>
                        <td className="num">{p.level}</td><td className="num">{fmt(p.xp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="rp-empty">No players yet.</div>}
            </div>
            <div className="rp-card">
              <div className="rp-card-head"><h4>Content status</h4><span>all time</span></div>
              <table className="rp-table">
                <thead><tr><th>Trivia questions</th><th className="num">Count</th></tr></thead>
                <tbody>
                  {Object.entries(TRIVIA_LABELS).map(([k, label]) => (
                    <tr key={k}><td>{label}</td><td className="num">{fmt(report.trivia_status?.[k])}</td></tr>
                  ))}
                </tbody>
                <thead><tr><th>Business promotions</th><th className="num">Count</th></tr></thead>
                <tbody>
                  {Object.entries(PROMO_LABELS).map(([k, label]) => (
                    <tr key={k}><td>{label}</td><td className="num">{fmt(report.promotion_status?.[k])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rp-card">
            <button type="button" className="rp-toggle" onClick={() => setShowTable((v) => !v)}>
              {showTable ? 'Hide' : 'Show'} daily breakdown table
            </button>
            {showTable && (
              <div className="rp-table-scroll">
                <table className="rp-table">
                  <thead>
                    <tr><th>Date</th><th className="num">Check-ins</th><th className="num">Catches</th><th className="num">AR</th><th className="num">Sign-ups</th><th className="num">Revenue</th></tr>
                  </thead>
                  <tbody>
                    {[...daily].reverse().map((d) => (
                      <tr key={d.date}>
                        <td>{d.date}</td><td className="num">{fmt(d.checkins)}</td><td className="num">{fmt(d.catches)}</td>
                        <td className="num">{fmt(d.ar)}</td><td className="num">{fmt(d.new_users)}</td><td className="num">{peso(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

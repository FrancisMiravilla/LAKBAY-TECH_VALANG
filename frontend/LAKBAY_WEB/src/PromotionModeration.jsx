import React, { useState, useEffect, useMemo } from 'react';
import { promotionService } from './api/promotionService';
import '@google/model-viewer';
import { CheckCircle, XCircle, Clock, User, FileText, Image as ImageIcon, Box, Filter, ChevronLeft, ChevronRight, X, Bell, Archive, CalendarClock } from 'lucide-react';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const daysSince = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null);

const STATUS_STYLE = {
  PENDING_REVIEW: { bg: 'rgba(245, 158, 11, 0.2)', fg: '#fbbf24' },
  APPROVED_PENDING_PAYMENT: { bg: 'rgba(16, 185, 129, 0.2)', fg: '#34d399' },
  PUBLISHED: { bg: 'rgba(59, 130, 246, 0.2)', fg: '#60a5fa' },
  EXPIRED: { bg: 'rgba(100, 116, 139, 0.18)', fg: '#64748b' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.2)', fg: '#f87171' },
};
const statusStyle = (status) => STATUS_STYLE[status] || STATUS_STYLE.REJECTED;

// One-line expiry summary for live promotions; red once inside the reminder window.
function ExpiryLine({ promo, compact = false }) {
  if (promo.status !== 'PUBLISHED' || !promo.expires_at) return null;
  const due = promo.renewal_due;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: compact ? '8px' : 0, fontSize: compact ? '11.5px' : '13px', color: due ? '#dc2626' : 'var(--text-secondary)', fontWeight: due ? 600 : 500 }}>
      <CalendarClock size={compact ? 13 : 15} />
      <span>Expires {formatDate(promo.expires_at)} · {promo.days_left} day{promo.days_left === 1 ? '' : 's'} left</span>
    </div>
  );
}

export default function PromotionModeration() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Pagination states
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Increased items per page since cards are smaller

  // Modal State
  const [selectedPromo, setSelectedPromo] = useState(null);

  // Queue (everything still in play) vs Archive (expired, not renewed)
  const [view, setView] = useState('queue');
  const [remindingId, setRemindingId] = useState(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const data = await promotionService.getPromotions();
      const results = Array.isArray(data) ? data : (data.results || []);
      setPromotions(results);
    } catch (err) {
      setError('Failed to fetch promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await promotionService.approvePromotion(id);
      fetchPromotions();
      setSelectedPromo(null);
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const handleRemind = async (promo) => {
    const what = promo.status === 'EXPIRED'
      ? `"${promo.spot_name}" expired on ${formatDate(promo.expires_at)}. Remind the owner that they can renew it?`
      : `Remind the owner that "${promo.spot_name}" expires on ${formatDate(promo.expires_at)}?`;
    if (!window.confirm(`${what}\n\nThey get an in-app notice and an email.`)) return;
    setRemindingId(promo.id);
    try {
      const updated = await promotionService.remindPromotion(promo.id);
      setPromotions((list) => list.map((p) => (p.id === promo.id ? { ...p, ...updated } : p)));
      setSelectedPromo((sel) => (sel && sel.id === promo.id ? { ...sel, ...updated } : sel));
      alert(updated.emailed
        ? 'Reminder sent. The owner will see it in the app and by email.'
        : 'Reminder saved. The owner will see it in the app (the email could not be sent).');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to send the reminder.');
    } finally {
      setRemindingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason (optional):", "Inappropriate content");
    if (reason !== null) {
      try {
        await promotionService.rejectPromotion(id, reason);
        fetchPromotions();
        setSelectedPromo(null);
      } catch (err) {
        alert('Failed to reject');
      }
    }
  };

  // ─── Filter & Paginate ────────────────────────────────────────────────
  const queuePromotions = useMemo(() => promotions.filter(p => p.status !== 'EXPIRED'), [promotions]);
  const archivedPromotions = useMemo(
    () => promotions.filter(p => p.status === 'EXPIRED')
      .sort((a, b) => new Date(b.expires_at || 0) - new Date(a.expires_at || 0)),
    [promotions]
  );
  const expiringSoonCount = useMemo(() => queuePromotions.filter(p => p.status === 'PUBLISHED' && p.renewal_due).length, [queuePromotions]);

  const filteredPromotions = useMemo(() => {
    if (filterStatus === 'ALL') return queuePromotions;
    if (filterStatus === 'EXPIRING') return queuePromotions.filter(p => p.status === 'PUBLISHED' && p.renewal_due);
    return queuePromotions.filter(p => p.status === filterStatus);
  }, [queuePromotions, filterStatus]);

  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPromotions.slice(start, start + itemsPerPage);
  }, [filteredPromotions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);


  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--text-secondary)' }}>
      <Clock className="animate-spin" size={32} style={{ marginRight: '10px' }} /> Loading Moderation Queue...
    </div>
  );
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <section className="content-card" style={{ gap: '30px', paddingBottom: '40px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Box size={28} color="var(--accent-gold)" />
            Promotion Moderation Queue
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
            Review submissions, track monthly listings and remind owners before their promotion expires.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }} role="tablist" aria-label="Promotion lists">
            {[
              { id: 'queue', label: 'Queue', icon: Box, count: queuePromotions.length },
              { id: 'archive', label: 'Archive (not renewed)', icon: Archive, count: archivedPromotions.length },
            ].map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                className={`btn ${view === id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView(id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon size={14} /> {label}
                <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.85 }}>({count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Dropdown */}
        {view === 'queue' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Promotions</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED_PENDING_PAYMENT">Approved (Awaiting Payment)</option>
            <option value="PUBLISHED">Published</option>
            <option value="EXPIRING">Expiring soon ({expiringSoonCount})</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        )}
      </div>

      {view === 'archive' && (
        <ArchiveList
          promotions={archivedPromotions}
          remindingId={remindingId}
          onRemind={handleRemind}
          onOpen={setSelectedPromo}
        />
      )}

      {view === 'queue' && (<>
      
      {/* Smaller Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {paginatedPromotions.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ opacity: 0.5, marginBottom: '16px', margin: '0 auto' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-secondary)' }}>All caught up!</h3>
            <p>No promotions found for the selected filter.</p>
          </div>
        ) : (
          paginatedPromotions.map((promo) => (
            <div 
              key={promo.id} 
              onClick={() => setSelectedPromo(promo)}
              style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 25px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }}
            >
              
              {/* Media Thumbnail */}
              <div style={{ width: '100%', height: '160px', backgroundColor: 'var(--subtle-bg)', position: 'relative' }}>
                {promo.model_3d_file ? (
                  <model-viewer
                    src={promo.model_3d_file}
                    auto-rotate
                    camera-controls
                    style={{ width: '100%', height: '100%', outline: 'none' }}
                  />
                ) : promo.image_file ? (
                  <img src={promo.image_file} alt="Promotion" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <ImageIcon size={32} opacity={0.5} />
                  </div>
                )}
              </div>

              {/* Minimal Content */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)' }}>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-title)', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{promo.spot_name}</h3>
                
                {/* Status Badge */}
                <div style={{
                  display: 'inline-block',
                  padding: '4px 8px', borderRadius: '12px',
                  backgroundColor: statusStyle(promo.status).bg,
                  color: statusStyle(promo.status).fg,
                  fontSize: '11px', fontWeight: 'bold', alignSelf: 'flex-start',
                  border: `1px solid ${statusStyle(promo.status).fg}`
                }}>
                  {promo.status.replace(/_/g, ' ')}
                </div>
                <ExpiryLine promo={promo} compact />
                {promo.status === 'PUBLISHED' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={(e) => { e.stopPropagation(); handleRemind(promo); }}
                    disabled={remindingId === promo.id}
                    style={{ marginTop: '10px', fontSize: '11.5px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    <Bell size={13} /> {remindingId === promo.id ? 'Sending…' : 'Send reminder'}
                  </button>
                )}
                {promo.reminder_sent_at && (
                  <span style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Reminded {formatDate(promo.reminder_sent_at)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '30px' }}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color: currentPage === 1 ? 'var(--text-muted)' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color: currentPage === totalPages ? 'var(--text-muted)' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
      </>)}

      {/* Details Modal */}
      {selectedPromo && (
        <div 
          onClick={() => setSelectedPromo(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px', backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              width: '100%', maxWidth: '600px', 
              maxHeight: '90vh', overflowY: 'auto',
              border: '1px solid var(--border-color)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#ffffff' }}>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '20px' }}>{selectedPromo.spot_name}</h3>
              <button onClick={() => setSelectedPromo(null)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Media */}
            <div style={{ width: '100%', height: '300px', backgroundColor: '#0a0a0a' }}>
              {selectedPromo.model_3d_file ? (
                <model-viewer
                  src={selectedPromo.model_3d_file}
                  auto-rotate
                  camera-controls
                  style={{ width: '100%', height: '100%', outline: 'none' }}
                />
              ) : selectedPromo.image_file ? (
                <img src={selectedPromo.image_file} alt="Promotion" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No Media Attached
                </div>
              )}
            </div>

            {/* Photos (up to 3, cover first) */}
            {(() => {
              const photos = [selectedPromo.image_file, selectedPromo.image_file2, selectedPromo.image_file3].filter(Boolean);
              if (photos.length === 0) return null;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px 20px 0', backgroundColor: '#ffffff' }}>
                  {photos.map((src, i) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer" title={i === 0 ? 'Cover photo' : `Photo ${i + 1}`}
                      style={{ display: 'block', aspectRatio: '4 / 3', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                      <img src={src} alt={i === 0 ? 'Cover photo' : `Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              );
            })()}

            {/* Body */}
            <div style={{ padding: '24px', flex: 1, backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                  <User size={16} />
                  <strong style={{ color: '#111827' }}>Submitted by:</strong> {selectedPromo.user_name}
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: '12px',
                  backgroundColor: statusStyle(selectedPromo.status).bg,
                  color: statusStyle(selectedPromo.status).fg,
                  fontSize: '12px', fontWeight: 'bold'
                }}>
                  {selectedPromo.status.replace(/_/g, ' ')}
                </div>
              </div>
              
              <div style={{ color: '#374151', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedPromo.description}
              </div>

              {(selectedPromo.status === 'PUBLISHED' || selectedPromo.status === 'EXPIRED') && (
                <div style={{ marginBottom: '24px', padding: '14px', borderRadius: '10px', border: '1px solid var(--card-border)', backgroundColor: 'var(--subtle-bg)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12.5px', color: '#4b5563' }}>
                    <div><div style={{ fontWeight: 700, color: '#111827' }}>Published</div>{formatDate(selectedPromo.published_at)}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{selectedPromo.status === 'EXPIRED' ? 'Expired' : 'Expires'}</div>
                      {formatDate(selectedPromo.expires_at)}
                      {selectedPromo.status === 'PUBLISHED' && ` (${selectedPromo.days_left} day${selectedPromo.days_left === 1 ? '' : 's'} left)`}
                    </div>
                    <div><div style={{ fontWeight: 700, color: '#111827' }}>Last reminder</div>{formatDate(selectedPromo.reminder_sent_at)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleRemind(selectedPromo)}
                    disabled={remindingId === selectedPromo.id}
                    style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Bell size={15} />
                    {remindingId === selectedPromo.id ? 'Sending…' : selectedPromo.status === 'EXPIRED' ? 'Remind owner to renew' : 'Send expiry reminder'}
                  </button>
                </div>
              )}

              {selectedPromo.rejection_reason && (
                <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
                  <p style={{ color: '#ef4444', margin: 0, fontSize: '14px' }}><strong>Rejection Reason:</strong> {selectedPromo.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              {selectedPromo.status === 'PENDING_REVIEW' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button 
                    onClick={() => handleReject(selectedPromo.id)}
                    className="btn"
                    style={{ flex: 1, padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                  >
                    <XCircle size={18} /> Reject
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedPromo.id)}
                    className="btn"
                    style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Promotions whose paid month ended without a renewal. They are hidden from the app.
function ArchiveList({ promotions, remindingId, onRemind, onOpen }) {
  if (promotions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <Archive size={44} style={{ opacity: 0.5, margin: '0 auto 12px' }} />
        <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-secondary)' }}>No expired promotions</h3>
        <p>Promotions that are not renewed after their month ends will be listed here.</p>
      </div>
    );
  }
  return (
    <div className="table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Place / Business</th>
            <th>Owner</th>
            <th>Expired on</th>
            <th>Days since</th>
            <th>Last reminder</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {promotions.map((p) => (
            <tr key={p.id}>
              <td>
                <button type="button" onClick={() => onOpen(p)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-title)', fontWeight: 600, textAlign: 'left' }}>
                  {p.spot_name}
                </button>
              </td>
              <td>{p.user_name}</td>
              <td>{formatDate(p.expires_at)}</td>
              <td>{daysSince(p.expires_at) ?? '—'}</td>
              <td>{formatDate(p.reminder_sent_at)}</td>
              <td style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary" onClick={() => onRemind(p)} disabled={remindingId === p.id}
                  style={{ fontSize: '12px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={13} /> {remindingId === p.id ? 'Sending…' : 'Remind to renew'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

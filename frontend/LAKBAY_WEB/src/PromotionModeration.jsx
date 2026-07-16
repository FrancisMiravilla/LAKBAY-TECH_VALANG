import React, { useState, useEffect, useMemo } from 'react';
import { promotionService } from './api/promotionService';
import '@google/model-viewer';
import { CheckCircle, XCircle, Clock, User, FileText, Image as ImageIcon, Box, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const filteredPromotions = useMemo(() => {
    if (filterStatus === 'ALL') return promotions;
    return promotions.filter(p => p.status === filterStatus);
  }, [promotions, filterStatus]);

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
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Box size={28} color="var(--accent-gold)" />
            Promotion Moderation Queue
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
            Review user-submitted 3D models and promotional content before they are approved for payment.
          </p>
        </div>
        
        {/* Filter Dropdown */}
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
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>
      
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
              <div style={{ width: '100%', height: '160px', backgroundColor: '#111', position: 'relative' }}>
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
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{promo.spot_name}</h3>
                
                {/* Status Badge */}
                <div style={{ 
                  display: 'inline-block',
                  padding: '4px 8px', borderRadius: '12px', 
                  backgroundColor: promo.status === 'PENDING_REVIEW' ? 'rgba(245, 158, 11, 0.2)' : 
                                   promo.status === 'APPROVED_PENDING_PAYMENT' ? 'rgba(16, 185, 129, 0.2)' : 
                                   promo.status === 'PUBLISHED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: promo.status === 'PENDING_REVIEW' ? '#fbbf24' : 
                         promo.status === 'APPROVED_PENDING_PAYMENT' ? '#34d399' : 
                         promo.status === 'PUBLISHED' ? '#60a5fa' : '#f87171',
                  fontSize: '11px', fontWeight: 'bold', alignSelf: 'flex-start',
                  border: `1px solid ${
                    promo.status === 'PENDING_REVIEW' ? '#fbbf24' : 
                    promo.status === 'APPROVED_PENDING_PAYMENT' ? '#34d399' : 
                    promo.status === 'PUBLISHED' ? '#60a5fa' : '#f87171'
                  }`
                }}>
                  {promo.status.replace(/_/g, ' ')}
                </div>
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

            {/* Body */}
            <div style={{ padding: '24px', flex: 1, backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                  <User size={16} />
                  <strong style={{ color: '#111827' }}>Submitted by:</strong> {selectedPromo.user_name}
                </div>
                <div style={{ 
                  padding: '4px 10px', borderRadius: '12px', 
                  backgroundColor: selectedPromo.status === 'PENDING_REVIEW' ? 'rgba(245, 158, 11, 0.2)' : 
                                   selectedPromo.status === 'APPROVED_PENDING_PAYMENT' ? 'rgba(16, 185, 129, 0.2)' : 
                                   selectedPromo.status === 'PUBLISHED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: selectedPromo.status === 'PENDING_REVIEW' ? '#fbbf24' : 
                         selectedPromo.status === 'APPROVED_PENDING_PAYMENT' ? '#34d399' : 
                         selectedPromo.status === 'PUBLISHED' ? '#60a5fa' : '#f87171',
                  fontSize: '12px', fontWeight: 'bold'
                }}>
                  {selectedPromo.status.replace(/_/g, ' ')}
                </div>
              </div>
              
              <div style={{ color: '#374151', marginBottom: '24px', fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedPromo.description}
              </div>

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

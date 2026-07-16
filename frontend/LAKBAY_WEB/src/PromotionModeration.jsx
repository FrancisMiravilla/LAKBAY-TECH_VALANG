import React, { useState, useEffect, useMemo } from 'react';
import { promotionService } from './api/promotionService';
import '@google/model-viewer';
import { CheckCircle, XCircle, Clock, User, FileText, Image as ImageIcon, Box, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PromotionModeration() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Pagination states
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const data = await promotionService.getPromotions();
      // Ensure data is an array (in case backend adds DRF pagination later)
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

  // Reset page when filter changes
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
    <section className="content-card" style={{ gap: '30px', paddingBottom: '40px' }}>
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
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {paginatedPromotions.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ opacity: 0.5, marginBottom: '16px', margin: '0 auto' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-secondary)' }}>All caught up!</h3>
            <p>No promotions found for the selected filter.</p>
          </div>
        ) : (
          paginatedPromotions.map((promo) => (
            <div key={promo.id} style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              
              {/* Media Section (Image or 3D Model) */}
              <div style={{ width: '100%', height: '280px', backgroundColor: '#111', position: 'relative' }}>
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
                    No Media Attached
                  </div>
                )}
                
                {/* Status Badge */}
                <div style={{ 
                  position: 'absolute', top: '12px', right: '12px', 
                  padding: '6px 12px', borderRadius: '20px', 
                  backgroundColor: promo.status === 'PENDING_REVIEW' ? 'rgba(245, 158, 11, 0.9)' : 
                                   promo.status === 'APPROVED_PENDING_PAYMENT' ? 'rgba(16, 185, 129, 0.9)' : 
                                   promo.status === 'PUBLISHED' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  color: 'white', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px', backdropFilter: 'blur(4px)'
                }}>
                  {promo.status.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Content Section */}
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '20px' }}>{promo.spot_name}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
                  <User size={16} />
                  <strong>Submitted by:</strong> {promo.user_name}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                  <FileText size={16} style={{ marginTop: '3px', flexShrink: 0 }} />
                  <p style={{ margin: 0, lineHeight: 1.5 }}>{promo.description}</p>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                  {promo.status === 'PENDING_REVIEW' ? (
                    <>
                      <button 
                        onClick={() => handleReject(promo.id)}
                        className="btn"
                        style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(promo.id)}
                        className="btn"
                        style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none' }}
                      >
                        <CheckCircle size={18} /> Approve
                      </button>
                    </>
                  ) : (
                    <button className="btn" style={{ flex: 1, opacity: 0.5, cursor: 'not-allowed' }} disabled>
                      Action Completed
                    </button>
                  )}
                </div>
                
                {promo.rejection_reason && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', borderRadius: '4px' }}>
                    <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}><strong>Rejection Reason:</strong> {promo.rejection_reason}</p>
                  </div>
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
    </section>
  );
}

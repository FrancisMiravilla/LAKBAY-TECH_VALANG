import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Image as ImageIcon, Save, X } from 'lucide-react';

const CoinBundleManagement = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coins_amount: '',
    price_php: '',
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchBundles();
  }, []);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/api/promotions/coin-bundles/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBundles(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching bundles:', err);
      setError('Failed to fetch coin bundles.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (bundle = null) => {
    if (bundle) {
      setEditingBundle(bundle);
      setFormData({
        name: bundle.name,
        description: bundle.description || '',
        coins_amount: bundle.coins_amount,
        price_php: bundle.price_php,
        is_active: bundle.is_active,
      });
      setImagePreview(bundle.image);
    } else {
      setEditingBundle(null);
      setFormData({
        name: '',
        description: '',
        coins_amount: '',
        price_php: '',
        is_active: true,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBundle(null);
    setError(null);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (editingBundle) {
        await axios.patch(`${API_URL}/api/promotions/coin-bundles/${editingBundle.id}/`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.post(`${API_URL}/api/promotions/coin-bundles/`, data, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      handleCloseForm();
      fetchBundles();
    } catch (err) {
      console.error('Error saving bundle:', err);
      setError('Failed to save coin bundle. Please check your inputs.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coin bundle?')) {
      try {
        const token = localStorage.getItem('accessToken');
        await axios.delete(`${API_URL}/api/promotions/coin-bundles/${id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBundles();
      } catch (err) {
        console.error('Error deleting bundle:', err);
        setError('Failed to delete coin bundle.');
      }
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #ccc)',
    background: 'var(--bg-color, #fff)',
    color: 'var(--text-primary, #333)',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
  };

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    border: 'none',
    transition: 'background 0.2s ease'
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>Coin Bundles Management</h2>
        <button 
          onClick={() => handleOpenForm()}
          style={{ ...buttonStyle, background: '#3b82f6', color: '#fff' }}
        >
          <Plus size={18} /> Add Bundle
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '15px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {isFormOpen ? (
        <div style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid var(--border-color, #eaeaea)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '20px' }}>{editingBundle ? 'Edit Coin Bundle' : 'Create New Coin Bundle'}</h3>
            <button onClick={handleCloseForm} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #666)', padding: '5px' }}>
              <X size={28} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            {/* Left side: Big Image */}
            <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '100%', 
                aspectRatio: '1', 
                backgroundColor: 'var(--bg-color, #f9fafb)', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden',
                border: '2px dashed var(--border-color, #d1d5db)',
                marginBottom: '20px'
              }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Bundle Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={80} color="var(--text-secondary, #9ca3af)" />
                )}
              </div>
              <label style={{ ...buttonStyle, background: 'var(--bg-color, #f3f4f6)', color: 'var(--text-primary, #374151)', border: '1px solid var(--border-color, #d1d5db)' }}>
                <ImageIcon size={18} /> Select Coin Image
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Right side: Fields */}
            <div style={{ flex: '2', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Bundle Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                  style={inputStyle}
                  placeholder="e.g. Starter Pack"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Describe the bundle..."
                />
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Coins Amount</label>
                  <input 
                    type="number" 
                    value={formData.coins_amount} 
                    onChange={(e) => setFormData({...formData, coins_amount: e.target.value})} 
                    required 
                    min="1"
                    style={inputStyle}
                    placeholder="e.g. 100"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Price (PHP)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.price_php} 
                    onChange={(e) => setFormData({...formData, price_php: e.target.value})} 
                    required 
                    min="0"
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', padding: '10px 0' }}>
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.is_active} 
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="isActive" style={{ fontWeight: '600', fontSize: '16px', cursor: 'pointer' }}>Active (Available for purchase)</label>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color, #eaeaea)' }}>
                <button type="button" onClick={handleCloseForm} style={{ ...buttonStyle, background: 'transparent', color: 'var(--text-primary, #333)', border: '1px solid var(--border-color, #ccc)' }}>
                  Cancel
                </button>
                <button type="submit" style={{ ...buttonStyle, background: '#10b981', color: '#fff' }}>
                  <Save size={18} /> Save Bundle
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '25px' }}>
          {loading ? <p>Loading...</p> : bundles.length === 0 ? <p>No coin bundles found.</p> : bundles.map(bundle => (
            <div 
              key={bundle.id} 
              style={{ 
                display: 'flex', 
                background: 'var(--card-bg, #fff)', 
                borderRadius: '12px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)', 
                overflow: 'hidden',
                border: '1px solid var(--border-color, #eaeaea)',
              }}
            >
              {/* Left side: details */}
              <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>{bundle.name}</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary, #6b7280)', flex: 1, lineHeight: '1.5' }}>
                  {bundle.description || 'No description provided.'}
                </p>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px' }}>
                    🪙 {bundle.coins_amount}
                  </span>
                  <span style={{ fontWeight: '700', color: '#10b981', fontSize: '16px' }}>
                    ₱ {bundle.price_php}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color, #eaeaea)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', background: bundle.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: bundle.is_active ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                    {bundle.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => handleOpenForm(bundle)} 
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Edit Bundle"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(bundle.id)} 
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Bundle"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right side: image covering the full right side */}
              <div style={{ width: '160px', background: 'var(--bg-color, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--border-color, #eaeaea)' }}>
                {bundle.image ? (
                  <img src={bundle.image} alt={bundle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={40} color="var(--text-secondary, #9ca3af)" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoinBundleManagement;

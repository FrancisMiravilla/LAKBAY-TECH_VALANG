import React, { useState, useEffect } from 'react';
import { promotionService } from './api/promotionService';
import { Settings, Sliders, RefreshCw, Save, Plus, X } from 'lucide-react';

function SettingCard({ setting, handleSave, savingKey }) {
  const [localVal, setLocalVal] = useState(setting.value);

  useEffect(() => {
    setLocalVal(setting.value);
  }, [setting.value]);

  const isSaving = savingKey === setting.key;
  const isUnchanged = localVal.toString() === setting.value.toString();

  return (
    <div style={{ 
      backgroundColor: 'var(--bg-card)', 
      borderRadius: '12px', 
      padding: '24px', 
      border: '1px solid var(--border-color)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Accent Line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: 'var(--accent-primary)' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: `var(--bg-dark)`, color: 'var(--accent-primary)' }}>
            <Sliders size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{setting.key}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{setting.description || 'No description provided.'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
        <input 
          type="number" 
          value={localVal} 
          onChange={(e) => setLocalVal(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
        />
        
        <button 
          onClick={() => handleSave(setting.key, localVal)}
          disabled={isSaving || isUnchanged}
          style={{ 
            padding: '12px 20px', 
            backgroundColor: (isSaving || isUnchanged) ? 'var(--bg-dark)' : 'var(--accent-primary)', 
            color: (isSaving || isUnchanged) ? 'var(--text-muted)' : '#ffffff', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: (isSaving || isUnchanged) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Save
        </button>
      </div>
    </div>
  );
}

export default function PromotionSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  // Create form state
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState(0);
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await promotionService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, value) => {
    setSavingKey(key);
    try {
      await promotionService.updateSetting(key, value.toString());
      fetchSettings();
    } catch (err) {
      alert(`Failed to update ${key}`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreate = async () => {
    if (!newKey.trim()) return alert("Configuration Key is required.");
    setIsSubmitting(true);
    try {
      await promotionService.createSetting({
        key: newKey.trim().toUpperCase(),
        value: parseInt(newValue, 10),
        description: newDescription.trim()
      });
      setIsCreating(false);
      setNewKey('');
      setNewValue(0);
      setNewDescription('');
      fetchSettings();
    } catch (err) {
      alert("Failed to create configuration. Ensure the key is unique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--text-secondary)' }}>
      <RefreshCw className="animate-spin" size={32} style={{ marginRight: '10px' }} /> Loading Configurations...
    </div>
  );

  return (
    <section className="content-card" style={{ gap: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Settings size={28} color="var(--accent-primary)" />
            System Configurations
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
            Manage core engine variables, economy pricing, and gamification rules in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => setIsCreating(!isCreating)}>
            {isCreating ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Configuration</>}
          </button>
          <button className="btn btn-primary" onClick={fetchSettings} disabled={savingKey !== null}>
            <RefreshCw size={16} /> Sync
          </button>
        </div>
      </div>

      {isCreating && (
        <div style={{ 
          backgroundColor: 'var(--bg-dark)', 
          borderRadius: '12px', 
          padding: '24px', 
          border: '1px solid var(--accent-primary)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 2fr auto',
          gap: '16px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Key (e.g. PROMOTION_COST)</label>
            <input 
              type="text" 
              value={newKey} 
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="KEY_NAME"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Value (Number)</label>
            <input 
              type="number" 
              value={newValue} 
              onChange={(e) => setNewValue(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>Description</label>
            <input 
              type="text" 
              value={newDescription} 
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What does this do?"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <button 
            onClick={handleCreate}
            disabled={isSubmitting || !newKey}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: (isSubmitting || !newKey) ? 'var(--bg-card)' : 'var(--accent-primary)', 
              color: (isSubmitting || !newKey) ? 'var(--text-muted)' : '#ffffff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: (isSubmitting || !newKey) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              height: '45px'
            }}
          >
            {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
            Create
          </button>
        </div>
      )}
      
      {settings.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No configurations found in the database.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
          {settings.map((setting) => (
            <SettingCard 
              key={setting.id || setting.key} 
              setting={setting} 
              handleSave={handleSave} 
              savingKey={savingKey} 
            />
          ))}
        </div>
      )}
    </section>
  );
}

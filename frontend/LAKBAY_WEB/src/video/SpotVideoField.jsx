import { useState } from 'react';
import { Film, Link2, Upload, X } from 'lucide-react';
import { MAX_VIDEO_MB, VIDEO_ACCEPT, uploadSpotVideo } from './uploadVideo';

const muted = { fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 };

// Optional video presentation for a QR place: upload a file (sent straight to
// Cloudinary) or paste a direct video link. Value is the video URL ('' = none).
export default function SpotVideoField({ value, onChange, onUploadingChange, accent = 'var(--accent-primary)' }) {
  const [mode, setMode] = useState('upload');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const uploading = progress !== null;

  const startUpload = async (file) => {
    if (!file || uploading) return;
    setError('');
    setProgress(0);
    onUploadingChange?.(true);
    try {
      onChange(await uploadSpotVideo(file, setProgress));
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
    }
  };

  const applyLink = () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError('Paste a full video link that starts with https://');
      return;
    }
    setError('');
    setLink('');
    onChange(url);
  };

  const tab = (key, Icon, label) => (
    <button type="button" onClick={() => { setMode(key); setError(''); }} disabled={uploading}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
        border: `1px solid ${mode === key ? accent : 'var(--card-border)'}`,
        background: mode === key ? `${accent}14` : 'transparent',
        color: mode === key ? accent : 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      }}>
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label" style={{ color: accent, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Film size={15} /> Video Presentation <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
      </label>

      {value ? (
        <div style={{ border: `2px solid ${accent}`, borderRadius: '10px', overflow: 'hidden', background: '#000' }}>
          <video src={value} controls preload="metadata" style={{ width: '100%', maxHeight: '260px', display: 'block' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--card-bg, #fff)' }}>
            <span style={{ flex: 1, fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => onChange('')}>
              <X size={13} /> Remove video
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {tab('upload', Upload, 'Upload video')}
            {tab('link', Link2, 'Paste a link')}
          </div>

          {mode === 'upload' ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); startUpload(e.dataTransfer.files?.[0]); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                height: '130px', borderRadius: '10px', cursor: uploading ? 'default' : 'pointer',
                border: `2px dashed ${dragOver ? accent : 'var(--card-border)'}`,
                background: dragOver ? `${accent}0D` : 'transparent',
              }}>
              <input type="file" accept={VIDEO_ACCEPT} style={{ display: 'none' }} disabled={uploading}
                onChange={(e) => { startUpload(e.target.files?.[0]); e.target.value = ''; }} />
              {uploading ? (
                <div style={{ width: '70%', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-title)', marginBottom: '8px' }}>Uploading video… {progress}%</div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'var(--card-border)', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: accent, transition: 'width 0.2s' }} />
                  </div>
                </div>
              ) : (
                <>
                  <Film size={30} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    Drag and drop a video (MP4, MOV or WebM, max {MAX_VIDEO_MB} MB)<br />or click to upload
                  </span>
                </>
              )}
            </label>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="url" className="form-input" placeholder="https://…/presentation.mp4" value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }} />
              <button type="button" className="btn btn-primary" onClick={applyLink}>Use link</button>
            </div>
          )}
        </>
      )}

      {error && <p style={{ ...muted, color: '#DC2626', fontWeight: 600 }}>{error}</p>}
      <p style={muted}>
        Plays for explorers right after they scan this place's QR code, before the guide's story. An AI-made or a real
        video both work — keep it short (1–3 minutes). Links must point to the video file itself (e.g. .mp4); YouTube or
        Facebook page links will not play. Leave empty to show only the story and narration.
      </p>
    </div>
  );
}

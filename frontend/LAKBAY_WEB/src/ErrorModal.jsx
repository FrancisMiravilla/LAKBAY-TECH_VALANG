import { useEffect, useRef } from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, X } from 'lucide-react';

/**
 * ErrorModal — Global error/alert modal for LAKBAY Web Admin
 *
 * Props:
 *   visible   {boolean}          — controls visibility
 *   type      {'error'|'warning'|'info'|'success'}  — flavour (default 'error')
 *   title     {string}           — bold heading
 *   message   {string}           — body copy
 *   onClose   {() => void}       — called when modal is dismissed
 *   onConfirm {() => void}       — optional confirm action (shows dual-button layout)
 *   confirmLabel {string}        — confirm button label  (default 'OK')
 *   cancelLabel  {string}        — cancel button label   (default 'Close')
 */
export default function ErrorModal({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = 'OK',
  cancelLabel = 'Close',
}) {
  const closeBtnRef = useRef(null);

  // Focus trap — move focus into modal when it opens
  useEffect(() => {
    if (visible && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [visible]);

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const config = {
    error: {
      icon: XCircle,
      glowClass: 'em-glow-error',
      iconClass: 'em-icon-error',
      ringClass: 'em-ring-error',
      badgeClass: 'em-badge-error',
      label: title || 'Error',
    },
    warning: {
      icon: AlertTriangle,
      glowClass: 'em-glow-warning',
      iconClass: 'em-icon-warning',
      ringClass: 'em-ring-warning',
      badgeClass: 'em-badge-warning',
      label: title || 'Warning',
    },
    info: {
      icon: Info,
      glowClass: 'em-glow-info',
      iconClass: 'em-icon-info',
      ringClass: 'em-ring-info',
      badgeClass: 'em-badge-info',
      label: title || 'Information',
    },
    success: {
      icon: CheckCircle,
      glowClass: 'em-glow-success',
      iconClass: 'em-icon-success',
      ringClass: 'em-ring-success',
      badgeClass: 'em-badge-success',
      label: title || 'Success',
    },
  };

  const { icon: Icon, glowClass, iconClass, ringClass, badgeClass, label } = config[type] ?? config.error;

  return (
    <div
      className="em-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="em-title"
      aria-describedby="em-message"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Backdrop blur layer */}
      <div className="em-backdrop" />

      <div className="em-card">
        {/* Decorative top glow strip */}
        <div className={`em-top-glow ${glowClass}`} />

        {/* Close X button */}
        <button
          className="em-x-btn"
          onClick={onClose}
          aria-label="Close modal"
          ref={closeBtnRef}
        >
          <X size={16} />
        </button>

        {/* Icon ring */}
        <div className={`em-icon-ring ${ringClass}`}>
          <Icon className={`em-icon ${iconClass}`} size={28} />
        </div>

        {/* Badge pill */}
        <span className={`em-badge ${badgeClass}`}>{type.toUpperCase()}</span>

        {/* Title */}
        <h2 id="em-title" className="em-title">{label}</h2>

        {/* Message */}
        <p id="em-message" className="em-message">{message}</p>

        {/* Divider */}
        <div className="em-divider" />

        {/* Buttons */}
        <div className={`em-btn-row ${onConfirm ? 'em-dual' : ''}`}>
          {onConfirm && (
            <button className="em-btn em-btn-ghost" onClick={onClose}>
              {cancelLabel}
            </button>
          )}
          <button
            className={`em-btn em-btn-solid ${iconClass}`}
            onClick={onConfirm ?? onClose}
          >
            {onConfirm ? confirmLabel : cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

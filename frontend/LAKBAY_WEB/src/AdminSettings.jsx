import { useState } from 'react';
import { User, Mail, KeyRound, Palette, LogOut, Eye, EyeOff, Check } from 'lucide-react';
import { authService } from './api/authService';
import PromotionSettings from './PromotionSettings';

const errorText = (err, fallback) =>
  err?.response?.data?.detail
  || (err?.response?.data && typeof err.response.data === 'object'
    ? Object.values(err.response.data).flat().join(' ')
    : null)
  || fallback;

function Notice({ notice }) {
  if (!notice) return null;
  const ok = notice.type === 'success';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      style={{
        fontSize: '12.5px', padding: '10px 12px', borderRadius: 'var(--radius-control, 8px)',
        color: ok ? 'var(--success)' : 'var(--danger)',
        background: ok ? 'rgba(20, 150, 127, 0.08)' : 'rgba(229, 72, 77, 0.06)',
        border: `1px solid ${ok ? 'rgba(20, 150, 127, 0.25)' : 'rgba(229, 72, 77, 0.25)'}`,
        display: 'flex', alignItems: 'center', gap: '8px',
      }}
    >
      {ok && <Check size={14} />}
      {notice.text}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder }) {
  const [shown, setShown] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        className="form-input"
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        style={{ paddingRight: '40px', width: '100%' }}
        required
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex',
        }}
      >
        {shown ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="content-card" style={{ gap: '16px' }}>
      <div>
        <h3 className="card-title">
          <Icon className="card-title-icon" size={18} />
          {title}
        </h3>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const field = { display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 };

export default function AdminSettings({ currentUser, onUserUpdated, theme, onThemeChange, onLogout }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState(null);

  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState(null);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState(null);

  const roleLabel = currentUser?.role === 'tourist_guide' ? 'Tour Guide' : 'Administrator';

  const saveProfile = async (e) => {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      setProfileNotice({ type: 'error', text: 'Enter your name.' });
      return;
    }
    setProfileBusy(true);
    setProfileNotice(null);
    try {
      const user = await authService.updateProfile({ full_name: name });
      onUserUpdated?.(user);
      setProfileNotice({ type: 'success', text: 'Your name was updated.' });
    } catch (err) {
      setProfileNotice({ type: 'error', text: errorText(err, 'Your name could not be saved. Try again.') });
    } finally {
      setProfileBusy(false);
    }
  };

  const saveEmail = async (e) => {
    e.preventDefault();
    setEmailBusy(true);
    setEmailNotice(null);
    try {
      const res = await authService.changeEmail(emailForm.password, emailForm.newEmail.trim());
      onUserUpdated?.({ ...currentUser, email: res.email });
      setEmailForm({ newEmail: '', password: '' });
      setEmailNotice({ type: 'success', text: `Your sign-in email is now ${res.email}.` });
    } catch (err) {
      setEmailNotice({ type: 'error', text: errorText(err, 'Your email could not be changed. Try again.') });
    } finally {
      setEmailBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwNotice({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }
    setPwBusy(true);
    setPwNotice(null);
    try {
      await authService.changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setPwNotice({ type: 'success', text: 'Your password was changed. Other devices were signed out.' });
    } catch (err) {
      setPwNotice({ type: 'error', text: errorText(err, 'Your password could not be changed. Try again.') });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        <SettingsCard icon={User} title="Profile" subtitle="How your name appears in the staff portal.">
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={field}>
              <label className="form-label" htmlFor="settings-name">Full name</label>
              <input id="settings-name" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={field}>
                <span className="form-label">Email</span>
                <span style={{ fontSize: '13px', color: 'var(--text-title)', overflowWrap: 'anywhere' }}>{currentUser?.email}</span>
              </div>
              <div style={field}>
                <span className="form-label">Role</span>
                <span style={{ fontSize: '13px', color: 'var(--text-title)' }}>{roleLabel}</span>
              </div>
            </div>
            <Notice notice={profileNotice} />
            <div>
              <button type="submit" className="btn btn-primary" disabled={profileBusy || fullName.trim() === (currentUser?.full_name || '')}>
                {profileBusy ? 'Saving…' : 'Save name'}
              </button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard icon={Mail} title="Change email" subtitle="The email you use to sign in. Confirm with your current password.">
          <form onSubmit={saveEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={field}>
              <label className="form-label" htmlFor="settings-new-email">New email</label>
              <input
                id="settings-new-email" className="form-input" type="email" autoComplete="email" required
                value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
              />
            </div>
            <div style={field}>
              <label className="form-label" htmlFor="settings-email-password">Current password</label>
              <PasswordInput
                id="settings-email-password" autoComplete="current-password"
                value={emailForm.password} onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
              />
            </div>
            <Notice notice={emailNotice} />
            <div>
              <button type="submit" className="btn btn-primary" disabled={emailBusy}>
                {emailBusy ? 'Saving…' : 'Change email'}
              </button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard icon={KeyRound} title="Change password" subtitle="Use at least 8 characters. Other devices are signed out afterwards.">
          <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={field}>
              <label className="form-label" htmlFor="settings-current-password">Current password</label>
              <PasswordInput
                id="settings-current-password" autoComplete="current-password"
                value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              />
            </div>
            <div style={field}>
              <label className="form-label" htmlFor="settings-new-password">New password</label>
              <PasswordInput
                id="settings-new-password" autoComplete="new-password"
                value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
              />
            </div>
            <div style={field}>
              <label className="form-label" htmlFor="settings-confirm-password">Confirm new password</label>
              <PasswordInput
                id="settings-confirm-password" autoComplete="new-password"
                value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              />
            </div>
            <Notice notice={pwNotice} />
            <div>
              <button type="submit" className="btn btn-primary" disabled={pwBusy}>
                {pwBusy ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </form>
        </SettingsCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SettingsCard icon={Palette} title="Appearance" subtitle="Theme for this browser.">
            <div style={{ display: 'flex', gap: '8px' }} role="radiogroup" aria-label="Theme">
              {['light', 'dark'].map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onThemeChange?.(t)}
                  style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard icon={LogOut} title="Session" subtitle="Sign out of the staff portal on this browser.">
            <div>
              <button type="button" className="btn btn-secondary" onClick={onLogout} style={{ color: 'var(--danger)' }}>
                <LogOut size={14} style={{ marginRight: '6px' }} />
                Sign out
              </button>
            </div>
          </SettingsCard>
        </div>
      </div>

      {currentUser?.role !== 'tourist_guide' && <PromotionSettings />}
    </div>
  );
}

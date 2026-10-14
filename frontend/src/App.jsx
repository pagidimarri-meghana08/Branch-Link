import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  ShieldCheck,
  Building,
  Bell,
  LogOut,
  Upload,
  CheckCircle,
  XCircle,
  Mic,
  MicOff,
  VideoOff,
  RefreshCw,
  PlusCircle,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Check,
  User as UserIcon,
  PhoneCall,
  Lock,
  Users,
  Building2,
  ChevronRight,
  ExternalLink,
  Settings
} from 'lucide-react';

const tok = () => localStorage.getItem('t');
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const getWsUrl = (apptId, token) => {
  const customWs = import.meta.env.VITE_WS_URL;
  if (customWs) {
    const clean = customWs.replace(/\/$/, '').replace(/^http/, 'ws');
    return `${clean}/ws?appt=${apptId}&token=${token}`;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws?appt=${apptId}&token=${token}`;
};

async function api(path, { method = 'GET', body, form } = {}) {
  const h = {};
  let b;
  if (tok()) h.Authorization = 'Bearer ' + tok();
  if (form) {
    b = form;
  } else if (body) {
    h['Content-Type'] = 'application/json';
    b = JSON.stringify(body);
  }
  const r = await fetch(API_BASE + '/api' + path, { method, headers: h, body: b });
  if (r.status === 401 && tok()) {
    localStorage.clear();
    location.reload();
  }
  const d = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (!r.ok) throw new Error(d?.message || 'Request failed');
  return d;
}

const act = (id, a, body) => api(`/appointments/${id}/${a}`, { method: 'POST', body });
const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const isTimeReached = iso => (iso ? new Date().getTime() >= new Date(iso).getTime() : false);

const PURPOSES = [
  'Document verification',
  'KYC update',
  'Loan enquiry',
  'Account service request',
  'Grievance redressal',
  'Wealth Advisory / Investment',
  'Other'
];

const COLOR = {
  BOOKED: 'amber',
  CONFIRMED: 'blue',
  IN_PROGRESS: 'green',
  COMPLETED: 'gray',
  CANCELLED: 'red',
  EXPIRED: 'red',
  MISSED: 'red',
  PENDING: 'amber',
  VERIFIED: 'green',
  REJECTED: 'red'
};

const Badge = ({ s }) => (
  <span className={'status-badge ' + (COLOR[s] || 'gray')}>
    {s ? s.replace('_', ' ') : ''}
  </span>
);

const LIVE = ['CONFIRMED', 'IN_PROGRESS'];

function useLoad(path, every = 0) {
  const [d, setD] = useState([]);
  const load = useCallback(() => api(path).then(setD).catch(() => {}), [path]);
  useEffect(() => {
    load();
    if (!every) return;
    const i = setInterval(load, every);
    return () => clearInterval(i);
  }, [load, every]);
  return [d, load];
}

// Inactivity Auto-logout hook: 5 minutes timeout
function useInactivityTimeout(onTimeout, timeoutMs = 5 * 60 * 1000) {
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [resetTimer]);
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('u') || 'null'));
  const [inactivityNotice, setInactivityNotice] = useState(false);

  const logout = useCallback((reason = '') => {
    localStorage.clear();
    setUser(null);
    if (reason === 'inactivity') {
      setInactivityNotice(true);
    }
  }, []);

  // Monitor user activity when logged in (5-minute inactivity timeout)
  useInactivityTimeout(() => {
    if (user) {
      logout('inactivity');
    }
  }, 5 * 60 * 1000);

  const onAuth = s => {
    localStorage.setItem('t', s.token);
    localStorage.setItem('u', JSON.stringify(s.user));
    setUser(s.user);
    setInactivityNotice(false);
  };

  return user ? (
    <Shell user={user} setUser={setUser} logout={logout} />
  ) : (
    <AuthPage onAuth={onAuth} inactivityNotice={inactivityNotice} />
  );
}

function AuthPage({ onAuth, inactivityNotice }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { email: f.email, password: f.password }
      });
      onAuth(res);
    } catch (x) {
      setErr(x.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <div className="auth-header">
          <div className="brand-icon">
            <Building size={24} />
          </div>
          <h1>BranchLink</h1>
          <p>Virtual Branch Assistance & Secure Video Banking</p>
        </div>

        {inactivityNotice && (
          <div className="inactivity-banner">
            <AlertTriangle size={18} />
            <span>You were automatically logged out after 5 minutes of inactivity for your security.</span>
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          <label>
            Email Address
            <input
              placeholder="name@branchlink.com"
              type="email"
              required
              value={f.email}
              onChange={e => setF({ ...f, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              placeholder="••••••••"
              type="password"
              required
              value={f.password}
              onChange={e => setF({ ...f, password: e.target.value })}
            />
          </label>

          {err && (
            <div
              style={{
                color: 'var(--danger)',
                fontSize: 13,
                background: 'var(--danger-bg)',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--danger-border)'
              }}
            >
              {err}
            </div>
          )}

          <button className="btn-primary" disabled={loading} style={{ marginTop: 8, padding: 12 }}>
            {loading ? 'Authenticating...' : 'Sign In to Banking Portal'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            padding: '12px 14px',
            background: 'var(--bank-navy-light)',
            borderRadius: 8,
            fontSize: 12.5,
            color: 'var(--bank-navy)',
            border: '1px solid #bfdbfe'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>ℹ️ Customer Account Activation</div>
          Customer accounts are provisioned directly by your base branch staff. Contact your branch officer to activate access.
        </div>

        <div className="auth-demo-credentials">
          <div className="demo-header">Demo Accounts (Tap to Quick Fill):</div>
          <div className="demo-chips-grid">
            <button
              type="button"
              className="demo-chip"
              onClick={() => setF({ email: 'admin@branchlink.com', password: 'admin123' })}
            >
              <b>👑 Admin</b>
              <span>admin@branchlink.com</span>
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => setF({ email: 'staff1@branchlink.com', password: 'staff123' })}
            >
              <b>👔 Staff (Vijayawada)</b>
              <span>staff1@branchlink.com</span>
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => setF({ email: 'staff2@branchlink.com', password: 'staff123' })}
            >
              <b>👔 Staff (Warangal)</b>
              <span>staff2@branchlink.com</span>
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => setF({ email: 'customer@branchlink.com', password: 'demo123' })}
            >
              <b>👤 Customer</b>
              <span>customer@branchlink.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BellNotice({ user, onNavigate }) {
  const [n, reload] = useLoad('/notices', 4000);
  const [open, setOpen] = useState(false);
  const unseen = n.filter(x => !x.seen).length;

  const toggle = () => {
    if (open && unseen) api('/notices/read', { method: 'POST' }).then(reload);
    setOpen(!open);
  };

  const handleNoticeClick = x => {
    let target = x.target;
    if (!target) {
      const msg = (x.message || '').toLowerCase();
      if (msg.includes('document') || msg.includes('file') || msg.includes('verification')) {
        target = 'Documents';
      } else if (msg.includes('customer')) {
        target = user.role === 'STAFF' ? 'Customers' : 'Staff';
      } else if (msg.includes('branch')) {
        target = 'Branches';
      } else {
        target = user.role === 'STAFF' ? 'Dashboard' : user.role === 'ADMIN' ? 'Appointments' : 'Appointments';
      }
    } else {
      if (target === 'APPOINTMENTS') target = user.role === 'STAFF' ? 'Dashboard' : 'Appointments';
      if (target === 'DOCUMENTS') target = 'Documents';
      if (target === 'CUSTOMERS') target = user.role === 'STAFF' ? 'Customers' : 'Staff';
    }

    api('/notices/read', { method: 'POST' }).then(reload);
    setOpen(false);
    if (target && onNavigate) onNavigate(target);
  };

  return (
    <div className="notification-container">
      <button className="icon-btn" onClick={toggle} title="Notifications">
        <Bell size={20} />
        {unseen > 0 && <span className="badge-count">{unseen}</span>}
      </button>

      {open && (
        <div className="notification-menu">
          <div className="notification-header">
            <span>Notifications</span>
            {unseen > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: 99
                }}
              >
                {unseen} new
              </span>
            )}
          </div>
          {n.length ? (
            n.map(x => (
              <div
                key={x.id}
                className={'notification-item ' + (x.seen ? '' : 'unread')}
                onClick={() => handleNoticeClick(x)}
                title="Tap to jump to section"
              >
                <div>{x.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(x.ts)}</span>
                  <span className="notification-link-hint">
                    View section <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No notifications yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileModal({ user, onClose, onUserUpdated }) {
  const [f, setF] = useState({
    name: user.name || '',
    email: user.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (f.newPassword) {
      if (!f.currentPassword) {
        setErr('Current password is required to change password.');
        return;
      }
      if (f.newPassword.length < 6) {
        setErr('New password must be at least 6 characters.');
        return;
      }
      if (f.newPassword !== f.confirmPassword) {
        setErr('New password and confirmation do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api('/user/profile', {
        method: 'POST',
        body: {
          name: f.name,
          email: f.email,
          currentPassword: f.currentPassword || undefined,
          newPassword: f.newPassword || undefined
        }
      });
      localStorage.setItem('u', JSON.stringify(res.user));
      if (res.token) localStorage.setItem('t', res.token);
      onUserUpdated(res.user);
      setMsg('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (x) {
      setErr(x.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="user-avatar" style={{ width: 34, height: 34 }}>
              <UserIcon size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Edit Personal Profile</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Role: {user.role}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><XCircle size={18} /></button>
        </div>

        {err && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            {err}
          </div>
        )}
        {msg && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            {msg}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Full Name
            <input
              required
              value={f.name}
              onChange={e => setF({ ...f, name: e.target.value })}
            />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Email Address
            <input
              type="email"
              required
              value={f.email}
              onChange={e => setF({ ...f, email: e.target.value })}
            />
          </label>

          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 8, paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)' }}>
              Security & Password (Optional)
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Current Password
              <input
                type="password"
                placeholder="Enter current password if changing"
                value={f.currentPassword}
                onChange={e => setF({ ...f, currentPassword: e.target.value })}
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                New Password
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={f.newPassword}
                  onChange={e => setF({ ...f, newPassword: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Confirm Password
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={f.confirmPassword}
                  onChange={e => setF({ ...f, confirmPassword: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Shell({ user, setUser, logout }) {
  const isAdmin = user.role === 'ADMIN';
  const isStaff = user.role === 'STAFF';

  const tabs = isAdmin
    ? [
        { id: 'Overview', icon: ShieldCheck, label: 'Overview' },
        { id: 'Branches', icon: Building2, label: 'Base Branches' },
        { id: 'Staff', icon: Users, label: 'Branch Staff' },
        { id: 'Appointments', icon: Calendar, label: 'Appointments' },
        { id: 'Documents', icon: FileText, label: 'Documents' },
        { id: 'Audit', icon: ShieldCheck, label: 'Audit Trail' }
      ]
    : isStaff
    ? [
        { id: 'Dashboard', icon: Calendar, label: 'Dashboard' },
        { id: 'Customers', icon: Users, label: 'Branch Customers' },
        { id: 'Slots', icon: Clock, label: 'Slot Capacity' },
        { id: 'Documents', icon: FileText, label: 'Verification Queue' },
        { id: 'Audit', icon: ShieldCheck, label: 'Audit Trail' }
      ]
    : [
        { id: 'Appointments', icon: Calendar, label: 'My Appointments' },
        { id: 'Book', icon: PlusCircle, label: 'Book Assistance' },
        { id: 'Documents', icon: FileText, label: 'My Documents' }
      ];

  const [tab, setTab] = useState(tabs[0].id);
  const [call, setCall] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const [appts, reloadA] = useLoad('/appointments', 3000);
  const [docs, reloadD] = useLoad('/documents', 4000);
  const [branches, reloadB] = useLoad('/branches');
  const branch = branches.find(b => b.id === user.branchId);

  const count = s => appts.filter(a => s.includes(a.status)).length;

  const handleJoinCall = a => {
    if (!isTimeReached(a.startTime)) {
      alert(`The call cannot be opened before the scheduled booking time (${fmt(a.startTime)}). Please rejoin at the appointed time.`);
      return;
    }
    setCall(a);
  };

  return (
    <>
      <div className="top-security-bar">
        <div className="top-security-content">
          <span className="security-icon-text">🔒 256-Bit SSL Encrypted Banking Session</span>
          <span className="security-divider">•</span>
          <span className="security-cert">Regulated Virtual Branch Network</span>
          <span className="security-status-pill">● System Secure</span>
        </div>
      </div>

      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Building size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-title">BranchLink</span>
            <span className="brand-tag">{isAdmin ? 'Admin Console' : isStaff ? 'Branch Portal' : 'Customer Portal'}</span>
          </div>
        </div>

        <div className="header-user-section">
          <div className="user-profile-badge">
            <div className="user-avatar">{user.name ? user.name[0].toUpperCase() : 'U'}</div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-role-branch">
                {user.role} {branch ? `• ${branch.name}` : ''}
              </span>
            </div>
          </div>

          <button className="profile-btn" onClick={() => setShowProfile(true)} title="Edit profile, email, password">
            <Settings size={15} /> <span className="profile-btn-text">Edit Profile</span>
          </button>

          <BellNotice user={user} onNavigate={setTab} />

          <button onClick={() => logout('manual')} className="icon-btn logout-btn" title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="app-nav">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={'nav-tab-btn ' + (t.id === tab ? 'active' : '')}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="main-wrapper">
        <main className="content-card">
          {/* Admin Tabs */}
          {isAdmin && tab === 'Overview' && (
            <AdminOverviewTab onNavigate={setTab} />
          )}
          {isAdmin && tab === 'Branches' && (
            <AdminBranchesTab branches={branches} reload={reloadB} />
          )}
          {isAdmin && tab === 'Staff' && (
            <AdminStaffTab branches={branches} />
          )}

          {/* Staff Tabs */}
          {isStaff && tab === 'Dashboard' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrapper blue"><Calendar size={24} /></div>
                  <div>
                    <div className="stat-value">{count(['BOOKED', 'CONFIRMED', 'IN_PROGRESS'])}</div>
                    <div className="stat-label">Upcoming / Active Calls</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper amber"><Clock size={24} /></div>
                  <div>
                    <div className="stat-value">{count(['BOOKED'])}</div>
                    <div className="stat-label">Pending Staff Approval</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper green"><CheckCircle size={24} /></div>
                  <div>
                    <div className="stat-value">{count(['COMPLETED'])}</div>
                    <div className="stat-label">Completed Sessions</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper purple"><FileCheck size={24} /></div>
                  <div>
                    <div className="stat-value">{docs.filter(d => d.status === 'PENDING').length}</div>
                    <div className="stat-label">Pending KYC / Docs</div>
                  </div>
                </div>
              </div>
              <ApptList appts={appts} staff reload={reloadA} onJoin={handleJoinCall} />
            </>
          )}

          {isStaff && tab === 'Customers' && (
            <StaffCustomersTab branch={branch} />
          )}

          {/* Customer Tabs */}
          {!isAdmin && !isStaff && tab === 'Appointments' && (
            <ApptList appts={appts} reload={reloadA} onJoin={handleJoinCall} />
          )}

          {isAdmin && tab === 'Appointments' && (
            <ApptList appts={appts} staff admin reload={reloadA} onJoin={handleJoinCall} />
          )}

          {tab === 'Book' && (
            <BookTab
              user={user}
              branches={branches}
              onDone={() => {
                reloadA();
                setTab('Appointments');
              }}
            />
          )}

          {tab === 'Slots' && <SlotsTab />}

          {tab === 'Documents' && (
            <>
              {!isStaff && !isAdmin && <UploadSection appts={appts} reload={reloadD} />}
              <DocList docs={docs} staff={isStaff || isAdmin} reload={reloadD} />
            </>
          )}

          {tab === 'Audit' && <AuditTab />}
        </main>
      </div>

      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUserUpdated={u => setUser(u)}
        />
      )}

      {call && <CallModal appt={call} user={user} onClose={() => { setCall(null); reloadA(); }} />}
    </>
  );
}

// ---------------- Admin Components ----------------

function AdminOverviewTab({ onNavigate }) {
  const [stats] = useLoad('/admin/stats');
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>System Administration Console</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>
        Overview of base branch infrastructure, staff provisioning, and banking activity.
      </p>

      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('Branches')}>
          <div className="stat-icon-wrapper blue"><Building2 size={24} /></div>
          <div>
            <div className="stat-value">{stats.branches ?? '...'}</div>
            <div className="stat-label">Base Branches</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('Staff')}>
          <div className="stat-icon-wrapper green"><Users size={24} /></div>
          <div>
            <div className="stat-value">{stats.staff ?? '...'}</div>
            <div className="stat-label">Branch Officers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper purple"><UserIcon size={24} /></div>
          <div>
            <div className="stat-value">{stats.customers ?? '...'}</div>
            <div className="stat-label">Registered Customers</div>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('Appointments')}>
          <div className="stat-icon-wrapper amber"><Calendar size={24} /></div>
          <div>
            <div className="stat-value">{stats.appointments ?? '...'}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>🏢 Manage Base Branches</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Add new base branches to expand virtual banking service regions.
          </p>
          <button className="btn-primary" onClick={() => onNavigate('Branches')}>
            <Building2 size={15} /> Base Branches Portal
          </button>
        </div>

        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>👔 Provision Branch Staff</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Create secure officer accounts assigned to designated base branches.
          </p>
          <button className="btn-primary" onClick={() => onNavigate('Staff')}>
            <Users size={15} /> Branch Staff Portal
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminBranchesTab({ branches, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ name: '', city: '' });
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault();
    setErr('');
    try {
      await api('/admin/branches', { method: 'POST', body: f });
      setF({ name: '', city: '' });
      setShowAdd(false);
      reload();
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <div>
      <div className="section-toolbar">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Base Branches</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            List of accredited regional base branches handling video verification.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <PlusCircle size={15} /> Create Base Branch
        </button>
      </div>

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Branch ID</th>
              <th>Branch Name</th>
              <th>City / Location</th>
            </tr>
          </thead>
          <tbody>
            {branches.map(b => (
              <tr key={b.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{b.id}</td>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td>{b.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Create New Base Branch</h3>
              <button className="icon-btn" onClick={() => setShowAdd(false)}><XCircle size={18} /></button>
            </div>
            {err && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {err}
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Branch Name
                <input
                  required
                  placeholder="e.g. Hyderabad Hitech City Branch"
                  value={f.name}
                  onChange={e => setF({ ...f, name: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                City
                <input
                  required
                  placeholder="e.g. Hyderabad"
                  value={f.city}
                  onChange={e => setF({ ...f, city: e.target.value })}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStaffTab({ branches }) {
  const [staffList, reload] = useLoad('/admin/staff', 4000);
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', branchId: branches[0]?.id || '' });
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault();
    setErr('');
    try {
      await api('/admin/staff', {
        method: 'POST',
        body: { ...f, branchId: +f.branchId }
      });
      setF({ name: '', email: '', password: '', branchId: branches[0]?.id || '' });
      setShowAdd(false);
      reload();
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <div>
      <div className="section-toolbar">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Base Branch Staff Accounts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Administered staff officers authorized to verify customers and manage branch slots.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <PlusCircle size={15} /> Create Branch Staff
        </button>
      </div>

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Staff Officer</th>
              <th>Email</th>
              <th>Assigned Base Branch</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map(s => {
              const b = branches.find(x => x.id === s.branchId);
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{b ? b.name : `Branch #${s.branchId}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Create Branch Staff Account</h3>
              <button className="icon-btn" onClick={() => setShowAdd(false)}><XCircle size={18} /></button>
            </div>
            {err && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {err}
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Officer Legal Name
                <input
                  required
                  placeholder="e.g. Priya Sundaram"
                  value={f.name}
                  onChange={e => setF({ ...f, name: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Official Email
                <input
                  required
                  type="email"
                  placeholder="officer@branchlink.com"
                  value={f.email}
                  onChange={e => setF({ ...f, email: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Initial Password
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={f.password}
                  onChange={e => setF({ ...f, password: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Assign Base Branch
                <select
                  required
                  value={f.branchId}
                  onChange={e => setF({ ...f, branchId: e.target.value })}
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary">Create Staff Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Staff Customer Management ----------------

function StaffCustomersTab({ branch }) {
  const [customers, reload] = useLoad('/customers', 4000);
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const submit = async e => {
    e.preventDefault();
    setErr('');
    try {
      await api('/customers', {
        method: 'POST',
        body: f
      });
      setSuccessMsg(`Customer account for ${f.name} created successfully!`);
      setF({ name: '', email: '', password: '' });
      setShowAdd(false);
      reload();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (x) {
      setErr(x.message);
    }
  };

  return (
    <div>
      <div className="section-toolbar">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Branch Customer Accounts</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Base branch customer registration and virtual assistance account issuance.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <PlusCircle size={15} /> Register New Customer
        </button>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Customer Name</th>
              <th>Registered Email</th>
            </tr>
          </thead>
          <tbody>
            {!customers.length ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                  No customer accounts registered under this branch yet. Click "Register New Customer" to create an account.
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.email}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Register Customer Account</h3>
              <button className="icon-btn" onClick={() => setShowAdd(false)}><XCircle size={18} /></button>
            </div>
            {err && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {err}
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Customer Full Legal Name
                <input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={f.name}
                  onChange={e => setF({ ...f, name: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Customer Email Address
                <input
                  required
                  type="email"
                  placeholder="customer@domain.com"
                  value={f.email}
                  onChange={e => setF({ ...f, email: e.target.value })}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Initial Password
                <input
                  required
                  type="password"
                  placeholder="Min 6 characters"
                  value={f.password}
                  onChange={e => setF({ ...f, password: e.target.value })}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn-primary">Register Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Appointments List ----------------

function ApptList({ appts, staff, admin, reload, onJoin }) {
  const [rs, setRs] = useState(null);
  const run = async fn => {
    try {
      await fn();
    } catch (e) {
      alert(e.message);
    }
    reload();
  };

  if (!appts.length) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
        <Calendar size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ margin: 0, fontWeight: 500 }}>No appointments scheduled at this moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Scheduled Time</th>
              {(staff || admin) && <th>Customer</th>}
              <th>Service Purpose</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appts.map(a => {
              const timeReached = isTimeReached(a.startTime);
              return (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{fmt(a.startTime)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ref #{a.id}</div>
                  </td>
                  {(staff || admin) && (
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.customerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {a.customerId}</div>
                    </td>
                  )}
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.purpose}</div>
                    {a.remarks && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Remarks: <i>{a.remarks}</i>
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge s={a.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {LIVE.includes(a.status) && (
                        timeReached ? (
                          <button className="btn-primary" onClick={() => onJoin(a)}>
                            <Video size={14} /> Join Video
                          </button>
                        ) : (
                          <button
                            className="btn-disabled"
                            disabled
                            title={`Call will open at scheduled booking time: ${fmt(a.startTime)}`}
                          >
                            <Lock size={14} /> Opens at {fmt(a.startTime)}
                          </button>
                        )
                      )}
                      {staff && a.status === 'BOOKED' && (
                        <button onClick={() => run(() => act(a.id, 'confirm'))}>
                          <Check size={14} /> Confirm
                        </button>
                      )}
                      {staff && ['BOOKED', 'CONFIRMED'].includes(a.status) && (
                        <button onClick={() => setRs(a)}>
                          <RefreshCw size={14} /> Reschedule
                        </button>
                      )}
                      {staff && LIVE.includes(a.status) && (
                        <button
                          onClick={() => {
                            const r = prompt('Session completion remarks (optional):');
                            if (r !== null) run(() => act(a.id, 'complete', { remarks: r }));
                          }}
                        >
                          <CheckCircle size={14} /> Complete
                        </button>
                      )}
                      {['BOOKED', 'CONFIRMED'].includes(a.status) && (
                        <button
                          className="btn-danger"
                          onClick={() =>
                            window.confirm('Are you sure you want to cancel this appointment?') &&
                            run(() => act(a.id, 'cancel'))
                          }
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rs && <RescheduleModal a={rs} done={() => { setRs(null); reload(); }} />}
    </>
  );
}

function RescheduleModal({ a, done }) {
  const [slots] = useLoad('/slots');
  const pick = async s => {
    try {
      await act(a.id, 'reschedule', { slotId: s.id });
      done();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={done}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Reschedule Appointment</h3>
          <button className="icon-btn" onClick={done}><XCircle size={18} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Select a newly available slot for <b>{a.customerName}</b>:
        </p>
        {!slots.length && (
          <p style={{ color: 'var(--danger)', fontSize: 13 }}>
            No open slots found. Please publish new slots first.
          </p>
        )}
        <div className="slots-container">
          {slots.map(s => (
            <button key={s.id} className="slot-pill-btn" onClick={() => pick(s)}>
              <Clock size={14} /> {fmt(s.startTime)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookTab({ user, branches, onDone }) {
  const [bid, setBid] = useState(user.branchId || (branches[0] && branches[0].id));
  const [slots] = useLoad(`/slots?branchId=${bid}`, 4000);
  const [purpose, setPurpose] = useState(PURPOSES[0]);

  const book = async s => {
    if (!window.confirm(`Confirm booking for ${fmt(s.startTime)} with purpose: "${purpose}"?`)) return;
    try {
      await api('/appointments', { method: 'POST', body: { slotId: s.id, purpose } });
      onDone();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Schedule Virtual Branch Assistance</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px' }}>
        Book a dedicated, encrypted virtual video session with a certified branch officer.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Select Branch
          </label>
          <select value={bid} onChange={e => setBid(+e.target.value)}>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Assistance Purpose
          </label>
          <select value={purpose} onChange={e => setPurpose(e.target.value)}>
            {PURPOSES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
          Available Slots ({slots.length})
        </h3>
        {!slots.length ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: 8 }}>
            No slots currently published for this branch. Please check back shortly or select another branch.
          </div>
        ) : (
          <div className="slots-container">
            {slots.map(s => (
              <button key={s.id} className="slot-pill-btn" onClick={() => book(s)}>
                <Calendar size={14} /> {fmt(s.startTime)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotsTab() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [f, setF] = useState({ date: today, fromHour: 10, toHour: 17 });
  const [slots, reload] = useLoad('/slots', 4000);

  const gen = async () => {
    try {
      const r = await api('/slots/generate', {
        method: 'POST',
        body: { ...f, fromHour: +f.fromHour, toHour: +f.toHour }
      });
      alert(r.created + ' slots generated and published successfully.');
      reload();
    } catch (e) {
      alert(e.message);
    }
  };

  const quick = async () => {
    try {
      const s = await api('/slots/quick', { method: 'POST' });
      alert('Demo slot created starting at ' + fmt(s.startTime));
      reload();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Slot Management & Capacity</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>
        Publish officer availability schedules for customer virtual branch appointments.
      </p>

      <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid var(--border-light)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 160 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
            <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          </div>
          <div style={{ width: 110 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>From (Hr)</label>
            <input type="number" min="0" max="23" value={f.fromHour} onChange={e => setF({ ...f, fromHour: e.target.value })} />
          </div>
          <div style={{ width: 110 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>To (Hr)</label>
            <input type="number" min="1" max="24" value={f.toHour} onChange={e => setF({ ...f, toHour: e.target.value })} />
          </div>
          <button className="btn-primary" onClick={gen}>
            <PlusCircle size={15} /> Publish 30-Min Slots
          </button>
          <button onClick={quick} style={{ background: '#fff' }}>
            ⚡ Quick Demo Slot (~2 min)
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
        Current Open Slots ({slots.length})
      </h3>
      {!slots.length ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active unbooked slots.</p>
      ) : (
        <div className="slots-container">
          {slots.map(s => (
            <div key={s.id} className="status-badge blue" style={{ padding: '8px 12px', fontSize: 13 }}>
              {fmt(s.startTime)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function openDoc(id) {
  const r = await fetch(`${API_BASE}/api/documents/${id}/file`, { headers: { Authorization: 'Bearer ' + tok() } });
  if (!r.ok) return alert('Failed to open document file.');
  window.open(URL.createObjectURL(await r.blob()), '_blank');
}

function UploadSection({ appts, apptId, reload }) {
  const open = (appts || []).filter(a => ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status));
  const [sel, setSel] = useState('');

  const go = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const id = apptId || sel;
    if (!id) return alert('Please select an appointment first.');
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api(`/appointments/${id}/documents`, { method: 'POST', form: fd });
      reload();
    } catch (x) {
      alert(x.message);
    }
  };

  return (
    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid var(--border-light)', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {!apptId && (
          <div style={{ minWidth: 260 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Associate Appointment</label>
            <select value={sel} onChange={e => setSel(e.target.value)}>
              <option value="">Select Appointment...</option>
              {open.map(a => (
                <option key={a.id} value={a.id}>{fmt(a.startTime)} – {a.purpose}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            Upload KYC / Verification Document (PDF, PNG, JPG)
          </label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={go} />
        </div>
      </div>
    </div>
  );
}

function DocList({ docs, staff, reload }) {
  const review = async (d, status) => {
    const remarks = prompt(status === 'REJECTED' ? 'Reason for document rejection:' : 'Verification remarks (optional):') || '';
    try {
      await api(`/documents/${d.id}/review`, { method: 'POST', body: { status, remarks } });
      reload();
    } catch (e) {
      alert(e.message);
    }
  };

  if (!docs.length) {
    return (
      <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
        <FileText size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
        <p style={{ margin: 0 }}>No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="styled-table">
        <thead>
          <tr>
            <th>Document</th>
            {staff && <th>Customer</th>}
            <th>Upload Date</th>
            <th>Verification Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {docs.map(d => (
            <tr key={d.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{d.fileName}</div>
                {d.remarks && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Remarks: <i>{d.remarks}</i>
                  </div>
                )}
              </td>
              {staff && <td>{d.customerName}</td>}
              <td>{fmt(d.uploadedAt)}</td>
              <td><Badge s={d.status} /></td>
              <td>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => openDoc(d.id)}>View</button>
                  {staff && d.status === 'PENDING' && (
                    <>
                      <button className="btn-success" onClick={() => review(d, 'VERIFIED')}>
                        <Check size={13} /> Verify
                      </button>
                      <button className="btn-danger" onClick={() => review(d, 'REJECTED')}>
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab() {
  const [rows] = useLoad('/audit', 4000);
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Compliance & Audit Log</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>
        Immutable audit trail of authentication events, appointments, and document reviews.
      </p>

      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmt(a.ts)}</td>
                <td style={{ fontWeight: 600 }}>{a.actor}</td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                    {a.action}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CallModal({ appt, user, onClose }) {
  const staff = user.role === 'STAFF';
  const lv = useRef();
  const rv = useRef();
  const pc = useRef();
  const ws = useRef();
  const stream = useRef();

  const [state, setState] = useState('Initializing camera & audio...');
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [mobileTab, setMobileTab] = useState('video');
  const [docs, reload] = useLoad(`/appointments/${appt.id}/documents`, 3000);

  useEffect(() => {
    // Guard: Prevent call from starting if scheduled time has not arrived
    if (!isTimeReached(appt.startTime)) {
      alert(`The scheduled booking time (${fmt(appt.startTime)}) has not arrived yet. Call cannot be opened.`);
      onClose();
      return;
    }

    let dead = false;
    let chain = Promise.resolve();

    const send = m => ws.current?.readyState === 1 && ws.current.send(JSON.stringify(m));

    const mk = () => {
      pc.current?.close();
      const p = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      if (stream.current) {
        stream.current.getTracks().forEach(t => p.addTrack(t, stream.current));
      }

      p.onicecandidate = e => e.candidate && send({ type: 'ice', c: e.candidate });
      p.ontrack = e => {
        if (rv.current) rv.current.srcObject = e.streams[0];
        setState('Connected (Encrypted Peer-to-Peer)');
      };
      p.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(p.connectionState)) {
          setState('Connection interrupted');
        }
      };
      return (pc.current = p);
    };

    const handle = async m => {
      if (m.type === 'ready') {
        const p = mk();
        await p.setLocalDescription(await p.createOffer());
        send({ type: 'offer', sdp: p.localDescription });
      } else if (m.type === 'offer') {
        const p = mk();
        await p.setRemoteDescription(m.sdp);
        await p.setLocalDescription(await p.createAnswer());
        send({ type: 'answer', sdp: p.localDescription });
      } else if (m.type === 'answer') {
        await pc.current?.setRemoteDescription(m.sdp);
      } else if (m.type === 'ice') {
        try {
          await pc.current?.addIceCandidate(m.c);
        } catch {
          /* ignore candidate error */
        }
      } else if (m.type === 'bye') {
        pc.current?.close();
        if (rv.current) rv.current.srcObject = null;
        setState('Other participant left. Waiting...');
      }
    };

    (async () => {
      try {
        await act(appt.id, 'join');
        stream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (dead) {
          return stream.current.getTracks().forEach(t => t.stop());
        }
        if (lv.current) lv.current.srcObject = stream.current;

        ws.current = new WebSocket(getWsUrl(appt.id, tok()));
        setState('Waiting for counter-party to join...');

        ws.current.onmessage = ev => {
          chain = chain.then(() => handle(JSON.parse(ev.data))).catch(() => {});
        };
        ws.current.onclose = () => {
          setState(s => (s.includes('Connected') ? s : 'Session disconnected'));
        };
      } catch (e) {
        setState('Connection/Schedule notice: ' + (e.message || 'Unable to start call'));
      }
    })();

    return () => {
      dead = true;
      ws.current?.close();
      pc.current?.close();
      stream.current?.getTracks().forEach(t => t.stop());
    };
  }, [appt.id, appt.startTime, onClose]);

  const toggleMic = () => {
    const t = stream.current?.getAudioTracks();
    if (t && t.length > 0) {
      t[0].enabled = !t[0].enabled;
      setMicActive(t[0].enabled);
    }
  };

  const toggleCam = () => {
    const t = stream.current?.getVideoTracks();
    if (t && t.length > 0) {
      t[0].enabled = !t[0].enabled;
      setCamActive(t[0].enabled);
    }
  };

  const complete = async () => {
    const r = prompt('Session completion remarks (optional):');
    if (r === null) return;
    try {
      await act(appt.id, 'complete', { remarks: r });
      onClose();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="call-fullscreen-overlay">
      <div className="call-mobile-nav">
        <button
          className={'call-mobile-tab ' + (mobileTab === 'video' ? 'active' : '')}
          onClick={() => setMobileTab('video')}
        >
          <Video size={14} /> Video ({state.includes('Connected') ? 'Live' : 'Status'})
        </button>
        <button
          className={'call-mobile-tab ' + (mobileTab === 'docs' ? 'active' : '')}
          onClick={() => setMobileTab('docs')}
        >
          <FileText size={14} /> Documents ({docs.length})
        </button>
      </div>

      <div className={'video-workspace ' + (mobileTab !== 'video' ? 'mobile-hidden' : '')}>
        <div className="video-status-indicator">
          <div className="status-dot-pulse" />
          <span>{staff ? `Client: ${appt.customerName}` : 'Branch Officer'}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>{state}</span>
        </div>

        <video ref={rv} className="remote-video-feed" autoPlay playsInline />
        <video ref={lv} className="local-pip-feed" autoPlay playsInline muted />

        <div className="video-control-bar">
          <button
            className={'video-control-btn ' + (!micActive ? 'active-off' : '')}
            onClick={toggleMic}
            title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micActive ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            className={'video-control-btn ' + (!camActive ? 'active-off' : '')}
            onClick={toggleCam}
            title={camActive ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {camActive ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {staff && (
            <button
              className="video-control-btn"
              onClick={complete}
              style={{ width: 'auto', padding: '0 18px', borderRadius: 99, background: 'var(--bank-success)' }}
            >
              <CheckCircle size={18} /> Complete Session
            </button>
          )}

          <button className="video-control-btn leave-btn" onClick={onClose}>
            <PhoneCall size={18} style={{ transform: 'rotate(135deg)' }} /> Leave Call
          </button>
        </div>
      </div>

      <div className={'call-sidebar ' + (mobileTab !== 'docs' ? 'mobile-hidden' : '')}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--bank-navy)" />
            <h3 style={{ margin: 0, fontSize: 16 }}>Session Documents</h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Purpose: {appt.purpose}
          </p>
        </div>

        <div className="sidebar-body">
          {!staff && <UploadSection apptId={appt.id} reload={reload} />}
          <DocList docs={docs} staff={staff} reload={reload} />
        </div>
      </div>
    </div>
  );
}

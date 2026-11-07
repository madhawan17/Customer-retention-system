'use client';
// frontend/app/staff/page.js
// Staff Panel: Cases, escalations, audit timeline, and salesperson notifications.

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── SVG Icons ────────────────────────────────────────────────

function ArrowLeftIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CalendarIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronUpIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

// ── Status & Type Badges ─────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    open:      { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    waiting:   { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    resolved:  { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    escalated: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  };

  const style = styles[status] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: style.color,
      }} />
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  const configs = {
    firm_followup:   { label: 'Firm Follow-up', color: '#b45309' },
    dispute:         { label: 'Dispute', color: '#be123c' },
    promise_to_pay:  { label: 'Promise to Pay', color: '#0369a1' },
    reorder_dropoff: { label: 'Reorder Drop-off', color: '#4338ca' },
  };

  const config = configs[type] || { label: type.replace(/_/g, ' '), color: '#475569' };

  return (
    <span style={{
      fontSize: 12,
      fontWeight: 600,
      color: config.color,
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      padding: '2px 8px',
      borderRadius: 4,
    }}>
      {config.label}
    </span>
  );
}

// ── Main Staff Page ──────────────────────────────────────────

export default function StaffPage() {
  const [cases, setCases]                 = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentDate, setCurrentDate]     = useState('');
  const [expandedCase, setExpandedCase]   = useState(null);
  const [tab, setTab]                     = useState('cases');

  const fetchAll = async () => {
    try {
      const [casesRes, notifRes, clockRes] = await Promise.all([
        fetch(`${API}/cases`),
        fetch(`${API}/notifications`),
        fetch(`${API}/clock`),
      ]);
      setCases(await casesRes.json());
      setNotifications(await notifRes.json());
      const clock = await clockRes.json();
      setCurrentDate(clock.currentDate);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH' });
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const escalatedCount = cases.filter(c => c.status === 'escalated').length;
  const disputeCount = cases.filter(c => c.type === 'dispute').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Top Header ───────────────────────────────────────── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}>
            S
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
              Staff Escalation Panel
            </span>
            <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b' }}>
              Case Management & Oversight
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Simulated Date Chip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: '#475569',
          }}>
            <CalendarIcon size={13} color="#64748b" />
            <span style={{ fontSize: 11, color: '#64748b' }}>Simulated Date:</span>
            <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {currentDate || '—'}
            </strong>
          </div>

          <Link
            href="/"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeftIcon size={13} color="#0f172a" />
            Back to Chat
          </Link>
        </div>
      </header>

      {/* ── Metric Summary Strip ─────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Open Cases
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
              {cases.length}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Escalated Cases
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: escalatedCount > 0 ? '#991b1b' : '#0f172a', marginTop: 4 }}>
              {escalatedCount}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Disputes Under Review
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: disputeCount > 0 ? '#b45309' : '#0f172a', marginTop: 4 }}>
              {disputeCount}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Unread Alerts
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: unreadCount > 0 ? '#2563eb' : '#0f172a', marginTop: 4 }}>
              {unreadCount}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 24 }}>
          {[
            { key: 'cases', label: `Cases (${cases.length})` },
            { key: 'notifications', label: `Notifications (${unreadCount} unread)` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '14px 4px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#0f172a' : '#64748b',
                borderBottom: tab === t.key ? '2px solid #0f172a' : '2px solid transparent',
                fontSize: 13,
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Tab Content ─────────────────────────────────── */}
      <div style={{ flex: 1, padding: '24px', maxWidth: 1040, margin: '0 auto', width: '100%' }}>

        {/* ── Cases Tab ──────────────────────────────────── */}
        {tab === 'cases' && (
          <div>
            {cases.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '48px 24px',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No Active Cases</div>
                <p style={{ color: '#94a3b8' }}>
                  Cases are automatically created when invoices hit Firm Follow-up (+7 days) or when customers trigger disputes.
                </p>
              </div>
            )}

            {cases.map(c => {
              const timeline = typeof c.timeline === 'string' ? JSON.parse(c.timeline) : (c.timeline || []);
              const isExpanded = expandedCase === c.id;
              const isEscalated = c.status === 'escalated';

              return (
                <div key={c.id} style={{
                  background: '#ffffff',
                  borderRadius: 8,
                  marginBottom: 12,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                  border: isEscalated ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  transition: 'border-color 0.15s ease',
                }}>
                  <div
                    onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isEscalated ? '#fffbfb' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                          {c.customer_name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 8 }}>
                          <span>Invoice: <strong>{c.invoice_no || '—'}</strong></span>
                          <span>·</span>
                          <span>Total: ₹{c.amount ? parseFloat(c.amount).toLocaleString('en-IN') : '—'}</span>
                          <span>·</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>
                            Balance: ₹{c.amount && c.paid_amount
                              ? (parseFloat(c.amount) - parseFloat(c.paid_amount)).toLocaleString('en-IN')
                              : (parseFloat(c.amount || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <TypeBadge type={c.type} />
                      <StatusBadge status={c.status} />
                    </div>

                    <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div>
                        <div>Owner: <strong style={{ color: '#0f172a' }}>{c.owner}</strong></div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Opened: {new Date(c.opened_at).toLocaleDateString('en-IN')}
                        </div>
                        {c.escalated_at && (
                          <div style={{ color: '#991b1b', fontWeight: 600, fontSize: 11, marginTop: 2 }}>
                            Escalated: {new Date(c.escalated_at).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </div>

                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                      }}>
                        {isExpanded ? <ChevronUpIcon size={14} color="#64748b" /> : <ChevronDownIcon size={14} color="#64748b" />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Audit Stepper Timeline */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                        Audit Timeline
                      </div>

                      {timeline.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>No audit events logged.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '2px solid #e2e8f0', paddingLeft: 14, marginLeft: 6 }}>
                          {timeline.map((ev, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <div style={{
                                position: 'absolute',
                                left: -19,
                                top: 4,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: ev.event === 'escalated' ? '#ef4444' : ev.event === 'resolved' ? '#10b981' : '#0f172a',
                              }} />
                              <div style={{ fontSize: 12, color: '#0f172a' }}>
                                <strong style={{ textTransform: 'capitalize' }}>{ev.event.replace(/_/g, ' ')}</strong>
                                <span style={{ color: '#94a3b8', marginLeft: 8 }}>{ev.at}</span>
                                {ev.by && <span style={{ color: '#64748b', marginLeft: 6 }}>by {ev.by}</span>}
                                {ev.reason && (
                                  <span style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                  }}>
                                    {ev.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Notifications Tab ──────────────────────────── */}
        {tab === 'notifications' && (
          <div>
            {notifications.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '48px 24px',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No Notifications</div>
                <p style={{ color: '#94a3b8' }}>
                  Sales staff alerts for broken promises, opt-outs, and case escalations will appear here.
                </p>
              </div>
            )}

            {notifications.map(n => (
              <div key={n.id} style={{
                background: n.read ? '#ffffff' : '#f8fafc',
                borderRadius: 8,
                marginBottom: 10,
                padding: '14px 18px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                border: n.type === 'escalation' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: n.type === 'escalation' ? '#fef2f2' : n.type === 'dispute' ? '#fffbeb' : '#f0f9ff',
                      color: n.type === 'escalation' ? '#991b1b' : n.type === 'dispute' ? '#92400e' : '#0369a1',
                      border: `1px solid ${n.type === 'escalation' ? '#fecaca' : n.type === 'dispute' ? '#fde68a' : '#bae6fd'}`,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      {n.customer_name}
                    </span>
                    {!n.read && (
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#2563eb',
                        display: 'inline-block',
                      }} />
                    )}
                  </div>

                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                    {n.message}
                  </div>

                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', gap: 8 }}>
                    <span>{new Date(n.created_at).toLocaleString('en-IN')}</span>
                    {n.case_owner && <span>· Owner: {n.case_owner}</span>}
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    style={{
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '5px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f172a'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

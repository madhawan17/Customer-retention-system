'use client';
// frontend/app/staff/page.js
// Staff panel: Cases and escalation notifications.

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function StatusBadge({ status }) {
  const colors = {
    open:      { bg: '#fff3cd', color: '#856404' },
    waiting:   { bg: '#cce5ff', color: '#004085' },
    resolved:  { bg: '#d4edda', color: '#155724' },
    escalated: { bg: '#f8d7da', color: '#721c24' },
  };
  const style = colors[status] || { bg: '#e2e3e5', color: '#383d41' };
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
      background: style.bg,
      color: style.color,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  const labels = {
    firm_followup:  '⚠️ Firm Follow-up',
    dispute:        '🔴 Dispute',
    promise_to_pay: '🤝 Promise to Pay',
    reorder_dropoff:'📦 Reorder Drop-off',
  };
  return <span style={{ fontSize: 13 }}>{labels[type] || type}</span>;
}

export default function StaffPage() {
  const [cases, setCases]               = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentDate, setCurrentDate]   = useState('');
  const [expandedCase, setExpandedCase] = useState(null);
  const [tab, setTab]                   = useState('cases');

  const fetchAll = async () => {
    const [casesRes, notifRes, clockRes] = await Promise.all([
      fetch(`${API}/cases`),
      fetch(`${API}/notifications`),
      fetch(`${API}/clock`),
    ]);
    setCases(await casesRes.json());
    setNotifications(await notifRes.json());
    const clock = await clockRes.json();
    setCurrentDate(clock.currentDate);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id) => {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH' });
    fetchAll();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{
        background: '#075e54',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>👷 Staff Panel</span>
          <span style={{ marginLeft: 16, fontSize: 13, opacity: 0.85 }}>
            🕐 Fake Date: <strong>{currentDate}</strong>
          </span>
        </div>
        <Link href="/" style={{
          background: '#128c7e',
          color: 'white',
          padding: '6px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.3)',
        }}>
          💬 Back to Chat
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e9edef', padding: '0 24px', display: 'flex' }}>
        {[
          { key: 'cases', label: `Cases (${cases.length})` },
          { key: 'notifications', label: `Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#075e54' : '#667781',
              borderBottom: tab === t.key ? '3px solid #075e54' : '3px solid transparent',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Cases Tab ──────────────────────────────────── */}
        {tab === 'cases' && (
          <div>
            {cases.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8696a0', marginTop: 60, fontSize: 15 }}>
                No cases yet. Cases are created when invoices reach Firm Follow-up stage.
              </div>
            )}
            {cases.map(c => {
              const timeline = typeof c.timeline === 'string' ? JSON.parse(c.timeline) : (c.timeline || []);
              const isExpanded = expandedCase === c.id;
              return (
                <div key={c.id} style={{
                  background: 'white',
                  borderRadius: 8,
                  marginBottom: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  border: c.status === 'escalated' ? '2px solid #dc3545' : '1px solid #e9edef',
                }}>
                  <div
                    onClick={() => setExpandedCase(isExpanded ? null : c.id)}
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: c.status === 'escalated' ? '#fff5f5' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.customer_name}</div>
                        <div style={{ fontSize: 12, color: '#667781', marginTop: 2 }}>
                          Invoice: {c.invoice_no || '—'} ·
                          Amount: Rs {c.amount ? parseFloat(c.amount).toLocaleString('en-IN') : '—'} ·
                          Balance: Rs {c.amount && c.paid_amount
                            ? (parseFloat(c.amount) - parseFloat(c.paid_amount)).toLocaleString('en-IN')
                            : '—'}
                        </div>
                      </div>
                      <TypeBadge type={c.type} />
                      <StatusBadge status={c.status} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#667781' }}>
                      <div>Owner: <strong>{c.owner}</strong></div>
                      <div>Opened: {new Date(c.opened_at).toLocaleDateString('en-IN')}</div>
                      {c.escalated_at && (
                        <div style={{ color: '#dc3545', fontWeight: 600 }}>
                          Escalated: {new Date(c.escalated_at).toLocaleDateString('en-IN')}
                        </div>
                      )}
                      <div style={{ marginTop: 4, fontSize: 11 }}>{isExpanded ? '▲ Hide timeline' : '▼ Show timeline'}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f2f5', background: '#f8f9fa' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#54656f' }}>Timeline</div>
                      {timeline.length === 0 && <div style={{ color: '#8696a0', fontSize: 13 }}>No events yet.</div>}
                      {timeline.map((ev, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: 10,
                          marginBottom: 8,
                          fontSize: 13,
                          alignItems: 'flex-start',
                        }}>
                          <span style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: ev.event === 'escalated' ? '#dc3545' : ev.event === 'resolved' ? '#28a745' : '#075e54',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            flexShrink: 0,
                          }}>
                            {i + 1}
                          </span>
                          <div>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{ev.event.replace('_', ' ')}</span>
                            <span style={{ color: '#8696a0', marginLeft: 8 }}>{ev.at}</span>
                            {ev.by && <span style={{ color: '#8696a0', marginLeft: 6 }}>by {ev.by}</span>}
                            {ev.reason && <span style={{ color: '#25d366', marginLeft: 6 }}>({ev.reason})</span>}
                          </div>
                        </div>
                      ))}
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
              <div style={{ textAlign: 'center', color: '#8696a0', marginTop: 60, fontSize: 15 }}>
                No notifications yet.
              </div>
            )}
            {notifications.map(n => (
              <div key={n.id} style={{
                background: n.read ? 'white' : '#fffde7',
                borderRadius: 8,
                marginBottom: 10,
                padding: '14px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                border: n.type === 'escalation' ? '2px solid #dc3545' : '1px solid #e9edef',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      background: n.type === 'escalation' ? '#f8d7da' : n.type === 'dispute' ? '#fff3cd' : '#cce5ff',
                      color: n.type === 'escalation' ? '#721c24' : n.type === 'dispute' ? '#856404' : '#004085',
                      textTransform: 'uppercase',
                    }}>
                      {n.type.replace('_', ' ')}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{n.customer_name}</span>
                    {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#25d366', display: 'inline-block' }} />}
                  </div>
                  <div style={{ fontSize: 13, color: '#54656f', lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#8696a0', marginTop: 6 }}>
                    {new Date(n.created_at).toLocaleString('en-IN')}
                    {n.case_owner && ` · Owner: ${n.case_owner}`}
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    style={{
                      background: '#075e54',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    Mark read
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


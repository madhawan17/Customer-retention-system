'use client';
// frontend/app/page.js
// Customer Retention & Payment Follow-up — Interactive Chat Interface

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── SVG Icons ────────────────────────────────────────────────

function CalendarIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function FastForwardIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 19 22 12 13 5 13 19" />
      <polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  );
}

function ShieldIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SendIcon({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CheckDoubleIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L7 17l-5-5" />
      <path d="M22 10l-7.5 7.5L13 16" />
    </svg>
  );
}

function MessageSquareIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function fmtTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  if (!name) return 'CU';
  const parts = name.split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── Components ───────────────────────────────────────────────

function CustomerListItem({ customer, selected, onClick }) {
  const balance = parseFloat(customer.outstanding_balance || 0);

  const tierStyles = {
    gold:   { bg: '#fefce8', color: '#854d0e', border: '#fef08a' },
    silver: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
    bronze: { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  };

  const currentTierStyle = tierStyles[customer.tier] || tierStyles.silver;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        background: selected ? '#f1f5f9' : '#ffffff',
        borderLeft: selected ? '3px solid #0f172a' : '3px solid transparent',
        transition: 'background 0.15s ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      {/* Avatar Initials */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: selected ? '#0f172a' : '#e2e8f0',
        color: selected ? '#ffffff' : '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 12,
        flexShrink: 0,
        letterSpacing: 0.5,
      }}>
        {getInitials(customer.name)}
      </div>

      {/* Customer Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {customer.name}
          </span>
          <span style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            background: currentTierStyle.bg,
            color: currentTierStyle.color,
            border: `1px solid ${currentTierStyle.border}`,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {customer.tier}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
          <span>{customer.phone}</span>
          {balance > 0 ? (
            <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              ₹{balance.toLocaleString('en-IN')}
            </span>
          ) : (
            <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 500 }}>Paid</span>
          )}
        </div>

        {customer.stop_messages && (
          <div style={{
            marginTop: 4,
            fontSize: 11,
            color: '#991b1b',
            background: '#fef2f2',
            padding: '1px 6px',
            borderRadius: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 500,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />
            Opted Out
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound';

  const stageBadge = msg.stage && msg.stage !== 'inbound' && msg.stage !== 'webhook_response'
    ? msg.stage.replace(/_/g, ' ')
    : null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: isOut ? 'flex-start' : 'flex-end',
      marginBottom: 10,
      padding: '0 18px',
    }}>
      <div style={{
        maxWidth: '72%',
        background: isOut ? '#ffffff' : '#0f172a',
        color: isOut ? '#0f172a' : '#ffffff',
        borderRadius: 8,
        padding: '10px 14px',
        border: isOut ? '1px solid #e2e8f0' : '1px solid #0f172a',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        fontSize: 13,
        lineHeight: 1.55,
      }}>
        {stageBadge && (
          <div style={{
            fontSize: 10,
            color: '#2563eb',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 6,
            letterSpacing: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb' }} />
            {stageBadge}
          </div>
        )}

        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</div>

        <div style={{
          fontSize: 10,
          color: isOut ? '#94a3b8' : '#cbd5e1',
          textAlign: 'right',
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 4,
        }}>
          <span>{fmtTime(msg.sent_at)}</span>
          {isOut && <CheckDoubleIcon size={12} color="#94a3b8" />}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function HomePage() {
  const [customers, setCustomers]             = useState([]);
  const [selectedId, setSelectedId]           = useState(null);
  const [messages, setMessages]               = useState([]);
  const [replyText, setReplyText]             = useState('');
  const [currentDate, setCurrentDate]         = useState('');
  const [advanceDays, setAdvanceDays]         = useState(1);
  const [payAmount, setPayAmount]             = useState('');
  const [loading, setLoading]                 = useState(false);
  const [status, setStatus]                   = useState('');
  const [invoices, setInvoices]               = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const chatEndRef = useRef(null);

  // ── Fetch data ────────────────────────────────────────────
  const fetchCustomers = async () => {
    try {
      const r = await fetch(`${API}/customers`);
      const data = await r.json();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (id) => {
    if (!id) return;
    try {
      const r = await fetch(`${API}/customers/${id}/messages`);
      const data = await r.json();
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClock = async () => {
    try {
      const r = await fetch(`${API}/clock`);
      const data = await r.json();
      setCurrentDate(data.currentDate);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvoices = async (customerId) => {
    setInvoices([]);
    setSelectedInvoice('');
  };

  useEffect(() => {
    fetchCustomers();
    fetchClock();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      fetchInvoices(selectedId);
    }
  }, [selectedId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchMessages(selectedId);
      await fetchCustomers();
      await fetchClock();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  // ── Actions ───────────────────────────────────────────────

  const handleAdvanceClock = async () => {
    setLoading(true);
    setStatus('Advancing clock...');
    try {
      const r = await fetch(`${API}/clock/advance?days=${advanceDays}`, { method: 'POST' });
      const data = await r.json();
      setCurrentDate(data.currentDate);
      setStatus(`Clock advanced to ${data.currentDate} (${data.summary?.messagesSent || 0} messages sent)`);
      await fetchCustomers();
      await fetchMessages(selectedId);
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setLoading(true);
    try {
      await fetch(`${API}/webhook/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedId, text: replyText }),
      });
      setReplyText('');
      setStatus('Reply registered');
      await fetchMessages(selectedId);
      await fetchCustomers();
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleRecordPayment = async () => {
    if (!payAmount || !selectedId) return;
    setLoading(true);
    setStatus('Recording payment...');
    try {
      const res = await fetch(`${API}/webhook/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedId, text: 'PAID' }),
      });
      const data = await res.json();
      setStatus(data.response || 'Payment recorded');
      await fetchCustomers();
      await fetchMessages(selectedId);
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  };

  const selectedCustomer = customers.find(c => c.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 20px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Brand / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            R
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: -0.2, color: '#0f172a' }}>
              Retention System
            </span>
            <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
              Credit & Follow-up Engine
            </span>
          </div>
        </div>

        {/* Center: Simulated Clock Console */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '4px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
            <CalendarIcon size={14} color="#64748b" />
            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>Date:</span>
            <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{currentDate || '—'}</strong>
          </div>

          <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Advance</span>
            <input
              type="number"
              min="1"
              max="30"
              value={advanceDays}
              onChange={e => setAdvanceDays(parseInt(e.target.value) || 1)}
              style={{
                width: 44,
                padding: '3px 6px',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>days</span>

            <button
              onClick={handleAdvanceClock}
              disabled={loading}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.15s ease',
              }}
            >
              <FastForwardIcon size={12} color="#ffffff" />
              {loading ? 'Running...' : 'Run Engine'}
            </button>
          </div>

          {status && (
            <span style={{
              fontSize: 11,
              color: status.startsWith('Error') ? '#991b1b' : '#059669',
              background: status.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 500,
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {status}
            </span>
          )}
        </div>

        {/* Right: Staff Panel Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/staff"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: '6px 14px',
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
            <ShieldIcon size={14} color="#0f172a" />
            Staff Panel
          </Link>
        </div>
      </header>

      {/* ── Main Layout: Sidebar & Chat ──────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Customer Directory Sidebar */}
        <aside style={{
          width: 320,
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          background: '#ffffff',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Customers
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {customers.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {customers.map(c => (
              <CustomerListItem
                key={c.id}
                customer={c}
                selected={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        </aside>

        {/* Chat / Conversation Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
          {selectedId ? (
            <>
              {/* Selected Customer Header */}
              <div style={{
                background: '#ffffff',
                padding: '12px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: '#f1f5f9',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}>
                    {getInitials(selectedCustomer?.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      {selectedCustomer?.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center', marginTop: 1 }}>
                      <span>{selectedCustomer?.phone}</span>
                      <span>·</span>
                      <span style={{ textTransform: 'capitalize' }}>Tier: {selectedCustomer?.tier}</span>
                      <span>·</span>
                      <span>Salesperson: {selectedCustomer?.salesperson}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Outstanding Balance</div>
                  <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ₹{parseFloat(selectedCustomer?.outstanding_balance || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                {messages.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: '#94a3b8',
                    marginTop: 80,
                    fontSize: 13,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <MessageSquareIcon size={32} color="#cbd5e1" />
                    <p style={{ fontWeight: 500, color: '#64748b' }}>No messages in thread</p>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>
                      Advance the simulated clock to trigger scheduled stage messages.
                    </p>
                  </div>
                )}
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                <div ref={chatEndRef} />
              </div>

              {/* Reply & Quick Actions Footer */}
              <div style={{
                background: '#ffffff',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                flexShrink: 0,
              }}>
                {/* Quick Action Chips */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginRight: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Quick Reply:
                  </span>
                  {['PAID', 'DISPUTE', 'STOP', 'YES'].map(kw => (
                    <button
                      key={kw}
                      onClick={() => setReplyText(kw)}
                      style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        padding: '4px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: 0.3,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                    >
                      {kw}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const d = currentDate ? new Date(currentDate) : new Date();
                      d.setDate(d.getDate() + 7);
                      const futureDate = d.toISOString().split('T')[0];
                      setReplyText(`PROMISE ${futureDate}`);
                    }}
                    style={{
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                  >
                    PROMISE +7d
                  </button>
                </div>

                {/* Input Bar */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    placeholder="Type simulated customer reply (e.g., PAID, PROMISE 2026-11-15, DISPUTE, STOP)..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      background: '#f8fafc',
                      color: '#0f172a',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#0f172a'; e.target.style.background = '#ffffff'; }}
                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={loading || !replyText.trim()}
                    style={{
                      background: replyText.trim() ? '#0f172a' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      height: 38,
                      padding: '0 16px',
                      borderRadius: 6,
                      cursor: replyText.trim() && !loading ? 'pointer' : 'not-allowed',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>Send</span>
                    <SendIcon size={13} color="#ffffff" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#64748b', maxWidth: 320 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: '#94a3b8',
                }}>
                  <MessageSquareIcon size={24} color="#64748b" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  No customer selected
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  Choose a customer from the left directory to inspect conversation logs or simulate customer replies.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

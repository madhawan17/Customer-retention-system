'use client';
// frontend/app/page.js
// Mock WhatsApp chat interface.
// Left: customer list. Right: chat with that customer + controls.

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Helpers ──────────────────────────────────────────────────

function fmtTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Components ───────────────────────────────────────────────

function CustomerListItem({ customer, selected, onClick }) {
  const balance = parseFloat(customer.outstanding_balance || 0);
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e9edef',
        cursor: 'pointer',
        background: selected ? '#d1f4cc' : 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{customer.name}</span>
        <span style={{
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 10,
          background: customer.tier === 'gold' ? '#ffd700' : customer.tier === 'silver' ? '#c0c0c0' : '#cd7f32',
          color: customer.tier === 'gold' ? '#333' : 'white',
          fontWeight: 600,
        }}>{customer.tier}</span>
      </div>
      <div style={{ fontSize: 12, color: '#667781' }}>{customer.phone}</div>
      {balance > 0 && (
        <div style={{ fontSize: 12, color: '#dc3545', fontWeight: 600 }}>
          Outstanding: Rs {balance.toLocaleString('en-IN')}
        </div>
      )}
      {customer.stop_messages && (
        <div style={{ fontSize: 11, color: '#ff9800', fontWeight: 600 }}>⛔ Messages stopped</div>
      )}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  const bubbleColor = isOut ? '#d9fdd3' : 'white';
  const align = isOut ? 'flex-end' : 'flex-start';

  const stageBadge = msg.stage && msg.stage !== 'inbound' && msg.stage !== 'webhook_response'
    ? msg.stage.replace(/_/g, ' ')
    : null;

  return (
    <div style={{ display: 'flex', justifyContent: align, marginBottom: 4, padding: '2px 12px' }}>
      <div style={{
        maxWidth: '65%',
        background: bubbleColor,
        borderRadius: isOut ? '8px 0 8px 8px' : '0 8px 8px 8px',
        padding: '8px 12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        fontSize: 14,
        lineHeight: 1.5,
      }}>
        {stageBadge && (
          <div style={{
            fontSize: 10,
            color: '#25d366',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 4,
            letterSpacing: 0.5,
          }}>
            [{stageBadge}]
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</div>
        <div style={{ fontSize: 11, color: '#8696a0', textAlign: 'right', marginTop: 4 }}>
          {fmtTime(msg.sent_at)}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function HomePage() {
  const [customers, setCustomers]       = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [replyText, setReplyText]       = useState('');
  const [currentDate, setCurrentDate]   = useState('');
  const [advanceDays, setAdvanceDays]   = useState(1);
  const [payAmount, setPayAmount]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [status, setStatus]             = useState('');
  const [invoices, setInvoices]         = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const chatEndRef = useRef(null);

  // ── Fetch data ────────────────────────────────────────────
  const fetchCustomers = async () => {
    const r = await fetch(`${API}/customers`);
    const data = await r.json();
    setCustomers(data);
  };

  const fetchMessages = async (id) => {
    if (!id) return;
    const r = await fetch(`${API}/customers/${id}/messages`);
    const data = await r.json();
    setMessages(data);
  };

  const fetchClock = async () => {
    const r = await fetch(`${API}/clock`);
    const data = await r.json();
    setCurrentDate(data.currentDate);
  };

  const fetchInvoices = async (customerId) => {
    // Get invoices via customers endpoint not directly exposed — use a workaround
    // We'll derive from the customer list data for now; a dedicated endpoint would be cleaner
    // For now, just track the customer's open invoices for payment recording
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
      setStatus(`✓ Clock advanced to ${data.currentDate}. ${data.summary?.messagesSent || 0} messages sent.`);
      await fetchCustomers();
      await fetchMessages(selectedId);
    } catch (e) {
      setStatus('✗ Error: ' + e.message);
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
      setStatus('✓ Reply sent');
      await fetchMessages(selectedId);
      await fetchCustomers();
    } catch (e) {
      setStatus('✗ Error: ' + e.message);
    }
    setLoading(false);
  };

  const handleRecordPayment = async () => {
    if (!payAmount || !selectedId) return;
    setLoading(true);
    setStatus('Recording payment...');
    try {
      // Find first unpaid invoice for this customer
      const r = await fetch(`${API}/customers`);
      const all = await r.json();
      // We need to get invoices — use webhook PAID for simplicity,
      // or ideally call POST /payments with invoiceId
      // For the UI, we send PAID keyword if no specific invoice selected
      const res = await fetch(`${API}/webhook/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedId, text: 'PAID' }),
      });
      const data = await res.json();
      setStatus('✓ ' + (data.response || 'Payment recorded'));
      await fetchCustomers();
      await fetchMessages(selectedId);
    } catch (e) {
      setStatus('✗ Error: ' + e.message);
    }
    setLoading(false);
  };

  const selectedCustomer = customers.find(c => c.id === selectedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div style={{
        background: '#075e54',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>📦 Wholesale Retention System</span>
          <span style={{ marginLeft: 16, fontSize: 13, opacity: 0.85 }}>
            🕐 Fake Date: <strong>{currentDate || '...'}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/staff" style={{
            background: '#128c7e',
            color: 'white',
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            👷 Staff Panel
          </Link>
        </div>
      </div>

      {/* ── Clock Controls ───────────────────────────────────── */}
      <div style={{
        background: '#128c7e',
        color: 'white',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        fontSize: 13,
      }}>
        <span style={{ fontWeight: 600 }}>⏩ Advance Clock:</span>
        <input
          type="number"
          min="1"
          max="30"
          value={advanceDays}
          onChange={e => setAdvanceDays(parseInt(e.target.value) || 1)}
          style={{ width: 60, padding: '4px 8px', borderRadius: 4, border: 'none', textAlign: 'center', fontWeight: 600 }}
        />
        <span>days</span>
        <button
          onClick={handleAdvanceClock}
          disabled={loading}
          style={{
            background: '#25d366',
            color: 'white',
            border: 'none',
            padding: '6px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {loading ? '...' : '▶ Run Engine'}
        </button>
        {status && <span style={{ opacity: 0.9, fontSize: 12 }}>{status}</span>}
      </div>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Customer List ─────────────────────────────────── */}
        <div style={{
          width: 320,
          borderRight: '1px solid #e9edef',
          overflowY: 'auto',
          background: 'white',
          flexShrink: 0,
        }}>
          <div style={{ padding: '10px 16px', background: '#f0f2f5', fontSize: 13, fontWeight: 600, color: '#54656f' }}>
            Customers ({customers.length})
          </div>
          {customers.map(c => (
            <CustomerListItem
              key={c.id}
              customer={c}
              selected={c.id === selectedId}
              onClick={() => setSelectedId(c.id)}
            />
          ))}
        </div>

        {/* ── Chat Area ─────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#efeae2', overflow: 'hidden' }}>
          {selectedId ? (
            <>
              {/* Chat Header */}
              <div style={{
                background: '#f0f2f5',
                padding: '10px 16px',
                borderBottom: '1px solid #e9edef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedCustomer?.name}</div>
                  <div style={{ fontSize: 12, color: '#667781' }}>
                    {selectedCustomer?.phone} · {selectedCustomer?.tier} · Salesperson: {selectedCustomer?.salesperson}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#dc3545', fontWeight: 600 }}>
                  Outstanding: Rs {parseFloat(selectedCustomer?.outstanding_balance || 0).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#8696a0', marginTop: 40, fontSize: 14 }}>
                    No messages yet. Advance the clock to trigger messages.
                  </div>
                )}
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div style={{
                background: '#f0f2f5',
                padding: '10px 12px',
                borderTop: '1px solid #e9edef',
                flexShrink: 0,
              }}>
                {/* Quick reply buttons */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {['PAID', 'DISPUTE', 'STOP', 'YES'].map(kw => (
                    <button
                      key={kw}
                      onClick={() => setReplyText(kw)}
                      style={{
                        background: '#25d366',
                        color: 'white',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {kw}
                    </button>
                  ))}
                  <button
                    onClick={() => setReplyText(`PROMISE ${currentDate ? (() => { const d = new Date(currentDate); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; })() : ''}`)}
                    style={{
                      background: '#ff9800',
                      color: 'white',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    PROMISE +7d
                  </button>
                </div>

                {/* Text input */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    placeholder="Type a reply (PAID, PROMISE date, DISPUTE, STOP, YES)..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 20,
                      border: 'none',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={loading || !replyText.trim()}
                    style={{
                      background: '#25d366',
                      color: 'white',
                      border: 'none',
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: 18,
                    }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#54656f' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Select a customer to view their chat</div>
                <div style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>
                  Use "Advance Clock" to trigger stage messages
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


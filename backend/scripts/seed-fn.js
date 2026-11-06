// backend/scripts/seed-fn.js
function offsetDate(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function seedDatabase(db, baseDate) {
  const BASE = baseDate || new Date().toISOString().split('T')[0];

  // ── Reset clock ───────────────────────────────────────────
  await db.raw(`
    INSERT INTO clock_state (id, simulated_date) VALUES (1, ?)
    ON CONFLICT (id) DO UPDATE SET simulated_date = EXCLUDED.simulated_date
  `, [BASE]);

  // ── 10 Customers ─────────────────────────────────────────
  const customers = await db('customers').insert([
    { name: 'Ramesh Traders',      phone: '+919876543201', tier: 'gold',   salesperson: 'Anjali', credit_days: 30 },
    { name: 'Suresh Wholesale',    phone: '+919876543202', tier: 'gold',   salesperson: 'Anjali', credit_days: 30 },
    { name: 'Priya Stores',        phone: '+919876543203', tier: 'silver', salesperson: 'Ravi',   credit_days: 21 },
    { name: 'Mahesh Distributors', phone: '+919876543204', tier: 'silver', salesperson: 'Ravi',   credit_days: 21 },
    { name: 'Kavita Retail',       phone: '+919876543205', tier: 'silver', salesperson: 'Anjali', credit_days: 21 },
    { name: 'Deepak Mart',         phone: '+919876543206', tier: 'bronze', salesperson: 'Ravi',   credit_days: 15 },
    { name: 'Sunita Enterprises',  phone: '+919876543207', tier: 'bronze', salesperson: 'Anjali', credit_days: 15 },
    { name: 'Vinod Supplies',      phone: '+919876543208', tier: 'bronze', salesperson: 'Ravi',   credit_days: 15 },
    { name: 'Geeta General Store', phone: '+919876543209', tier: 'bronze', salesperson: 'Anjali', credit_days: 15 },
    { name: 'Harish Wholesale',    phone: '+919876543210', tier: 'bronze', salesperson: 'Ravi',   credit_days: 15 },
  ]).returning('id');

  const ids = customers.map(r => r.id);
  const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = ids;

  // ── 20 Invoices ──────────────────────────────────────────
  await db('invoices').insert([
    { customer_id: c1,  invoice_no: 'INV-001', amount: 15000.00, paid_amount: 0,     due_date: offsetDate(BASE,  5),  status: 'unpaid'  },
    { customer_id: c2,  invoice_no: 'INV-002', amount: 22500.00, paid_amount: 0,     due_date: offsetDate(BASE,  0),  status: 'unpaid'  },
    { customer_id: c3,  invoice_no: 'INV-003', amount: 18000.00, paid_amount: 0,     due_date: offsetDate(BASE, -3),  status: 'unpaid'  },
    { customer_id: c4,  invoice_no: 'INV-004', amount: 30000.00, paid_amount: 0,     due_date: offsetDate(BASE, -7),  status: 'unpaid'  },
    { customer_id: c5,  invoice_no: 'INV-005', amount: 45000.00, paid_amount: 0,     due_date: offsetDate(BASE, -15), status: 'unpaid'  },
    { customer_id: c6,  invoice_no: 'INV-006', amount: 20000.00, paid_amount: 8000,  due_date: offsetDate(BASE, -3),  status: 'partial' },
    { customer_id: c7,  invoice_no: 'INV-007', amount: 12000.00, paid_amount: 12000, due_date: offsetDate(BASE, -5),  status: 'paid'    },
    { customer_id: c8,  invoice_no: 'INV-008', amount: 8000.00,  paid_amount: 0,     due_date: offsetDate(BASE, -3),  status: 'unpaid'  },
    { customer_id: c8,  invoice_no: 'INV-009', amount: 9500.00,  paid_amount: 0,     due_date: offsetDate(BASE, -4),  status: 'unpaid'  },
    { customer_id: c8,  invoice_no: 'INV-010', amount: 11000.00, paid_amount: 0,     due_date: offsetDate(BASE, -6),  status: 'unpaid'  },
    { customer_id: c1,  invoice_no: 'INV-011', amount: 25000.00, paid_amount: 0,     due_date: offsetDate(BASE,  2),  status: 'unpaid'  },
    { customer_id: c9,  invoice_no: 'INV-012', amount: 16000.00, paid_amount: 0,     due_date: offsetDate(BASE, 30),  status: 'unpaid'  },
    { customer_id: c10, invoice_no: 'INV-013', amount: 19500.00, paid_amount: 0,     due_date: offsetDate(BASE, 10),  status: 'unpaid'  },
    { customer_id: c2,  invoice_no: 'INV-014', amount: 13000.00, paid_amount: 0,     due_date: offsetDate(BASE,  5),  status: 'unpaid'  },
    { customer_id: c3,  invoice_no: 'INV-015', amount: 7500.00,  paid_amount: 0,     due_date: offsetDate(BASE, -1),  status: 'unpaid'  },
    { customer_id: c4,  invoice_no: 'INV-016', amount: 11000.00, paid_amount: 0,     due_date: offsetDate(BASE,  3),  status: 'unpaid'  },
    { customer_id: c5,  invoice_no: 'INV-017', amount: 28000.00, paid_amount: 0,     due_date: offsetDate(BASE, -3),  status: 'unpaid'  },
    { customer_id: c6,  invoice_no: 'INV-018', amount: 5000.00,  paid_amount: 5000,  due_date: offsetDate(BASE, -10), status: 'paid'    },
    { customer_id: c9,  invoice_no: 'INV-019', amount: 33000.00, paid_amount: 0,     due_date: offsetDate(BASE, -7),  status: 'unpaid'  },
    { customer_id: c10, invoice_no: 'INV-020', amount: 41000.00, paid_amount: 0,     due_date: offsetDate(BASE, -15), status: 'unpaid'  },
  ]);

  // ── 30 Orders ────────────────────────────────────────────
  await db('orders').insert([
    { customer_id: c1,  order_date: offsetDate(BASE, -45),  items: JSON.stringify([{ sku: 'SOAP-500G',    qty: 100, price: 25   }]) },
    { customer_id: c1,  order_date: offsetDate(BASE, -30),  items: JSON.stringify([{ sku: 'OIL-1L',       qty: 50,  price: 80   }]) },
    { customer_id: c1,  order_date: offsetDate(BASE, -15),  items: JSON.stringify([{ sku: 'SOAP-500G',    qty: 150, price: 25   }]) },
    { customer_id: c2,  order_date: offsetDate(BASE, -60),  items: JSON.stringify([{ sku: 'FLOUR-10KG',   qty: 200, price: 350  }]) },
    { customer_id: c2,  order_date: offsetDate(BASE, -40),  items: JSON.stringify([{ sku: 'FLOUR-10KG',   qty: 180, price: 350  }]) },
    { customer_id: c2,  order_date: offsetDate(BASE, -20),  items: JSON.stringify([{ sku: 'SUGAR-5KG',    qty: 100, price: 220  }]) },
    { customer_id: c3,  order_date: offsetDate(BASE, -75),  items: JSON.stringify([{ sku: 'RICE-25KG',    qty: 50,  price: 1200 }]) },
    { customer_id: c3,  order_date: offsetDate(BASE, -50),  items: JSON.stringify([{ sku: 'RICE-25KG',    qty: 60,  price: 1200 }]) },
    { customer_id: c3,  order_date: offsetDate(BASE, -25),  items: JSON.stringify([{ sku: 'DAL-1KG',      qty: 200, price: 100  }]) },
    { customer_id: c4,  order_date: offsetDate(BASE, -90),  items: JSON.stringify([{ sku: 'BISCUIT-200G', qty: 500, price: 15   }]) },
    { customer_id: c4,  order_date: offsetDate(BASE, -60),  items: JSON.stringify([{ sku: 'BISCUIT-200G', qty: 450, price: 15   }]) },
    { customer_id: c4,  order_date: offsetDate(BASE, -30),  items: JSON.stringify([{ sku: 'BISCUIT-200G', qty: 600, price: 15   }]) },
    { customer_id: c5,  order_date: offsetDate(BASE, -60),  items: JSON.stringify([{ sku: 'TEA-500G',     qty: 300, price: 180  }]) },
    { customer_id: c5,  order_date: offsetDate(BASE, -40),  items: JSON.stringify([{ sku: 'TEA-500G',     qty: 280, price: 180  }]) },
    { customer_id: c5,  order_date: offsetDate(BASE, -20),  items: JSON.stringify([{ sku: 'COFFEE-200G',  qty: 100, price: 220  }]) },
    { customer_id: c6,  order_date: offsetDate(BASE, -30),  items: JSON.stringify([{ sku: 'SHAMPOO-200ML',qty: 200, price: 85   }]) },
    { customer_id: c6,  order_date: offsetDate(BASE, -15),  items: JSON.stringify([{ sku: 'SHAMPOO-200ML',qty: 220, price: 85   }]) },
    { customer_id: c6,  order_date: offsetDate(BASE, -5),   items: JSON.stringify([{ sku: 'SOAP-100G',    qty: 300, price: 20   }]) },
    { customer_id: c7,  order_date: offsetDate(BASE, -60),  items: JSON.stringify([{ sku: 'MATCHBOX-10PK',qty: 1000,price: 5    }]) },
    { customer_id: c7,  order_date: offsetDate(BASE, -40),  items: JSON.stringify([{ sku: 'MATCHBOX-10PK',qty: 1200,price: 5    }]) },
    { customer_id: c7,  order_date: offsetDate(BASE, -20),  items: JSON.stringify([{ sku: 'CANDLE-PKT',   qty: 500, price: 30   }]) },
    { customer_id: c8,  order_date: offsetDate(BASE, -54),  items: JSON.stringify([{ sku: 'SALT-1KG',     qty: 400, price: 20   }]) },
    { customer_id: c8,  order_date: offsetDate(BASE, -36),  items: JSON.stringify([{ sku: 'SALT-1KG',     qty: 350, price: 20   }]) },
    { customer_id: c8,  order_date: offsetDate(BASE, -18),  items: JSON.stringify([{ sku: 'SALT-1KG',     qty: 500, price: 20   }]) },
    { customer_id: c9,  order_date: offsetDate(BASE, -110), items: JSON.stringify([{ sku: 'OIL-5L',       qty: 100, price: 450  }]) },
    { customer_id: c9,  order_date: offsetDate(BASE, -82),  items: JSON.stringify([{ sku: 'OIL-5L',       qty: 120, price: 450  }]) },
    { customer_id: c9,  order_date: offsetDate(BASE, -55),  items: JSON.stringify([{ sku: 'OIL-1L',       qty: 200, price: 100  }]) },
    { customer_id: c10, order_date: offsetDate(BASE, -120), items: JSON.stringify([{ sku: 'PULSES-5KG',   qty: 50,  price: 600  }]) },
    { customer_id: c10, order_date: offsetDate(BASE, -90),  items: JSON.stringify([{ sku: 'PULSES-5KG',   qty: 60,  price: 600  }]) },
    { customer_id: c10, order_date: offsetDate(BASE, -60),  items: JSON.stringify([{ sku: 'PULSES-5KG',   qty: 55,  price: 600  }]) },
  ]);

  return { customers: ids, base: BASE };
}

module.exports = seedDatabase;


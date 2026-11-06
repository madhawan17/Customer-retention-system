// backend/src/routes/notifications.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const notifications = await db('notifications as n')
      .join('customers as c', 'c.id', 'n.customer_id')
      .leftJoin('cases as ca', 'ca.id', 'n.case_id')
      .select(
        'n.*',
        'c.name as customer_name',
        'c.phone as customer_phone',
        'ca.type as case_type',
        'ca.status as case_status',
        'ca.owner as case_owner'
      )
      .orderBy('n.created_at', 'desc');

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await db('notifications').where({ id: req.params.id }).update({ read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


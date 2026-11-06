// backend/src/routes/clock.js
const express = require('express');
const router  = express.Router();
const clockService  = require('../services/clock');
const engineService = require('../services/engine');

router.get('/', async (req, res) => {
  try {
    const currentDate = await clockService.getDateString();
    res.json({ currentDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/advance', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10);
    if (isNaN(days) || days < 1) {
      return res.status(400).json({ error: 'days query param must be a positive integer' });
    }
    const result = await clockService.advance(days, engineService);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


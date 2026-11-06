// backend/src/routes/cases.js
const express      = require('express');
const router       = express.Router();
const casesService = require('../services/cases');

router.get('/', async (req, res) => {
  try {
    const cases = await casesService.getAllCases();
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


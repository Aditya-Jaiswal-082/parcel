const express = require('express');
const Notification = require('../models/Notification');
const router = express.Router();

// GET /api/notifications/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// routes/distance.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/calculate-distance', async (req, res) => {
  const { origin, destination } = req.body;

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}`;

    const response = await axios.get(url);
    const distanceInMeters = response.data.rows[0].elements[0].distance.value;

    res.json({ distanceInMeters });
  } catch (err) {
    console.error('❌ Distance Matrix error:', err.message);
    res.status(500).json({ error: 'Failed to fetch distance' });
  }
});

module.exports = router;

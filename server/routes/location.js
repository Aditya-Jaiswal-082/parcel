// server/routes/location.js
const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

router.post('/resolve', async (req, res) => {
  const { address } = req.body;

  if (!address) return res.status(400).json({ error: 'Address is required' });

  // Step 1: Check cache
  let cached = await Location.findOne({ address });
  if (cached) return res.status(200).json(cached);

  // Step 2: Call Google Maps
  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
      params: {
        address,
        key: GOOGLE_API_KEY
      }
    });

    const result = response.data.results[0];
    const coordinates = result.geometry.location;

    const saved = new Location({
      address: result.formatted_address,
      coordinates
    });

    await saved.save();
    res.status(200).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch coordinates' });
  }
});

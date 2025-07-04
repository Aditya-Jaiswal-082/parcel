// server/models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
});

module.exports = mongoose.model('Location', locationSchema);

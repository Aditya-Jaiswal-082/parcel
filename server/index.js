// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ======= Middleware =======
app.use(cors());
app.use(express.json());

// ======= Test Route =======
app.get('/', (req, res) => {
  res.send('🚀 Server is running...');
});

// ======= Connect to MongoDB =======
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
  });
}).catch((err) => console.error('❌ MongoDB connection error:', err));

// ======= Routes =======

// 🔐 Auth (Login/Register)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 📦 Deliveries
const deliveryRoutes = require('./routes/delivery');
app.use('/api/delivery', deliveryRoutes);

// 🛎️ Notifications (In-App)
const notificationRoutes = require('./routes/notification');
app.use('/api/notifications', notificationRoutes);

// 🧮 Distance Calculation (if used for pricing)
const distanceRoutes = require('./routes/distance');
app.use('/api', distanceRoutes);

// 🛂 Admin (Manage users, assign deliveries)
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// ======= Error Handling Middleware (optional) =======
app.use((err, req, res, next) => {
  console.error('❌ Internal Error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

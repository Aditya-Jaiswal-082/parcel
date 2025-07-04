// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Server is running...');
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => console.log(err));

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const deliveryRoutes = require('./routes/delivery');
app.use('/api/delivery', deliveryRoutes);

app.use('/api/notifications', require('./routes/notifications'));

const notificationRoutes = require('./routes/notification');
app.use('/api/notifications', notificationRoutes);

app.use('/api/delivery', require('./routes/delivery'));

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);


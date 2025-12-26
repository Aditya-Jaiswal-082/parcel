// server/index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ======= BODY PARSERS (🔥 REQUIRED) =======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======= CORS CONFIG =======
const allowedOrigins = [
  "https://parcelswift.vercel.app",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        return callback(
          new Error("CORS policy does not allow this origin"),
          false
        );
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// ======= TEST ROUTE =======
app.get("/", (req, res) => {
  res.send("🚀 Server is running...");
});

// ======= ROUTES =======
app.use("/api/auth", require("./routes/auth"));
app.use("/api/delivery", require("./routes/delivery"));
app.use("/api/notifications", require("./routes/notification"));
app.use("/api", require("./routes/distance"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/agent", require("./routes/agent"));

// ======= ERROR HANDLER =======
app.use((err, req, res, next) => {
  console.error("❌ Internal Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ======= DB + SERVER =======
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB ATLAS");
    app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

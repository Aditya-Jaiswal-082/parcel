<div align="center">
🚚 ParcelSwift
A Modern Home-to-Home Parcel Delivery Platform

Role-Based • Secure • Scalable • Real-World

🌐 Live Demo (parcelswift.vercel.app)
 •
⚙️ Backend API (parcel-swift.onrender.com)
 •
📂 GitHub Repository (github.com/Aditya-Jaiswal-082/parcel)

</div>
✨ Overview

ParcelSwift is a full-stack parcel delivery web application built to simplify home-to-home logistics using a role-based workflow.
It enables customers to create and track deliveries, agents to manage pickup and drop operations, and administrators to oversee assignments — all with real-time updates and secure access.

Designed for individual users, SMEs, and local vendors, ParcelSwift bridges the gap between enterprise logistics systems and instant delivery platforms.

🌟 Why ParcelSwift?

✔ Real-world logistics problem
✔ Multi-role architecture
✔ Google Maps–powered pricing
✔ Secure JWT authentication
✔ Production deployment (Vercel + Render)

👥 Role-Based Features

1. 👤 Customer

Create parcel delivery requests

Google Maps address autocomplete

Distance-based price calculation

Unique tracking ID for every delivery

Real-time delivery status updates

Email notifications on every event

Cash on Delivery (COD)


2. 🚴 Delivery Agent

View unassigned & assigned deliveries

Claim delivery requests

Update delivery status step-by-step

Confirm COD payment at pickup

In-app notifications


3. 🛠 Administrator

Assign deliveries to agents

Monitor delivery lifecycle

Handle cancellations with reasons

Manage users and agents

System-wide visibility


🔄 Delivery Workflow
Created → Assigned → On Pickup → Payment Done → In Progress → Delivered


✔ Transparent
✔ Trackable
✔ Accountable

🧠 Problem Solved

Traditional parcel systems suffer from:

Limited transparency

Manual coordination

Poor communication

Expensive enterprise tools

ParcelSwift delivers:

Clear delivery lifecycle

Automated notifications

Secure role-based access

Affordable, scalable logistics


🛠 Tech Stack

Frontend

⚛️ React.js

🎨 Tailwind CSS

🧠 JavaScript

Backend

🟢 Node.js

🚀 Express.js

🔐 JWT Authentication

Database

🍃 MongoDB

☁️ MongoDB Atlas

Integrations

📍 Google Maps Autocomplete API

📏 Google Distance Matrix API

📧 Nodemailer


🌐 Deployment
Layer	     Platform
Frontend	 Vercel
Backend    	Render
Database	MongoDB Atlas

React (Vercel)
   ↓
Node + Express (Render)
   ↓
MongoDB Atlas


🔐 Security

JWT-based authentication

Role-based authorization

Secure API endpoints

Duplicate order prevention

Environment-based configs


⚙️ Local Setup
git clone https://github.com/yourusername/parcelswift.git

npm install

Create .env file:

MONGO_URI=
JWT_SECRET=
GOOGLE_MAPS_API_KEY=
EMAIL_CREDENTIALS=

Run server:

npm start


🧪 Testing

Unit Testing (APIs)

Integration Testing

Manual UAT (User / Agent / Admin)

API testing via Postman


🚧 Limitations

Only Cash on Delivery supported

No live GPS tracking

Semi-manual agent assignment

Rewards & referrals pending


🚀 Future Enhancements

💳 UPI / Wallet / Card payments

📡 Live GPS tracking (WebSockets)

🤖 AI-based agent assignment

🎁 Referral & reward system

📊 Advanced admin analytics
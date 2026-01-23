<div align="center">
ParcelSwift
A Modern Home-to-Home Parcel Delivery Platform

Role-Based • Secure • Scalable • Production-Ready

Live Demo (https://parcelswift.vercel.app)
 •
Backend API (https://parcel-swift.onrender.com)

</div>

✨ Overview

ParcelSwift is a full-stack web application designed to streamline home-to-home parcel delivery through a secure, role-based system.
It provides dedicated dashboards for Customers, Delivery Agents, and Administrators, enabling transparent delivery tracking, efficient agent assignment, and automated notifications.

Built as a real-world logistics solution for individuals, SMEs, and local vendors.


Why ParcelSwift?

Real-world logistics use case
Role-based access control (RBAC)
Google Maps powered pricing & tracking
Secure JWT authentication
Deployed on cloud (Vercel + Render)
Scalable backend architecture

💠User Roles & Features

1. Customer

Create parcel delivery requests

Google Maps Autocomplete for pickup & drop

Distance-based delivery pricing

Unique tracking ID for every parcel

Real-time delivery status tracking

Email notifications at every stage

Cash on Delivery (COD)


2. Delivery Agent

View unassigned & assigned deliveries

Claim delivery requests

Update delivery status step-by-step

Confirm COD payment at pickup

In-app notifications

3. Administrator

Assign deliveries to agents

Monitor complete delivery lifecycle

Handle cancellations with reasons

Manage users & agents

Full system visibility


🔄 Delivery Lifecycle

Created → Assigned → On Pickup → Payment Done → In Progress → Delivered


This structured flow ensures transparency, accountability, and traceability.


🧠 Problem Solved

Traditional delivery systems suffer from:

Poor transparency

Manual coordination

Limited notifications

Enterprise-only solutions

ParcelSwift solves this by offering:

Clear multi-step tracking

Automated notifications

Secure role-based workflows

Affordable logistics for SMEs


Tech Stack

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

Tools & Platforms

Git & GitHub

Postman

VS Code

npm

Vercel (Frontend Hosting)

Render (Backend Hosting)


Deployment Architecture

React Frontend (Vercel)
        ↓
Node.js + Express API (Render)
        ↓
MongoDB Atlas
        ↓
Google Maps APIs & Email Services


🔐 Security

JWT-based authentication

Role-based authorization

Secure REST APIs

Duplicate order prevention

Environment-based configuration



⚙️ Local Setup (Run Locally)
1️⃣ Clone the Repository
git clone https://github.com/Aditya-Jaiswal-082/parcel.git
cd parcelswift

2️⃣ Install Dependencies
Backend
cd backend
npm install

Frontend
cd ../frontend
npm install

3️⃣ Configure Environment Variables

Create a .env file inside the backend folder:

MONGO_URI=your_mongodb_connection_string 
JWT_SECRET=your_jwt_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password


⚠️ Do not commit .env files to GitHub.
Add .env file in the .gitignore

4️⃣ Run the Application

Start Backend
cd backend
npm start

Runs on:

http://localhost:5000


Start Frontend
cd frontend
npm start

Runs on:

http://localhost:3000


Testing

Unit Testing (Backend APIs)

Integration Testing (Frontend ↔ Backend)

Manual User Acceptance Testing (User / Agent / Admin)

API testing using Postman



Current Limitations

Only Cash on Delivery supported

No live GPS tracking yet

Agent assignment is semi-manual

Rewards & referral system pending


Future Enhancements

💳 UPI / Wallet / Card payments

📡 Live parcel tracking (WebSockets + GPS)

🤖 AI-based agent assignment

🎁 Referral & rewards system

📊 Advanced admin analytics

🧩 E-commerce platform integration


Aditya Jaiswal
jaiswaladitya.vercel.app
Bachelor of Engineering – Computer Science
Parul University, Vadodara


📄 License

Developed as a major academic project.
Open for learning, demonstration, and portfolio use.

<div align="center">
⭐ If you like this project, give it a star

Built with a real-world engineering mindset.

</div>
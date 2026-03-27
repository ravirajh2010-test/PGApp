# PG Stay

A full-stack web application for managing a Paying Guest (PG) accommodation system.

## Features

- User roles: Admin, Tenant, Guest
- Admin: Manage tenants, view occupancy
- Tenant: View profile, pay rent via Razorpay
- Guest: View available beds

## Tech Stack

- Frontend: React with Tailwind CSS
- Backend: Node.js with Express
- Database: PostgreSQL
- Payment: Razorpay

## Setup

1. Clone the repo
2. Set up PostgreSQL and run schema.sql
3. Install backend dependencies: cd backend && npm install
4. Install frontend dependencies: cd frontend && npm install
5. Set up .env files
6. Run backend: npm run dev
7. Run frontend: npm run dev

## Environment Variables

- DATABASE_URL
- JWT_SECRET
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
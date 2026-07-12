# Butchery Frontend

React app (built with Vite) that talks to the butchery-backend API.
This first version has ONE screen: it lists your branches, and its only
real job is to prove the frontend can reach the backend — same idea as
testing /api/branches first when the backend was built.

## Setup

1. Make sure `butchery-backend` is already running (`npm start` in that
   folder) — this frontend has nothing to show without it.

2. In this folder, install dependencies:
   ```
   npm install
   ```

3. Copy the environment template:
   ```
   cp .env.example .env
   ```
   The default (`http://localhost:4000/api`) will work as long as the
   backend is running on port 4000, which it is by default.

4. Start the dev server:
   ```
   npm run dev
   ```
   Vite will print a local URL, usually `http://localhost:5173` — open
   that in your browser.

## What you should see

- A page titled "Butchery ERP" with a status pill in the top right
- If the backend is running: "connected", and your three branches
  listed below (Main branch, Branch B, Branch C)
- If the backend is NOT running: "connection failed", with a plain
  explanation of what to check

## What's next (not built yet)

- The daily closing entry screen (matches the wireframe from earlier)
- The main branch breakdown/allocation screen
- The report dashboard
- Login (once authentication is added to the backend)

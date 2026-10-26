# Subscription Watchdog

A minimal, aesthetic web app that tracks your subscriptions, shows what renews next
and how much you spend each month and year.

Stack: React (Vite, JavaScript) + Node.js (Express) + MongoDB (view data in Compass).

```
25070521016/
  server/   backend (Express API, MongoDB models, JWT auth)
  client/   frontend (React)
```

## Run it

You need Node.js and MongoDB running locally (check in Compass: mongodb://localhost:27017).

Terminal 1 - backend:
```
cd server
npm install
npm run dev
```
Expect: `MongoDB connected` and `Server running on http://localhost:5000`

Terminal 2 - frontend:
```
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Using it
1. Register an account, then sign in.
2. Click "Add subscription", pick a preset (or type your own), set the price and next renewal date.
3. The dashboard shows monthly and yearly spend, a renewal radar sorted by urgency
   (green, amber, red), and a spend-by-category breakdown.
4. Renewal dates roll forward automatically once they pass.
5. Sign out from the top right.

## See the data in Compass
Database: `subscription_watchdog`, collections: `users`, `subscriptions`
(they appear after you register and add your first subscription).

## API
| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | no | create account |
| POST | /api/auth/login | no | sign in, returns JWT |
| GET | /api/auth/me | yes | current user |
| GET | /api/subscriptions | yes | list (past renewal dates are rolled forward) |
| POST | /api/subscriptions | yes | add |
| PUT | /api/subscriptions/:id | yes | edit |
| DELETE | /api/subscriptions/:id | yes | delete |

Preset prices are typical values in INR and are only starting points. Edit them freely.

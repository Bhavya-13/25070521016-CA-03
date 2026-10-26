# Watchdog

A premium, multi-page subscription management platform: track recurring subscriptions, watch upcoming
renewals, understand your spending and decide what to keep.

Stack: React (Vite, JavaScript) + Node.js (Express) + MongoDB (view the data in Compass).
Icons: lucide-react. Charts are hand-built SVG components, so there is no charting dependency.

```
25070521016/
  server/   Express API, MongoDB models, JWT auth
  client/   React app
```

## Run

MongoDB must be running locally (check Compass: mongodb://localhost:27017).

Terminal 1 (backend):
```
cd server
npm install
npm run dev
```
Expect `MongoDB connected` and `Server running on http://localhost:5000`.
If `server/.env` is missing, copy `.env.example` to `.env` and set `JWT_SECRET` to a long random string.

Terminal 2 (frontend):
```
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Pages

| Route | Purpose |
|---|---|
| /dashboard | Overview: KPIs, upcoming charges chart, renewals, categories, insights preview |
| /subscriptions (and /subscriptions/:id) | Search, filter, sort, grid or table view, details drawer, add / edit / pause / delete |
| /calendar | Month, week and agenda views with 7 / 30 / 90 day totals |
| /analytics | Recorded history, category, billing and cost charts, CSV export |
| /insights | Automated rule-based insights with dismiss, snooze and resolve |
| /savings | Budget, savings goal, what-if calculator and opportunities |
| /settings | Profile, theme, currency and locale, notifications, import / export, security |

Press Ctrl+K (or Cmd+K) anywhere for global search.

## How the numbers work

- Monthly equivalent: weekly x 52 / 12, monthly x 1, quarterly / 3, yearly / 12, custom = price x (365 / days) / 12.
- Only **active** subscriptions in your display currency are added up. Paused and cancelled ones are not.
  Other currencies are listed but left out of totals; nothing is ever converted.
- Annualized and projected figures are projections, not money already spent.
- "Scheduled" charges use the next billing date you saved. Later repeats are labelled "Estimated".
- History charts use monthly snapshots Watchdog records itself while you use it. Nothing is back-filled.
  Price history is recorded when you change a price in Watchdog.
- "Mark as cancelled" only changes tracking inside Watchdog. It does not cancel anything with the provider.
- Insights are automated rules over your own data. No AI model, no bank, no email access.
- Notifications are in-app only. No email or push messages are sent.

## Data note

Subscriptions now live in the `subscriptions_v2` collection (dates are stored as plain YYYY-MM-DD strings).
Records from the earlier version stay in the old `subscriptions` collection, untouched. You can drop that
collection in Compass once you no longer need it. Users, passwords and logins are unchanged.

## API

| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | create account, sign in |
| GET | /api/auth/me | current user |
| PUT | /api/auth/profile, /api/auth/password | update name, change password |
| GET / PUT | /api/settings | preferences, budget, goal, notification and insight state |
| GET | /api/subscriptions?today=YYYY-MM-DD | list (past renewal dates roll forward) |
| POST / PUT / DELETE | /api/subscriptions(/:id) | add, edit, delete |
| PATCH | /api/subscriptions/:id/status | active, paused, cancelled |
| POST | /api/subscriptions/:id/review | mark reviewed |
| POST | /api/subscriptions/import | CSV import with validation and duplicate skipping |
| POST / DELETE | /api/subscriptions/demo | load or clear clearly labelled demo data |
| DELETE | /api/subscriptions?confirm=yes | reset all subscriptions |
| GET | /api/analytics/history | recorded monthly snapshots |

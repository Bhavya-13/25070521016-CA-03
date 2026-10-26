<div align="center">

# Watchdog

**Your subscriptions, under control.**

Know what you pay, what renews next, and what you can cut.

React · Node.js · Express · MongoDB · 100% JavaScript

</div>

---

## Why this exists

Most of us pay for things we forgot about. A streaming plan we stopped using, a cloud upgrade that renewed quietly, a free trial that was never free.

**Watchdog puts every subscription in one place, so nothing renews by surprise.**

## What you get

- **Overview:** monthly and yearly spend, upcoming charges, renewals due this week
- **Subscriptions:** add, edit, pause, delete; search, filter and sort
- **Mark as paid:** record payments yourself, and get flagged when a renewal passes unmarked
- **Calendar:** every renewal in month, week or agenda view
- **Analytics:** where the money goes, by category, plan and billing cycle
- **Insights:** costly services, busy renewal weeks, price hikes, overlaps
- **Savings Planner:** budget, "what if I cancel this?" and a savings goal
- **Wallet:** a balance you can use to mark renewals as paid (see below)
- **Also:** light and dark theme, CSV import and export, `Ctrl + K` search

## The wallet (honest version)

Right now the wallet is **just a number**. Adding money doesn't charge anyone, and paying from it doesn't pay Netflix. It records a payment you confirm, and every movement goes into a ledger.

It is built so real payments can be added later: a payment gateway (Razorpay, Stripe) could top it up through a signed webhook, and renewals could be paid in one tap. Paying providers directly and holding other people's money are regulated, so that part needs a licensed partner.

## Run it

You need Node.js and MongoDB running locally.

```bash
# terminal 1
cd server
npm install
npm run dev

# terminal 2
cd client
npm install
npm run dev
```

Open **http://localhost:5173**, sign up, then go to **Settings, Data management, Load demo data** to see it filled in.

Create `server/.env` if it's missing (copy `.env.example`) and set `JWT_SECRET` to any long random string.

## Built with

| | |
|---|---|
| Frontend | React 18, Vite, React Router, Lucide icons, hand-built SVG charts |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT, passwords hashed with bcryptjs |

```
25070521016/
├── server/   API, models, routes
└── client/   React app
```

## Good to know

- Totals count only **active** subscriptions in your chosen currency. Nothing is converted.
- "Mark as cancelled" only changes tracking in Watchdog. It doesn't cancel anything with the provider.
- Insights are simple rules on your own data. No AI, no bank access.
- Not built yet: password reset, email reminders, real payments.

## Troubleshooting

- **`Failed to resolve import "lucide-react"`:** run `npm install` in `client`.
- **`MongoDB connection failed`:** start the MongoDB service.
- **Port 5000 busy:** change `PORT` in `server/.env` and the proxy in `client/vite.config.js`.

---

Built by **Bhavya Agrawal**.

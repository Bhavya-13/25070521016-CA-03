<div align="center">

# Watchdog

**Your subscriptions, under control.**

Know what you pay, what renews next, and what you can cut.

`React` · `Node.js` · `Express` · `MongoDB` · 100% JavaScript

</div>

---

## Why this exists

Most of us pay for things we forgot about: a streaming plan we stopped using, a cloud upgrade that renewed quietly, a free trial that was never free.

**Watchdog puts every subscription in one place, so nothing renews by surprise.**

## What you get

| | |
|---|---|
| **Overview** | Monthly and yearly spend, upcoming charges, renewals due this week |
| **Subscriptions** | Add, edit, pause, delete. Search, filter and sort, in cards or a table |
| **Mark as paid** | Record payments yourself, with undo and skip. Unpaid renewals get flagged |
| **Calendar** | Every renewal in month, week or agenda view |
| **Analytics** | Where the money goes, by category, plan and billing cycle |
| **Insights** | Costly services, busy renewal weeks, price hikes, overlaps |
| **Savings Planner** | Budget, "what if I cancel this?" and a savings goal |
| **Wallet** | A balance you can use to pay renewals (see below) |
| **Currencies** | Everything shown in the currency you pick, converted at live rates |
| **Also** | Light and dark theme, CSV import and export, `Ctrl + K` search, notifications |

## Multiple currencies

Subscribe in ₹, $, € or £ and see one total. Rates come from a free public API (with a backup source) and are cached, so the app still works offline with the last known rates. You can also set your own rate in **Settings**. Each card keeps the original price underneath, like `≈ $6.24` with `₹499 originally`.

> Rates are approximate and for planning, not accounting.

## The wallet (honest version)

Right now the wallet is **just a number**. Adding money doesn't charge anyone, and paying from it doesn't pay Netflix. It records a payment you confirm, and every movement goes into a ledger. It can pay a subscription in another currency too, converting at the current rate. Undo refunds exactly what was taken.

It is built so real payments can be added later, for example a gateway like Razorpay or Stripe topping it up through a signed webhook. Paying providers directly and holding other people's money are regulated, so that part needs a licensed partner.

## Run it

You need **Node.js** and **MongoDB** running locally.

```bash
# terminal 1: API
cd server
cp .env.example .env      # then set JWT_SECRET to any long random string
npm install
npm run dev

# terminal 2: app
cd client
npm install
npm run dev
```

Open **http://localhost:5173**, sign up, then go to **Settings → Data management → Load demo data** to see it filled in.

## Built with

| | |
|---|---|
| Frontend | React 18, Vite, React Router, Lucide icons, hand-built SVG charts |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT, passwords hashed with bcryptjs |
| Rates | ExchangeRate-API, Frankfurter as fallback |

```
25070521016/
├── server/   API, models, routes
└── client/   React app
```

## Good to know

- Totals count only **active** subscriptions.
- "Mark as cancelled" only changes tracking in Watchdog. It doesn't cancel anything with the provider.
- Insights are simple rules on your own data. No AI, no bank access.
- Not built yet: password reset, email reminders, real payments.

## Troubleshooting

- **`Failed to resolve import "lucide-react"`:** run `npm install` in `client`.
- **`MongoDB connection failed`:** start the MongoDB service.
- **Port 5000 busy:** change `PORT` in `server/.env` and the proxy in `client/vite.config.js`.
- **Amounts show without `≈`:** rates couldn't be fetched. Check your internet, or set a rate yourself in Settings.

---

<div align="center">

Built by **Bhavya Agrawal**

</div>

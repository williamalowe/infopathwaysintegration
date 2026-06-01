# SOAP Wrapper — CSYV1000 (Vercel)

REST wrapper for the CSYV1000 SOAP endpoint, built for Vercel serverless deployment.

---

## Project Structure

```
soap-wrapper-vercel/
├── api/
│   └── index.js      # Express app (exported for Vercel)
├── vercel.json        # Routes all requests to api/index
├── package.json
├── .env.example
└── .gitignore
```

---

## Deploy to Vercel

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel        # follow the prompts
```
Then set your environment variables:
```bash
vercel env add SOAP_ENDPOINT
vercel env add API_KEY        # optional
```
Redeploy to apply them:
```bash
vercel --prod
```

### Option B — GitHub import
1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new → Import your repo
3. Add environment variables in the Vercel dashboard under **Settings → Environment Variables**
4. Deploy

---

## Local Development

```bash
npm install
npm install -g vercel       # if not already installed
cp .env.example .env        # fill in your values
vercel dev                  # runs locally on http://localhost:3000
```

---

## Endpoints

| Method | Route | Required fields |
|---|---|---|
| GET | `/health` | — |
| POST | `/logon` | `userId`, `password` |
| POST | `/logoff` | `sessionId` |
| POST | `/external` | `sessionId`, `method` |

See the main README for full field documentation and example request bodies.

---

## Environment Variables

| Variable | Description |
|---|---|
| `SOAP_ENDPOINT` | Full URL of your SOAP service |
| `API_KEY` | (Optional) Protects routes with `x-api-key` header |

> **Note:** Vercel's free tier has a 10-second function timeout. If your SOAP server is slow, upgrade to Pro (60s) or set a shorter axios timeout to fail fast.

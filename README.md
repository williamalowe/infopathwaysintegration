# SOAP Wrapper — CSYV1000

A lightweight REST wrapper that accepts JSON and forwards requests to the CSYV1000 SOAP endpoint. Supports LOGON, LOGOFF, and EXTERNAL operations.

---

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
npm start
```

For development with auto-reload:
```bash
npm run dev
```

---

## Endpoints

### `GET /health`
Returns wrapper status and configured SOAP endpoint.

---

### `POST /logon`
Logs in and returns a session.

**Required fields:**
| Field | Description |
|---|---|
| `userId` | Your Pathway user ID |
| `password` | Your password |

**Optional fields:**
| Field | Default |
|---|---|
| `service` | `CSYV1000` |
| `trace` | `""` |
| `groupId` | `""` |
| `product` | `External 1.0.0.0` |
| `processId` | `1` |
| `threadId` | `1` |
| `nodeId` | `""` |
| `ipAddress` | `""` |
| `sourceUserId` | `""` |
| `sourceOSUserId` | `""` |
| `uiForm` | `External` |
| `groupIdPrevious` | `""` |
| `osUserId` | `""` |

**Example:**
```json
{
  "userId": "myuser",
  "password": "mypassword",
  "nodeId": "MY-APP",
  "ipAddress": "127.0.0.1"
}
```

---

### `POST /logoff`
Ends an active session.

**Required fields:**
| Field | Description |
|---|---|
| `sessionId` | Session ID returned from `/logon` |

**Optional fields:** same as `/logon` minus `userId`, `password`, `osUserId`.

**Example:**
```json
{
  "sessionId": "YOUR_SESSION_ID",
  "sourceUserId": "myuser",
  "nodeId": "MY-APP"
}
```

---

### `POST /external`
Performs an external operation (e.g. CreateRequest).

**Required fields:**
| Field | Description |
|---|---|
| `sessionId` | Active session ID from `/logon` |
| `method` | Method name e.g. `CreateRequest` |

**Optional base fields:** same as `/logoff`.

**Optional `requestData` object:**
| Field | Default |
|---|---|
| `requestTypeCode` | `""` |
| `description` | `""` |
| `notes` | `""` |
| `priority` | `""` |
| `nameNumber` | `""` |
| `propertyId` | `""` |
| `contactName` | `""` |
| `contactPhone` | `""` |
| `contactEmail` | `""` |

**Example:**
```json
{
  "sessionId": "YOUR_SESSION_ID",
  "method": "CreateRequest",
  "sourceUserId": "myuser",
  "nodeId": "MY-APP",
  "requestData": {
    "requestTypeCode": "WLEAKS",
    "description": "Water leak in unit 4B",
    "notes": "Reported by tenant",
    "contactName": "Jane Smith",
    "contactPhone": "0400000000",
    "contactEmail": "jane@example.com"
  }
}
```

---

## Typical Flow

```
POST /logon      →  get sessionId
POST /external   →  use sessionId to perform actions
POST /logoff     →  end session
```

---

## Auth (Optional)

Set `API_KEY` in your `.env`. All requests must then include:
```
x-api-key: your-secret-key
```

---

## Cloud Deployment

### Railway
1. Push to GitHub
2. New project → Deploy from GitHub repo
3. Set environment variables in Railway dashboard
4. Railway sets `PORT` automatically

### Render
1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in dashboard

### Environment Variables
| Variable | Description |
|---|---|
| `SOAP_ENDPOINT` | Your full SOAP URL |
| `API_KEY` | (Optional) Secret key for auth |

# BranchLink – Virtual Branch Assistance Platform
React.js · Spring Boot (REST + WebSocket) · MySQL · WebRTC · JWT

## Run (3 steps)
1. **MySQL** running locally (user `root`). Password defaults to `root`; override with env var `DB_PASS`. The `branchlink` database and all tables are created automatically, and demo data is seeded on first start.
2. **Backend** (Java 17 + Maven): `cd backend && mvn spring-boot:run`   → http://localhost:8080
3. **Frontend** (Node 18+): `cd frontend && npm install && npm run dev`  → open http://localhost:5173

### 🌐 Free Cloud Deployment (1-Click on Render / Railway)
BranchLink can be deployed **completely free of charge** ($0/month) with zero configuration. Automatic HTTPS is provided, ensuring WebRTC camera/audio permissions work out of the box.

- **Render.com (Recommended)**: Connect your GitHub repo to Render and choose **Docker** runtime. It automatically detects the root [`Dockerfile`](Dockerfile) and [`render.yaml`](render.yaml).
- **Railway.app**: Deploy with 1 click using the root [`railway.json`](railway.json) and [`Dockerfile`](Dockerfile).
- **Free Cloud MySQL**: Optional persistent MySQL via TiDB Cloud Serverless (5GB free forever).
- **Instant Public URL**: Expose your local instance to a public HTTPS URL via Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8080`).

👉 **See the full step-by-step guide in [DEPLOYMENT.md](DEPLOYMENT.md)**.

### Local One-Command Launch (Unified Full-Stack)
Run the full stack (Frontend + Backend + Database) in a single service:
- **Windows**: Run `build-and-run.bat`
- **Linux / macOS**: Run `./build-and-run.sh`
- Accessible at: `http://localhost:8080`

### Multi-Container Launch (Docker Compose)
To run with separate Nginx and MySQL containers:
```bash
docker compose up --build -d
```
Accessible at: `http://localhost` (Frontend with reverse proxy to API & WebSocket on `/api` and `/ws`).

## Demo logins
| Role | Email | Password | Responsibilities |
|---|---|---|---|
| Admin | admin@branchlink.com | admin123 | Create base branches & provision branch staff accounts |
| Staff (Vijayawada) | staff1@branchlink.com | staff123 | Manage branch capacity, register customers, verify KYC docs & join video calls |
| Staff (Warangal) | staff2@branchlink.com | staff123 | Regional branch officer operations & customer provisioning |
| Customer | customer@branchlink.com | demo123 | Book branch assistance, upload documents & join video calls |

## 5-minute live demo script
Use **two browser windows** (one normal, one Incognito) on localhost, so camera/WebRTC works without HTTPS.
1. Window A: log in as **staff1** → *Slots* → click **⚡ Quick demo slot**.
2. Window B: log in as **customer** → *Book* → pick the slot + purpose → booked (status BOOKED).
3. A: *Dashboard* → **Confirm** (customer gets a notification 🔔). Try **Reschedule** / **Cancel** to show staff controls.
4. Within ~2 min the status flips to IN_PROGRESS automatically (scheduler). Both click **Join call** → live peer-to-peer video.
5. B uploads a PDF/JPG in the call's side panel → A clicks **View**, then **Verify** (or Reject with remarks) → B sees the status/remarks.
6. A clicks **Complete session**. Show *Audit trail* tab (every login, booking, call join, document action).

## Architecture & Production Security Features
- **Security & Session Governance**: BCrypt passwords, JWT checked by servlet filter, role checks (`ADMIN`, `STAFF`, `CUSTOMER`), branch scoping, 5-minute inactivity auto-logout protection on client.
- **Time-Gated Call Access**: Calls are strictly locked until the scheduled booking time arrives, verified at both client and server (API join endpoint + WebSocket signaling handler).
- **Provisioning Hierarchy**:
  - **Admin**: Creates base branches and provisions branch staff accounts.
  - **Base Branch Staff**: Creates and manages customer accounts belonging to their branch.
  - **Customer**: Accesses virtual services, books appointments, and attends encrypted sessions.
- **Profile Self-Management**: Users can securely update their name, email, and password from their dashboard with current-password verification.
- **Smart Notification Deep Linking**: Tapping any notification instantly routes the user to the corresponding tab/section.
- **Video & Signaling**: WebRTC peer-to-peer with STUN/TURN support; Spring WebSocket (`/ws`) relays offer/answer/ICE, JWT-authenticated and restricted to the 2 participants. Media never touches the server.


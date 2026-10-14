# BranchLink – 100% Free Cloud Deployment Guide

BranchLink is packaged to run **completely free of charge ($0/month)** on modern cloud platforms. 

Because BranchLink uses WebRTC video calling, browsers mandate an **HTTPS (SSL)** connection for camera and microphone permissions (`navigator.mediaDevices.getUserMedia`). All the deployment options below automatically provide free SSL certificates.

---

## Architecture for Free Hosting

```
                     ┌──────────────────────────────────────┐
                     │   Single Free Container / Service    │
                     │  (e.g., Render.com or Railway.app)   │
                     ├──────────────────────────────────────┤
Client Browser ────► │  Port 8080 (HTTPS / WSS)             │
(React UI + WebRTC)  │  ├─ /             (Vite React UI)    │
                     │  ├─ /api/*        (Spring Boot REST) │
                     │  ├─ /ws           (WebRTC Signaling) │
                     │  └─ Embedded DB   (H2 / MySQL)       │
                     └──────────────────────────────────────┘
```

- **Unified Single Container**: The React frontend is compiled and packaged directly into the Spring Boot executable JAR (`Dockerfile`). You only need **one free web service**, avoiding CORS errors and eliminating the cost of separate frontend and backend services.
- **Zero-Config Database**: If no `DB_URL` is provided, BranchLink automatically initializes an embedded persistent database in `./data/` and seeds the demo admin, branch officers, and test customer accounts on startup.
- **Cloud MySQL Support**: If you want a persistent cloud MySQL database, connect **TiDB Cloud Serverless** (5 GB Free Forever, no credit card required).

---

## Option 1: Render.com (Recommended – 100% Free Forever)

[Render](https://render.com) offers 750 free instance hours per month with automatic HTTPS and WebSocket support.

### Step 1: Push Code to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Push this project to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for BranchLink deployment"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation and select **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repository.
4. Render will auto-detect the root `Dockerfile` and `render.yaml`. Set the following:
   - **Name**: `branchlink` (or any custom name)
   - **Region**: Choose the closest region to you (e.g., *Singapore*, *Oregon*, or *Frankfurt*)
   - **Runtime**: `Docker`
   - **Instance Type**: **Free** ($0/month)
5. Under **Environment Variables**, ensure:
   - `PORT`: `8080`
   - `JWT_SECRET`: `your-custom-jwt-secret-string-0123456789`
6. Click **Deploy Web Service**.

Render will build the multi-stage Dockerfile (compiling the React frontend, embedding it into Spring Boot, and launching the server). Within 3–5 minutes, your application will be live at:
```
https://<your-service-name>.onrender.com
```

---

## Option 2: Railway.app (Free Trial Credits)

[Railway](https://railway.app) provides $5 in free monthly trial credit with fast build times and one-click MySQL provisioning.

1. Go to [Railway](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically read `railway.json` and `Dockerfile`.
5. Click **Add Variable**:
   - `PORT`: `8080`
6. Click **Generate Domain** in Service Settings to get your public HTTPS URL.
7. *(Optional)* Click **New** → **Database** → **Add MySQL** in the Railway canvas to link a managed MySQL database, and bind the `DB_URL` environment variable.

---

## Option 3: Free Cloud MySQL with TiDB Cloud Serverless

If you want a dedicated cloud MySQL database that persists data forever across container rebuilds:

1. Sign up for free at [TiDB Cloud](https://tidbcloud.com) (no credit card required).
2. Click **Create Cluster** and select **Serverless** (Free 5 GiB storage forever).
3. Under cluster settings, click **Connect** → **General connection** → select **JDBC**.
4. Note your host, port (default 4000), user, and password.
5. In your Render or Railway Web Service environment settings, add:
   - `DB_URL`: `jdbc:mysql://<your-tidb-host>:4000/branchlink?sslMode=VERIFY_IDENTITY`
   - `DB_USER`: `<your-tidb-username>`
   - `DB_PASS`: `<your-tidb-password>`

BranchLink will automatically connect to TiDB Cloud using the MySQL 8 protocol, create all tables, and seed the demo data.

---

## Option 4: Split Deployment (Vercel Frontend + Render Backend)

If you prefer hosting the React frontend on **Vercel** or **Netlify** edge CDN and the backend on Render:

1. **Backend (Render)**:
   - Deploy only the `backend` folder or Docker service on Render.
   - Note your backend URL (e.g., `https://branchlink-api.onrender.com`).
2. **Frontend (Vercel)**:
   - Go to [Vercel](https://vercel.com) → **Add New Project** → Import your repo.
   - Set **Root Directory** to `frontend`.
   - Add Environment Variables:
     - `VITE_API_URL`: `https://branchlink-api.onrender.com`
     - `VITE_WS_URL`: `wss://branchlink-api.onrender.com`
   - Click **Deploy**.
   - Vercel will deploy the frontend to `https://<your-project>.vercel.app` with pre-configured rewrite rules in `frontend/vercel.json`.

---

## Option 5: Instant Free Public URL via Cloudflare Tunnel (No Cloud Account Required)

If you want to run BranchLink on your local computer and share a public, SSL-encrypted URL with anyone in the world immediately:

1. Download the free [Cloudflare Tunnel executable (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Start the packaged BranchLink server:
   ```bash
   cd backend
   java -jar target/branchlink-1.0.jar
   ```
3. In another terminal, run:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```
4. Cloudflare will instantly output a public URL such as:
   ```
   https://random-words.trycloudflare.com
   ```
   Anyone can open this link in any browser, log in, upload documents, and participate in peer-to-peer WebRTC video calls with valid SSL encryption.

---

## Demo Credentials

Once deployed, use these pre-seeded accounts:

| Role | Email | Password | Scope |
|---|---|---|---|
| **Admin** | `admin@branchlink.com` | `admin123` | System management, branches, staff accounts |
| **Staff (Vijayawada)** | `staff1@branchlink.com` | `staff123` | Slots, customer bookings, KYC verification, video call |
| **Staff (Warangal)** | `staff2@branchlink.com` | `staff123` | Regional branch operations |
| **Customer** | `customer@branchlink.com` | `demo123` | Slot booking, document uploads, live video call |

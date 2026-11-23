# Fall Detection (Milestone D) — Windows PC Setup & Run Guide

This guide walks you through setting up and running the complete **End-to-End Fall Detection System** on a Windows computer.

---

## 1. Prerequisites Checklist (Windows)

Make sure the following are installed on your Windows machine:

1. **Git for Windows** ([gitforwindows.org](https://gitforwindows.org/))
2. **Node.js** (v18+ or v20+) ([nodejs.org](https://nodejs.org/))
3. **Python 3.10, 3.11, or 3.12** ([python.org](https://www.python.org/downloads/))
   - *Important during install:* Check the box **"Add python.exe to PATH"**.
4. **MongoDB Community Server & Compass** ([mongodb.com](https://www.mongodb.com/try/download/community))
   - Ensure the MongoDB Windows Service is running (Default port: `27017`).
5. **Webcam** (built-in or USB webcam) and a modern browser (Google Chrome or Microsoft Edge recommended).

---

## 2. Clone & Switch Branch

Open **PowerShell** or **Command Prompt** (CMD):

```powershell
cd "path\to\your\workspace"
git fetch origin
git checkout feat/fall-detection-milestone-d
git pull origin feat/fall-detection-milestone-d
```

---

## 3. Python ML Inference Service Setup

The ML service uses FastAPI and loads the trained `random_forest_baseline` (v1.0.0) classifier on startup.

### 3.1 Open Terminal 1 (Python Service)

```powershell
cd ml\fall-detection
```

### 3.2 Create & Activate Python Virtual Environment

**In PowerShell:**
```powershell
# If script execution is blocked on Windows, allow local scripts:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1
```

*(Or if using Command Prompt `cmd.exe`: `.\.venv\Scripts\activate.bat`)*

### 3.3 Install Dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -e .
```

### 3.4 Verify ML Tests & Model Artifact

Verify that the versioned model bundle (`models/random_forest_baseline`) and endpoints pass:

```powershell
pytest tests
```
*Expected: 36 passed.*

### 3.5 Start the Python Inference Service

```powershell
uvicorn service.app:app --host 0.0.0.0 --port 8000 --reload
```

> **Health Check:** Open `http://localhost:8000/health` in your browser.  
> You should see:
> ```json
> {"status":"healthy","model_loaded":true,"model_version":"1.0.0"}
> ```

---

## 4. Backend (Node.js / Express) Setup

The backend manages the `/api/fall-detection` routes, persists events to MongoDB (`fallevents` & `fallnotifications`), enforces access control, and proxies inference requests to the internal Python service.

### 4.1 Open Terminal 2 (Backend)

```powershell
cd backend
```

### 4.2 Configure Environment (`backend\.env`)

Ensure your `backend\.env` file has the following entries:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/elderly
JWT_SECRET=elderly_care_super_secret_jwt_key_2026
INFERENCE_SERVICE_URL=http://127.0.0.1:8000
```

### 4.3 Install Dependencies & Build

```powershell
npm install
npm run build
```

### 4.4 Verify Backend Fall Detection Tests

Run the backend integration test suite:

```powershell
npx tsx scripts/test-fall-detection.ts
```
*Expected: All 10 tests pass.*

### 4.5 Start Express Backend Server

```powershell
npm run dev
```
*Server will listen on `http://localhost:3001`.*

---

## 5. Frontend (React / Vite) Setup

The frontend captures camera frames via MediaPipe Pose, buffers temporal windows, communicates with the backend, triggers the visual/audio confirmation dialog, and displays incident history.

### 5.1 Open Terminal 3 (Frontend)

```powershell
cd fe
```

### 5.2 Install Dependencies

```powershell
npm install
```

### 5.3 Verify Frontend Tests

```powershell
npm test
```
*Expected: 30 passed.*

### 5.4 Start Frontend Dev Server

```powershell
npm run dev
```
*Vite will start the dev server at `http://localhost:5173`.*

---

## 6. End-to-End Testing Walkthrough (In Browser)

1. Open your browser (Chrome or Edge) to **`http://localhost:5173`**.
2. **Log in** (or sign up a test account).
3. **Live Fall Monitoring:**
   - Click on the **"Fall Detection Demo"** tab (🚶 icon).
   - Click **"Start Camera"** and click **Allow** when prompted for webcam access.
   - Look at the **Real-Time ML Fall Monitoring** card:
     - State should show `Monitoring Active` (green).
     - Fall probability meter will update live.
     - Latency will show ~30–70 ms, and inference cadence ~1–2 req/s.
4. **Trigger a Fall Test:**
   - Crouch or drop quickly towards the floor in front of the camera.
   - Once 2 consecutive high-risk windows are evaluated, status shifts to `Fall Suspected`.
   - The **"POTENTIAL FALL DETECTED"** modal pops up with an audible chime and a **15-second countdown**.
5. **Test "I'm Okay" (Cancellation):**
   - Click **"I'm Okay"**.
   - Sound stops, event is marked `false_alarm`, and a 15-second cooldown activates.
6. **Test Escalation:**
   - Trigger the modal again and click **"I Need Help!"** (or wait 15 seconds for timeout).
   - The event is confirmed and saved to MongoDB.
7. **Caregiver & History Verification:**
   - Click the **"Fall Incidents"** tab (🚨 icon) in the top navigation.
   - You will see the newly created fall incident card with risk score, detected timestamp, and action buttons (`Acknowledge`, `Mark Resolved`).
   - If switched to a family/caregiver role, the top red **Caregiver Alert Banner** appears automatically.

---

## 7. Common Windows Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `PSSecurityException: ... cannot be loaded because running scripts is disabled` | PowerShell script policy | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell. |
| `Client error 413: request entity too large` | Express payload limit | Already resolved in code (`express.json({ limit: '10mb' })`). Ensure backend is restarted. |
| `Inference service unreachable` in frontend status | Python service not running | Check Terminal 1. Ensure `uvicorn service.app:app` is running on port 8000. |
| Camera doesn't turn on | Windows Privacy Settings | Go to Windows **Settings → Privacy & Security → Camera**, and enable **"Let desktop apps access your camera"**. |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB service stopped | Open Windows **Services** (`services.msc`), find **MongoDB Server**, right-click and select **Start**. |

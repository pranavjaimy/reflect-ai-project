# MindScribe — AI Journaling & Reflection Platform

MindScribe is a production-grade, secure, user-authenticated personal journaling, reflection, and goal-tracking web application built with **Google Cloud Run**, **Firebase Authentication**, **Cloud Firestore**, and the **Gemini API** via `@google/genai`.

---

## 1. System Architecture & Flow Diagrams

### High-Level Architecture Overview
```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|  +------------------------+    +-----------------------+    +----------------------+  |
|  |  React 19 + TypeScript |    | Firebase Auth (Google)|    | Firestore Client SDK |  |
|  |  Tailwind CSS + Lucide |    | Popup / User Context  |    | Owner-Scoped Access  |  |
|  +-----------+------------+    +-----------+-----------+    +-----------+----------+  |
+--------------|-----------------------------|----------------------------|-------------+
               |                             |                            |
               | HTTP / REST                 | Direct Auth                | Direct Sync
               v                             v                            v
+-----------------------------+   +----------------------+   +--------------------------+
|  CLOUD RUN EXPRESS SERVER   |   |   FIREBASE AUTH      |   |     CLOUD FIRESTORE      |
|                             |   |                      |   |                          |
|  - Body Sanitization        |   | - Google Sign-In     |   | users/{uid}              |
|  - Error Recovery Matrix    |   | - Token Issuance     |   |  ├── conversations       |
|  - Resilient AI Fallbacks   |   | - User Identity      |   |  │    └── messages       |
|  - Zero Key Leakage Proxy   |   +----------------------+   |  ├── goals               |
+--------------+--------------+                              |  ├── dailyReflections    |
               |                                             |  └── insights            |
               | Dynamic API Calls                           +--------------------------+
               v
+---------------------------------------------------------------------------------------+
|                                 GOOGLE GEMINI API                                     |
|                                                                                       |
|  [Primary] gemini-3.6-flash  ==>  [Fallback 1] gemini-3.1-flash-lite                 |
|            ==>  [Fallback 2] gemini-flash-latest  ==>  [Fallback 3] gemini-3.7-flash   |
+---------------------------------------------------------------------------------------+
```

### Reflection & AI Interaction Flow
```
[User Types Thought in Studio]
               │
       (Save Entry clicked?)
      ┌────────┴────────┐
     YES                NO (Reflect with Gemini clicked)
      │                 │
[Persist Note Direct]   [1. Save User Message to Firestore]
      │                 │
      │                 [2. Send Request to /api/gemini/chat or /api/gemini/action]
      │                 │
      │                 [3. Express Server: Execute Model Fallback Ladder]
      │                 │
      │                 [4. Stream/Receive Structured Insights & Goals]
      │                 │
      │                 [5. Persist AI Response & Extracted Goals to Firestore]
      │                 │
      └────────┬────────┘
               │
      [Real-Time Cloud State Update] ──> [Update Badge: "✓ Saved to Cloud"]
```

### Daily Review & Growth Synthesis Flow
```
[Daily Journal / Evening Check-in] ──> [Select Mood & Log Realizations]
                                                    │
                                      [Run Synthesis on /api/gemini/action]
                                                    │
                                      [Save Record: users/{uid}/dailyReflections/{YYYY-MM-DD}]
                                                    │
                                      [Increment Reflection Streak Counter]
                                                    │
                                      [AI Insights: Multi-Session Pattern Mining]
                                                    │
                                      [Interactive Growth Dashboard & Milestone Progress]
```

---

## 2. Agentic Threat Model Summary

| Threat Zone | Identified Risks | Countermeasures Implemented |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious payloads, payload size overload | Strict request size limits (`limit: '2mb'`), null-safe destructuring, sanitized string boundaries, controlled system prompts. |
| **Planning & Reasoning** | System instruction bypass, unauthorized diagnostic advice | Strictly constrained system prompts framing all AI output as non-clinical personal observations, never medical/psychological diagnoses. |
| **Tool / AI Execution** | API rate exhaustion (429), transient outages (503), model retirement | **Resilient Model Fallback Ladder** (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with automated error recovery matrix. |
| **Memory & State** | Cross-user data leakage, unauthenticated Firestore read/write, payload crashes | Strict Firestore rules isolating `users/{userId}/*` matching `request.auth.uid == userId`. Recursive `cleanPayload` utility to prevent `undefined` field write crashes. |
| **Inter-System Communication** | Gemini API key leakage to client, token exposure | Server-side Express API proxy. Private keys are never exposed to the frontend or bundled in client code. |

---

## 3. Cloud Firestore Data Schema & Security Rules

### Hierarchy Schema
```
users/{userId}
  ├── profile documents & settings
  ├── conversations/{conversationId}
  │     └── messages/{messageId}
  ├── goals/{goalId}
  ├── dailyReflections/{YYYY-MM-DD}
  └── insights/{insightId}
```

### Deployed Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /conversations/{conversationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
      
      match /goals/{goalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /insights/{insightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /dailyReflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 4. Local Development & Testing Guide

Follow these steps to run and test MindScribe on your local development machine.

### 1. Prerequisites
- **Node.js**: v20.x or v22.x installed
- **npm**: v10.x or higher
- **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)
- **Firebase Project**: A Firebase project with Authentication (Google Sign-In) and Firestore enabled

### 2. Clone and Install Dependencies
```bash
git clone <YOUR_REPOSITORY_URL>
cd mindscribe
npm install
```

### 3. Configure Local Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Populate your `.env` file with your Gemini API key:
```env
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
APP_URL="http://localhost:3000"
```

### 4. Verify `firebase-applet-config.json`
Ensure `firebase-applet-config.json` in the root folder contains your client-safe Firebase project keys:
```json
{
  "projectId": "your-firebase-project-id",
  "appId": "1:123456789:web:abcdef123456",
  "apiKey": "AIzaSyYourFirebaseWebApiKey",
  "authDomain": "your-firebase-project-id.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "your-firebase-project-id.firebasestorage.app",
  "messagingSenderId": "123456789"
}
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build and Type-Check Locally
```bash
# Type check and lint
npm run lint

# Build full-stack production bundle (Vite + esbuild CJS server)
npm run build

# Test production server locally
npm start
```

---

## 5. Deployment to Google Cloud Run

### 1. Enable Required Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Configure Secret Manager
```bash
# Create the secret for Gemini API
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Inject your Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy Application Container
```bash
gcloud run deploy mindscribe-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels dev-tutorial=cloud-run-ai-challenge
```

---

## 6. End-to-End Test Suite & Verification Matrix

| ID | Test Scenario | Step-by-Step Procedure | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **Google Authentication & Session Sync** | 1. Open app.<br>2. Click "Continue with Google".<br>3. Authenticate via Google popup.<br>4. Click "Sign Out". | User doc synced to `users/{uid}` in Firestore. Dashboard renders with greeting. Sign out returns immediately to landing. | Seamless login state with no console auth errors. |
| **TC-02** | **New Reflection Creation** | 1. Click "+ New Reflection" on Dashboard.<br>2. Check top title & tags. | A fresh conversation is created in Firestore and active session canvas opens. | Conversation ID created in Firestore. |
| **TC-03** | **Direct Entry Save (No AI)** | 1. Type *"Focusing on deep work today"* in the textarea.<br>2. Click **"Save Entry"** (`#save-entry-btn`). | Message is saved directly to Firestore subcollection without invoking AI. Input clears, badge shows `Saved to Cloud`. | Message bubble appears with user badge and timestamp. |
| **TC-04** | **AI Reflection Stream** | 1. Enter thoughts into the canvas.<br>2. Click **"Reflect with Gemini"** (or press Cmd+Enter). | User note is saved, Gemini returns an empathetic, structured reflection. Title is auto-generated if untitled. | Assistant bubble renders with Markdown formatting. |
| **TC-05** | **Specialized Reflection Modes** | 1. Select mode chip: **Summarize**, **Deep Reflect**, **Brainstorm**, **Find Themes**, or **Next Steps**.<br>2. Click **"Run on Full Session"**. | Gemini analyzes full conversation context and provides structured modal outputs. | Accurate section headers and actionable bullet points. |
| **TC-06** | **Goal Extraction & Milestone Tracking** | 1. Select **"Extract Goals"** and run on session.<br>2. Click **"Save to My Goals"** on extracted card.<br>3. Open **Goals & Milestones** tab.<br>4. Check off milestones. | Goal appears in Goals Hub with progress bar. Checking off items triggers confetti celebration upon 100% completion. | Goal record saved in `users/{uid}/goals`. |
| **TC-07** | **Daily Evening Review & Streak** | 1. Navigate to **Daily Review** tab.<br>2. Choose mood, type note, click **"Synthesize with Gemini"**. | Evening synthesis saved to `users/{uid}/dailyReflections/{YYYY-MM-DD}`. Streak counter increments. | Daily calendar ribbon displays completion dot. |
| **TC-08** | **AI Growth Synthesis** | 1. Navigate to **AI Insights** tab.<br>2. Click **"Generate Fresh Insights"**. | Synthesis engine analyzes past entries and builds comprehensive Growth Report. | Saved to `users/{uid}/insights/{id}`. |
| **TC-09** | **Data Export & Sovereignty** | 1. Open **Privacy & Export** tab.<br>2. Click **"Export Markdown (.md)"** and **"Export JSON (.json)"**. | Downloads formatted archive files containing all journal data. | Valid .md and .json files downloaded to disk. |
| **TC-10** | **Account & Data Purge** | 1. Click **"Wipe All Data & Delete Account"**.<br>2. Confirm prompt. | All Firestore collections and Firebase Auth user account are permanently deleted. | Redirected to landing screen. |

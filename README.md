# MindScribe — AI Journaling & Reflection Platform

MindScribe is a production-grade, user-authenticated personal journaling, reflection, and goal-tracking web application built with **Google Cloud Run**, **Firebase Authentication**, **Cloud Firestore**, and the **Gemini API** via `@google/genai`.

---

## 1. Agentic Threat Model Summary

| Threat Zone | Identified Risks | Countermeasures Implemented |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious payloads, payload size overload | Strict request size limits (`limit: '2mb'`), null-safe destructuring, sanitized string boundaries, controlled system prompts. |
| **Planning & Reasoning** | System instruction bypass, unauthorized diagnostic advice | Strictly constrained system prompts framing all AI output as non-clinical personal observations, never medical/psychological diagnoses. |
| **Tool / AI Execution** | API rate exhaustion (429), transient outages (503), model retirement | **Resilient Model Fallback Ladder** (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with error recovery matrix. |
| **Memory & State** | Cross-user data leakage, unauthenticated Firestore read/write, payload crashes | Strict Firestore rules isolating `users/{userId}/*` matching `request.auth.uid == userId`. Recursive `cleanPayload` utility to prevent `undefined` field write crashes. |
| **Inter-System Communication** | Gemini API key leakage to client, token exposure | Server-side Express API proxy. Private keys are never exposed to the frontend or bundled in client code. |

---

## 2. Architecture & Data Model

### Cloud Firestore Architecture
```
users/{userId}
  ├── conversations/{conversationId}
  │     └── messages/{messageId}
  ├── goals/{goalId}
  ├── dailyReflections/{YYYY-MM-DD}
  └── insights/{insightId}
```

### Deployed Firestore Security Rules
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

## 3. Deployment & Google Cloud Run Setup

### Prerequisites
1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`).
2. Enable the required Google Cloud APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### Secret Manager Setup
Create and populate the Gemini API key secret in Google Cloud Secret Manager:
```bash
# 1. Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key payload
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run runtime service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploying to Cloud Run
Deploy the application container with the required environment variables and Secret Manager injection:
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

## 4. Comprehensive User Walkthrough & Verification Test Suite

### Test Case 1: Authentication & Protection
- **Action**: Visit application root when signed out.
- **Expected Result**: Landing page displays with feature breakdown, security guarantees, and "Continue with Google" CTA.
- **Action**: Click "Continue with Google".
- **Expected Result**: Firebase Google Auth popup opens. Upon sign-in, user profile document is synced in `users/{uid}` and user is transitioned to the private Dashboard.
- **Action**: Click "Sign Out".
- **Expected Result**: User context is cleared and interface returns to Landing Page immediately.

### Test Case 2: New Reflection & Multi-Turn Gemini Conversation
- **Action**: Click **"Start Reflection"** on Dashboard.
- **Expected Result**: A new session is initialized and opened in Journal Studio.
- **Action**: Type a journal entry (e.g., *"I launched a major project today but felt overwhelmed managing team feedback"*) and press Send (or Cmd+Enter).
- **Expected Result**: User message is immediately saved in Firestore. Gemini responds with empathetic, structured reflection. Title is automatically generated and updated in Firestore.

### Test Case 3: Specialized Reflection Modes
- **Action**: In an active session, select the **"Summarize"** mode chip and click **"Run on Full Session"**.
- **Expected Result**: Gemini generates an executive summary highlighting Core Themes, Key Realizations, and Open Questions.
- **Action**: Select the **"Find Themes"** mode chip and submit.
- **Expected Result**: Gemini identifies underlying emotional and cognitive motifs.
- **Action**: Select **"Suggest Next Steps"** and submit.
- **Expected Result**: Gemini breaks down concrete immediate micro-actions and short-term anchors.

### Test Case 4: AI Goal Extraction & Milestone Tracking
- **Action**: Select the **"Extract Goals"** mode chip in Journal Studio and run on the session.
- **Expected Result**: Gemini extracts structured goals with sequential milestones. An interactive card appears with a **"Save to My Goals"** button.
- **Action**: Click **"Save to My Goals"**.
- **Expected Result**: Goal is stored in `users/{uid}/goals/{goalId}` and toast notification confirms addition.
- **Action**: Navigate to **Goals & Milestones** tab.
- **Expected Result**: The new goal appears. Check off all milestone items. Confetti fires, progress bar reaches 100%, and status updates to "Completed".

### Test Case 5: Evening Daily Reflection & Streak Tracking
- **Action**: Navigate to **"Daily Review"** tab.
- **Expected Result**: Today's date is highlighted in the calendar ribbon.
- **Action**: Select mood (e.g., 😄 Great), enter daily notes, and click **"Synthesize with Gemini"**.
- **Expected Result**: Gemini generates a structured Evening Review (Overview, What Went Well, Challenges, Lessons Learned, Tomorrow's Priority). The reflection is saved in `users/{uid}/dailyReflections/{YYYY-MM-DD}` and streak counter increments.

### Test Case 6: Historical Growth Insights
- **Action**: Navigate to **"AI Insights"** tab and click **"Generate Fresh Insights"**.
- **Expected Result**: Backend queries user's past journal entries and runs pattern synthesis. A comprehensive Growth Synthesis Report renders with Recurring Themes, Progress Timeline, Positive Breakthroughs, Areas to Improve, and Recommended Weekly Focus.

### Test Case 7: Data Sovereignty, Export & Account Deletion
- **Action**: Navigate to **"Privacy & Export"** tab.
- **Action**: Click **"Export as Markdown (.md)"** and **"Export as JSON (.json)"**.
- **Expected Result**: Browser downloads complete, formatted archives containing all reflections, messages, daily reviews, and goals.
- **Action**: Click **"Wipe All Data & Delete Account"** and confirm.
- **Expected Result**: Firestore subcollections and Firebase Auth user account are permanently deleted.

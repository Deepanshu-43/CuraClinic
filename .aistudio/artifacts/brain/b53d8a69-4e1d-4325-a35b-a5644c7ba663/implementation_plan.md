# CuraClinic CRM: AI Medical Insights & MERN Production Architecture

A high-performance clinical relationship management system featuring an AI-powered Medical Insights side drawer with Gemini, converted into a modular MERN architecture with dual MongoDB and Firestore persistence, Docker containerization, and production Vercel deployment.

> [!IMPORTANT]
> **User Confirmed Architecture & Scope Decisions**:
> - **Backend & Persistence**: Full Express REST API with dual storage adapter (MongoDB Mongoose models + Firebase Firestore fallback) guaranteeing zero-configuration deployment without external database lock-in.
> - **AI Medical Insights Drawer**: Floating Action Button (FAB) toggling an interactive clinical side panel powered by Gemini (`gemini-3.8-flash`) with patient contextual grounding, clinical quick-action prompts, and risk summaries.
> - **Deployment Package**: Production-ready Vercel serverless configuration (`vercel.json`) alongside full Docker containerization (`Dockerfile`, `.dockerignore`) and health probing.

---

### 1. Overview & Core Concept

CuraClinic CRM equips healthcare providers, clinicians, and medical staff with an unified management workspace for patient demographics, scheduling, and electronic health records (EHR). The addition of the **Medical Insights Drawer** transforms clinical workflows by enabling instant synthesis of longitudinal patient records, automated drug interaction risk checks, and natural language clinical querying powered by Gemini server-side processing.

- **Target Audience**: Physicians, clinic managers, triage nurses, and medical administrative staff.
- **Key Value**: Reduces clinical documentation cognitive load by allowing clinicians to summon grounded AI insights from any screen without losing their operational context.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Global Clinical Navigation**: The clinician moves seamlessly between Dashboard, Patients, Appointments, Medical Records, Staff, and Analytics via the persistent sidebar.
2. **Summoning Medical Insights**: From any view, the clinician clicks the pulse-accented floating action button (`Stethoscope / Sparkles` icon with keyboard shortcut `⌘+J` / `Ctrl+J`) in the bottom-right corner.
3. **Contextual Patient Analysis**: The drawer slides out from the right with a backdrop scrim. The clinician can select "All Patients" or a specific patient profile; the AI automatically grounds answers in that patient's vitals, medical history, allergies, and diagnoses.
4. **Clinical Quick Prompts**: One-click actions ("Clinical Course Summary", "Medication & Allergy Check", "Follow-up Recommendations", "Abnormal Vitals Flag") immediately trigger structured Gemini responses.
5. **Interactive Clarification**: The clinician enters custom queries in the chat bar; Gemini streams or returns formatted markdown with clinical caveats, citations, and risk tags.

#### B. Visual Identity & Theme
- **Design Constitution**: Compliant with `frontend-design` SaaS Dashboard guidelines (`references/3_saas_dashboard.md`), eliminating generic AI tropes (no candy-colored pills for static metadata, no fake telemetry tickers, single-elevation card depth).
- **Color Discipline (60-30-10)**:
  - *60% Neutral Canvas*: Slate-50 (`#F8FAFC`) background with Slate-900 typography.
  - *30% Structural Surfaces*: Crisp white card surfaces (`#FFFFFF`) with 1px hairline dividers (`border-slate-200 / border-slate-100`).
  - *10% Clinical Accent*: Deep Medical Blue (`#2563EB`) and Teal (`#0D9488`) reserved for interactive CTAs, active states, and AI drawer highlights.
- **Typography**: Clean sans hierarchy with `Plus Jakarta Sans` / `Inter` fallback for display & navigation, and strict tabular numerals (`font-mono tabular-nums`) for patient IDs, blood pressure, heart rates, dates, and metric counters.
- **Overlay & Motion**: Side drawer animated with compositor-only properties (`transform: translateX`, `opacity`) settling within $\le 200\text{ms}$ with smooth bezier easing.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Dual Data Layer (MongoDB Mongoose + Firestore Adapter)
- **Chosen Approach**: Build an Express data service layer that interfaces with MongoDB via Mongoose when `MONGODB_URI` is provided, while maintaining seamless real-time syncing and fallback with Firebase Firestore (`ai-studio-b53d8a69-4e1d-4325-a35b-a5644c7ba663`).
- **Why**: Protects the user from runtime breaks, requires zero configuration to run immediately in AI Studio, yet provides full MERN stack source code with Mongoose schemas and REST endpoints (`/api/patients`, `/api/appointments`, `/api/records`).
- **Alternatives Considered**: Pure MongoDB requiring external connection string (rejected: fails immediately without user supplying cloud credentials).

#### Decision 2: Server-Side Gemini API Proxy (`/api/insights/query`)
- **Chosen Approach**: All AI calls run server-side in `server.ts` using the official `@google/genai` SDK with `gemini-3.8-flash` and `User-Agent: aistudio-build`.
- **Why**: Keeps API keys confidential, supports robust prompt engineering with clinical system instructions, and prevents client-side bundle bloat.

#### Decision 3: Vercel Serverless & Docker Dual Deployment
- **Chosen Approach**: Provide `vercel.json` configuring API rewrites to Node serverless functions, alongside a production multi-stage `Dockerfile` and `.dockerignore`.
- **Why**: Grants total freedom to deploy to Vercel, Railway, Render, Google Cloud Run, or any self-hosted Docker engine.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CuraClinic Client (React SPA)                   │
│                                                                        │
│   ┌──────────────┐  ┌──────────────────────────────────────────────┐   │
│   │   Sidebar    │  │ Main Views (Dashboard, Patients, Records...) │   │
│   └──────────────┘  └──────────────────────────────────────────────┘   │
│                             │                                          │
│                             ▼ [Toggle ⌘+J / FAB Click]                 │
│         ┌────────────────────────────────────────────────────┐         │
│         │        Medical Insights Side Drawer (Slide-Over)   │         │
│         │  - Patient Selector (All or Specific Patient)      │         │
│         │  - Quick Clinical Action Chips                     │         │
│         │  - Contextual Patient Summary & Chat History       │         │
│         │  - Copy / Export Clinical Assessment               │         │
│         └────────────────────────────────────────────────────┘         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP REST API
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Express Backend Server (server.ts /api/*)              │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐   ┌───────────────┐   │
│   │ /api/insights/query│   │ /api/patients     │   │ /api/health   │   │
│   │ (Gemini 3.8 Flash) │   │ /api/appointments │   │               │   │
│   │                    │   │ /api/records      │   │               │   │
│   └─────────┬──────────┘   └─────────┬─────────┘   └───────────────┘   │
└─────────────┼────────────────────────┼─────────────────────────────────┘
              │                        │
              ▼                        ▼
   ┌──────────────────────┐  ┌───────────────────────────────────────────┐
   │ Google GenAI SDK     │  │   Dual Data Adapter Layer                 │
   │ (gemini-3.8-flash)   │  │   - Mongoose Schemas (MongoDB)            │
   │                      │  │   - Firestore SDK (Active AI Studio DB)   │
   └──────────────────────┘  └───────────────────────────────────────────┘
```

#### Key API Endpoints
1. `GET /api/health`: Health probe reporting service status, database connectivity, and environment mode.
2. `POST /api/insights/query`: Accepts `{ patientId, query, promptType, patientData }`, injects clinical safety rules, grounds against records, and returns Gemini generated clinical analysis.
3. `GET /api/patients`, `POST /api/patients`, `PUT /api/patients/:id`, `DELETE /api/patients/:id`: REST CRUD endpoints with dual MongoDB/Firestore repository.
4. `GET /api/appointments`, `POST /api/appointments`, `PUT /api/appointments/:id`, `DELETE /api/appointments/:id`.
5. `GET /api/records`, `POST /api/records`, `PUT /api/records/:id`, `DELETE /api/records/:id`.

#### State Mapping & Error Resilience
- **Floating Action Button**: Persistent in lower-right viewport (`z-40`), elevated with subtle ring shadow, non-obstructive to main data grids.
- **Drawer State**: Controlled via `isInsightsOpen` state, esc key handler, backdrop click dismissal, and patient selection syncing.
- **Offline & Graceful Fallbacks**: If external database is not connected, the dual adapter serves from Firestore; if network connectivity drops, toast errors display user-friendly troubleshooting guidance.

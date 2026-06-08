# Biosyn CRM — Complete Build Specification
### "A Commitment Towards Better Health"

> **For Claude Code.** This document is the single source of truth for building the Biosyn Pharmaceuticals CRM. Build the system exactly as specified below. Where something is marked **[INPUT NEEDED]**, ask the user once; everything else is already decided — do not re-explain the concept or ask the user to restate requirements. A working interactive prototype (`BiosynCRM.jsx`) accompanies this spec and shows the intended look, flows, and logic.

---

## 0. How to use this document
1. Read the whole spec first.
2. Import the data files the user will drop in (IMS bricks Excel, logo PNG, master doctor list, products, org structure).
3. Scaffold the stack in Section 2, then build feature-by-feature following the milestone plan in Section 12.
4. Only pause to ask the user about items tagged **[INPUT NEEDED]** or genuine ambiguities. Otherwise build straight through.

---

## 1. Product Overview

Biosyn CRM is a pharmaceutical field-force CRM for a company with **100+ medical reps**. It has three surfaces:

- **Rep app** — tablet + mobile, **offline-first**. Doctor list, weekly planning, visit execution with a Detail-Aid player and session tracking, list management requests.
- **Manager app** — web + mobile. Team KPIs, weekly-plan approvals, list-change acknowledgement (step 1 of 2), reports.
- **Admin app** — web. Final list-change apply (step 2 of 2), list-lock control, integrity/anti-gaming alerts, full reports, master-data management.

**Design DNA** (from market analysis of IQVIA OCE, REVO, Pulpo): OCE's embedded intelligence (smart planning, next-best-action, offline iPad execution) + REVO's enforced e-detailing per visit + Pulpo's planned-vs-actual model, plus a deeper, anti-gaming session-tracking layer as the differentiator.

**Language rule (strict):** The entire UI is in **English**. The ONLY Arabic fields are: **doctor name** (Arabic, minimum two parts) and **detailed address** (Arabic, free text). Everything else — brick, governorate, specialty, class, account type, all labels — is English. Use bidirectional isolation so Arabic fields render correctly inside the LTR English UI.

**Branding:** Logo provided (`biosyn-logo.png`, navy + gold, transparent). Use a white version on the dark navy header. Slogan "A Commitment Towards Better Health" appears under the logo in the header and in report/PDF footers. Palette: navy `#16284B`, deep `#1E3A66`, teal `#0E7C7B`, mint `#1FB6A6`, gold `#C9A14A`, coral `#E2574C`, amber `#E8923A`, paper `#F5F3EC`.

---

## 2. Recommended Tech Stack

Chosen for offline-first mobile, 100+ users, strong reporting, and ease of building. If you prefer equivalent alternatives, propose them once, otherwise use this.

**Mobile (Rep app — tablet + phone, offline-first):**
- **React Native (Expo)** or **Flutter**. Recommended: React Native + Expo (shares mental model with the web app).
- Local DB for offline: **WatermelonDB** or **SQLite (expo-sqlite)** with a sync engine. Offline writes queue locally and sync on reconnect.
- Background geolocation: `expo-location` / `react-native-background-geolocation`.
- Mock-location / root detection (anti-gaming): `react-native-device-info` + platform mock-location flags; on Android read `isFromMockProvider` and `Settings.Secure.ALLOW_MOCK_LOCATION`; flag rooted/jailbroken devices.

**Web (Manager + Admin):**
- **Next.js (React) + TypeScript**, **Tailwind CSS**. Charts via **Recharts**.

**Backend / API:**
- **Node.js (NestJS)** or **Django REST**. Recommended NestJS + TypeScript for type-sharing with the frontend.
- **PostgreSQL** as the primary DB (relational, strong for reporting + PostGIS for geo).
- **PostGIS** extension for geofence distance calculations.
- **Redis** for queues/notifications.
- Auth: JWT + refresh tokens, role-based (rep / manager / admin).

**Sync model:** Server time is the **single source of truth** for all timestamps (anti clock-tampering). Devices send their local timestamps too; server compares and flags drift. Offline records carry a client-generated UUID + client timestamp + captured GPS; on sync the server validates, dedups, and stamps server time.

**File storage:** S3-compatible bucket for Detail Aid files (PPTX/PDF/images) and synced session evidence.

**Hosting:** Any cloud (AWS/Azure/GCP). For Egypt latency, prefer a nearby region. Must support 100+ concurrent reps syncing.

---

## 3. Database Schema (PostgreSQL)

Core tables and key columns. Add `id (uuid pk)`, `created_at`, `updated_at` to all. Use soft-deletes (`deleted_at`) where lists are concerned.

### users
`role` (enum: rep, manager, admin), `name_en`, `email`, `phone`, `manager_id (fk users)`, `is_active`. Reps have a `manager_id`; managers may have their own manager.

### territories / bricks
- **bricks**: `code`, `name_en`, `name_ar`, `governorate`, `area` (IMS area grouping). **Seed from the provided IMS Excel — all 148 bricks.** Write an import script that parses the Excel and populates this table; do not hand-type. Validate count = 148 after import.
- **governorates**: `name_en` (lookup; ~21 Egyptian governorates).

### doctors  (the master list)
`name_ar` (Arabic, min two parts — validate), `address_ar` (Arabic detailed), `specialty` (enum/lookup), `class` (enum: A, B, C), `account_type` (enum: AM, PM), `account_subtype` (see Section 6), `brick_id (fk)`, `governorate`, `clinic_lat`, `clinic_lng` (geofence center), `status` (enum: active, pending, rejected), `created_by (fk users)`. The master list is central; reps attach a subset to their personal list.

### rep_doctor_list  (a rep's working list)
`rep_id (fk)`, `doctor_id (fk)`, `added_at`, `status` (active / pending_add / pending_delete), linked to the approval workflow. Enforces the list-lock rules (Section 7).

### products
`name`, `total_slides`, `detail_aid_file_url`, `active`. Detail aids stored in S3.

### weekly_plans
`rep_id (fk)`, `iso_week`, `year`, `status` (enum: draft, submitted, approved, rejected, missed_deadline), `submitted_at`, `approved_at`, `approved_by`. Deadline logic in Section 8.

### plan_items
`plan_id (fk)`, `doctor_id (fk)`, `planned_day`.

### visits  (the heart of the system)
`rep_id (fk)`, `doctor_id (fk)`, `plan_item_id (fk nullable — null = unplanned)`, `account_type` (AM/PM snapshot), `session_id (fk)`, `started_at_server`, `ended_at_server`, `started_at_client`, `ended_at_client`, `gps_lat`, `gps_lng`, `geofence_ok` (bool), `is_valid` (bool — all conditions met), `validity_reasons` (jsonb — which conditions passed/failed), `flags` (jsonb — anti-gaming flags), `synced_at`.

### sessions  (Detail-Aid playback tracking)
`visit_id (fk)`, `product_id (fk)`, `start_slide`, `slides_seen` (distinct count), `max_slide`, `duration_seconds`, `start_lat`, `start_lng`, `slide_events` (jsonb: array of {slide, ts}), `device_info` (jsonb), `mock_location_detected` (bool), `clock_drift_seconds` (int).

### list_change_requests  (dual approval)
`rep_id (fk)`, `doctor_id (fk)`, `type` (enum: add_from_master, create_account, delete), `payload` (jsonb — full new-account details if create), `stage` (enum: manager, admin, applied, rejected), `manager_action_at`, `manager_id`, `admin_action_at`, `admin_id`, `reject_reason`.

### list_locks
`scope` (enum: global, per_rep), `rep_id (fk nullable)`, `opens_at`, `closes_at`, `reason`, `granted_by_admin (fk)`. Global window auto-computed (Section 7); per-rep exceptional unlocks stored here.

### kpi_snapshots  (optional, for fast reporting)
Precomputed monthly/quarterly KPI rows per rep: `rep_id`, `period`, `coverage_ach`, `call_rate_ach`, `frequency_ach`, `crm_score`.

### notifications
`user_id (fk)`, `type`, `body`, `read_at`, `meta` (jsonb). Used e.g. for "manager did not approve plan before deadline → notify admin".

---

## 4. KPI Rules & Formulas (exact)

All KPIs are **monthly** by default. Quarterly variants in Section 5.

**List structure (current, changeable):** 90 doctors per rep. Currently 20 Class A + 70 Class B (0 Class C). Class C must be fully supported in the system even though unused now.

### 4.1 Coverage
- Definition: each doctor must be visited **at least once per month**.
- `coverage_ach = (distinct doctors visited ≥1 this month / total doctors on list) * 100`
- **Cap at 100%. No over-achievement.** Visiting a doctor multiple times still counts once for coverage.

### 4.2 Frequency
- Target visits per doctor per month by class: **A = 3, B = 2, C = 1**.
- `frequency_target = (#A * 3) + (#B * 2) + (#C * 1)` → currently `20*3 + 70*2 = 200`.
- `frequency_ach = (actual qualifying visits counted toward frequency / frequency_target) * 100`.
- **Over-achievement allowed** (can exceed 100%).

### 4.3 Call Rate
- Daily target: **2 AM accounts + 10 PM visits**.
- Monthly target = **180 visits** (deliberately set below the 200 implied by 20 working days × 10, to allow for 1–2 days leave and give room to compensate).
- `call_rate_ach = (actual visits this month / 180) * 100`.
- **Over-achievement allowed.**

### 4.4 CRM Score
- `crm_score = average(coverage_ach, call_rate_ach, frequency_ach)`.
- Since coverage is capped at 100 but call rate & frequency can exceed 100, strong compensation on those two can lift the overall score.
- **Achievement cutoff = 90%.** Below 90% = not achieved.

### 4.5 Achievement coloring (use everywhere)
- `≥ 100%` → mint/green; `90–99.9%` → gold; `< 90%` → coral/red.

---

## 5. Quarterly KPI Rules (separate from monthly — do not just multiply by 3)

When computing **quarterly** KPIs:
- **Coverage:** 1 visit/month → doctor visited **3 times per quarter**.
- **Frequency (reduced, not ×3):** Class A = **7 visits/quarter** (not 9); Class B = **5 visits/quarter** (not 6); Class C = **3 visits/quarter** (unchanged).
- **Total target visits/quarter = 500** (not 540).
- Caps and over-achievement rules carry over (coverage capped, others can exceed).

Keep monthly and quarterly as distinct calculation paths.

---

## 6. Classification & Account Types

### 6.1 Class (A / B / C)
Classification is decided by two factors (manual/admin-driven, support both as inputs):
- **Potentiality** of the doctor (prescribing weight / patient volume — "الرايت وعدد المرضى").
- **Contribution** (how many prescriptions we actually get from them).
Store class on the doctor; allow admin/manager to set/change it (subject to list-lock + approval where relevant). **[INPUT NEEDED later: exact thresholds if the company wants auto-classification; otherwise manual.]**

### 6.2 AM accounts (radius 150 m)
Institutions: General Hospital, University Hospital, Teaching Hospital, Health Insurance, Fever Hospital, Chest Hospital, Contracts (e.g., electricity, telecom), Medical Center.
- Geofence radius: **150 m**.
- **First AM visit must be before 11:00 AM.** If later, the visit is **not rejected** but must be shown in a **different color** in reports (an exception/flag), per AM report.
- Daily target: **2 AM accounts**. Logging only 1 AM is flagged red in the AM report.

### 6.3 PM accounts (radius 100 m)
Private Clinics, Poly Clinics, Private Hospitals.
- Geofence radius: **100 m**.
- Visits must be **after 12:00 PM**.
- **Total PM working span** (from the **first PM visit start** to the **last PM visit end**) must be **≥ 150 minutes (2h 30m)**. AM visit times are NOT counted in this span. Under 150 min → red in the PM report.
- **Interval between any two consecutive visits ≥ 10 minutes.** Under 10 min → flagged.
- A rep **cannot start a new session before ending the previous one and linking it to a doctor.** Enforce this hard in the app.

---

## 7. List Management, Lock Windows & Dual Approval

### 7.1 Adding to a rep's list — two paths
1. **Add from Master List:** rep searches the central master doctor list and requests to attach an existing doctor.
2. **Create New Account:** rep creates a brand-new AM or PM account with full details:
   - `name_ar` (Arabic, min two parts — validate), `address_ar` (Arabic detailed), `account_type` (AM/PM), `account_subtype` (from Section 6 lists), `class` (A/B/C), `specialty`, `governorate`, `brick` (from the 148 IMS bricks; filter bricks by selected governorate). New accounts start as `pending` and only join the official list after dual approval.

### 7.2 List Lock (critical governance)
- Add/Delete on a rep's list is **locked all year** EXCEPT an open window of **days 15–30 at each quarter end: March, June, September, December.**
- Outside this window, all reps are locked.
- **Admin** is the only role that can always open editing **exceptionally for a single rep** upon a manager's request (new hire, special circumstance). Other reps remain locked. Store as a `per_rep` lock with `opens_at`/`closes_at`.

### 7.3 Dual Approval cycle (for any add/delete/create)
1. Rep submits request (add/delete/create).
2. Goes to the rep's **Manager** → manager approves or rejects. **Manager approval = acknowledgement only; it does NOT apply the change.** Its purpose: (a) the manager is aware of and agrees to the list change, (b) it forwards the request to the Admin.
3. If manager approves → goes to **Admin** → admin approval = the **real apply** that changes the list. Only here does the change take effect.
- A change requires **both** approvals in sequence (manager then admin). Rejection at either stage stops it. Track stage on `list_change_requests`.

---

## 8. Weekly Planning & Approval Workflow

- Rep must submit the weekly plan **before Thursday 11:00 PM**. After the deadline the rep **cannot enter a plan** and works in **actual / CLM mode without a plan** (same idea as OCE working without a plan). *(Company policy for reps who never submit any plan is out of scope here.)*
- Reps can **always** log **same-day unplanned visits** for any reason, regardless of plan status.
- Manager must **approve the plan before Saturday 10:00 AM.** If the manager does NOT approve in time → send a **notification to the CRM Admin**: "Manager X did not approve a plan submitted by rep Y." This protects the rep from being wrongly blamed for not submitting or submitting late.
- Plan building uses a **searchable dropdown** of the rep's doctors (type-to-search, select — no manual typing).

---

## 9. Detail Aid Player & Session Logic (the differentiator)

### 9.1 What a session is
When the rep opens the Detail Aid on the tablet to present to a doctor, a **session** begins:
- Captures **GPS location at the first slide opened** + start time (server-authoritative).
- Tracks **every slide event** (slide number + timestamp), the **distinct slides seen**, and the **max slide reached**.
- Session **total time = from first slide opened to last slide closed**.
- Rep then **submits/links the session to a specific doctor**.
- Supports multiple products in one visit (slides counted across the detailed products).

### 9.2 Valid-visit conditions (ALL must be true)
1. Detail Aid opened and **at least 5 slides** browsed (across the visit's detailed products).
2. **Session duration ≥ 30 seconds** (updated from the earlier 1-minute rule).
3. Inside the geofence: **AM = 150 m, PM = 100 m** from the doctor's clinic coordinates. **Even 1 meter outside = rejected.** Opening the Detail Aid outside the clinic but inside the geofence is accepted; 1 m beyond → rejected.
4. No GPS spoofing / integrity flag (Section 10).

If conditions aren't met, the "End & link visit" action is disabled.

### 9.3 Time math the system computes automatically
- Duration of each session.
- **Interval between consecutive visits** (must be ≥ 10 min for PM).
- **Total PM working span** (first PM start → last PM end ≥ 150 min).
- Total visiting time per day / week.

---

## 10. The 8 Accuracy & Anti-Gaming Features (build all)

1. **Fake-GPS / mock-location detection.** On Android read mock-location flags (`isFromMockProvider`, `ALLOW_MOCK_LOCATION`); detect known spoofing apps and rooted/jailbroken devices. Any visit captured while spoofing is active gets a **FAKE banner** in the admin integrity report and the visit is flagged/rejected.
2. **Clock-tamper detection.** Never trust device clock. **Server time is source of truth.** Store device time too; compute drift; large drift → flag for review.
3. **Offline integrity.** Confirm the app captures GPS and computes time fully **offline**; records queue locally with client UUID + client time + GPS and **sync on reconnect**. Verify nothing is lost; flag suspicious offline patterns.
4. **Same-location report.** Flag a rep whose visits all originate from one identical/near-identical coordinate, or far from the assigned geofences — a strong manipulation signal.
5. **Route Replay.** A full daily route trail per rep, replayable on a map with timestamps and **dwell time** at each stop. Visits with near-zero dwell, or many visits with no movement between them, are flagged.
6. **Dwell time.** Not just "entered the geofence" — measure how long the rep actually stayed near the clinic. A momentary in-and-out is not a real visit.
7. **AI Insights (manager/admin).** Surface plain-language alerts instead of raw numbers: e.g., "East Cairo down 8% this week", "3 reps consistently miss the 2-AM rule", trend call-outs.
8. **KPI Charts / analysis.** Monthly trends, rep comparisons, distribution of visits across hours of the day, class distribution. Use Recharts on web.

---

## 11. Reports (Manager + Admin)

Provide a **Reports** tab with at least these, all exportable (PDF/Excel) with the Biosyn logo + slogan in the footer:
1. **KPIs report** — Coverage / Call Rate / Frequency / CRM Score, monthly & quarterly, with charts.
2. **Total PM Working Hours** — span first→last PM visit; **red when < 150 min**.
3. **AM Accounts** — daily AM count; **red when only 1 AM**; AM visits after 11:00 AM shown in a different color.
4. **Visit Intervals** — flag gaps **< 10 min** between consecutive visits.
5. **Integrity / Anti-Gaming** — fake GPS, clock drift, same-location, offline integrity, + Route Replay & dwell.

---

## 12. Screens (match the prototype's structure)

**Rep (tablet + mobile, offline-first):**
- *Doctor List* — mini KPIs, Smart Planning suggestions (next-best-action), search, doctor cards each with a **Frequency Bar** (grey → light orange → yellow → green; show "X left" / "Done" / "+N" for over-achievement).
- *Weekly Plan* — searchable dropdown to add doctors, deadline banner, submit to manager, note about unplanned same-day visits.
- *Manage List* — lock-status banner; "Add from Master List" and "Create New Account" (disabled when locked); request status tracker showing the Manager → Admin → Applied stages.
- *Session* — offline + GPS-integrity status chips, live duration/slides/geofence stats, product tabs, slide viewer, valid-visit checklist, "End & link to doctor".

**Manager (web + mobile):** Team KPIs + reps table; Plan Approvals (with Saturday-10AM deadline note); List Requests (step 1 acknowledgement); Reports.

**Admin (web):** Overview KPIs + class distribution + AI Insights; List Approvals (step 2 apply); List Locks (global auto-window + exceptional per-rep unlock); Alerts (e.g., manager-missed-approval); Reports (all 5); master-data management (doctors, products, bricks, users).

**Visual style:** navy/gold Biosyn identity, white logo on navy header, slogan in header + report footers, the palette in Section 1. English UI; Arabic only for doctor name + address with bidi isolation.

---

## 13. Milestone Plan (build in this order)

1. **Foundations:** stack scaffold, auth + roles, DB schema, IMS-brick import script (validate 148), seed governorates/specialties/account subtypes, logo/theme.
2. **Master data:** doctors master list, products + Detail Aid upload, org structure (rep→manager→admin).
3. **Rep core:** doctor list + frequency bars + search; offline DB + sync engine.
4. **Session engine:** Detail Aid player, slide tracking, GPS capture, geofence math (PostGIS), valid-visit rules, server-time authority.
5. **Planning:** weekly plan, dropdown search, deadlines, unplanned visits.
6. **Approvals & locks:** dual-approval workflow, list-lock windows, exceptional per-rep unlock, notifications.
7. **KPIs:** monthly + quarterly calculation paths, CRM score, caps/over-achievement.
8. **Anti-gaming:** mock-GPS, clock-drift, same-location, offline integrity, dwell, route replay.
9. **Reports & analytics:** the 5 reports + charts + AI insights + PDF/Excel export.
10. **Hardening:** offline edge cases, 100+ user load, security review.

---

## 14. Data the user will provide (drop-in)

- **IMS bricks Excel** (`Updated_IMS_New_148_Bricks_Definition.xlsx`) — parse all 148 bricks → `bricks` table (en/ar/governorate/area).
- **Logo** (`biosyn-logo.png`) — generate white variant for the navy header.
- **[INPUT NEEDED] Master doctor list** (real list, even partial): name_ar, address_ar, specialty, class, account_type, account_subtype, brick, governorate, clinic GPS if available.
- **[INPUT NEEDED] Products** list + Detail Aid files (PPTX/PDF) and slide counts.
- **[INPUT NEEDED] Org structure**: reps, their managers, admins (names/emails).
- **[INPUT NEEDED] Clinic GPS coordinates** for geofencing (or a way to capture them on first visit).

---

## 15. Non-negotiable rules checklist (verify before shipping)

- [ ] UI English; only doctor name (min 2 parts) + address are Arabic, bidi-isolated.
- [ ] Coverage capped at 100%; call rate & frequency allow over-achievement; CRM score = avg of the three; cutoff 90%.
- [ ] Monthly vs quarterly are separate calculation paths (quarterly freq A=7,B=5,C=3; total 500).
- [ ] Class C supported though currently unused.
- [ ] AM 150 m / before 11 AM (late = colored, not rejected) / 2 AM target; PM 100 m / after 12 PM / span ≥150 min / interval ≥10 min / no overlapping sessions.
- [ ] Valid visit = 5 slides + ≥30 s + inside geofence (1 m over = reject) + no spoofing.
- [ ] Session = GPS at first slide, slide-by-slide timing, total time, link to doctor.
- [ ] Server time is source of truth; offline-first with sync.
- [ ] List locked except quarter-end 15–30; admin exceptional per-rep unlock; dual approval (manager acknowledges → admin applies).
- [ ] Weekly plan before Thu 11 PM; manager approve before Sat 10 AM else notify admin; unplanned same-day always allowed.
- [ ] All 8 anti-gaming features + 5 reports with logo/slogan.

---

*End of specification. Build straight through; pause only for [INPUT NEEDED] items. The accompanying `BiosynCRM.jsx` prototype shows the intended UI and flows.*

---

## 🟢 Opening Prompt — copy this into Claude Code

> Build **Biosyn CRM**, a pharmaceutical field-force CRM, exactly per the specification in this repository (`BIOSYN_CRM_BUILD_SPEC.md`). I've placed the data files here: the IMS bricks Excel, the Biosyn logo, and (where ready) the master doctor list, products, and org structure.
>
> Start by reading the full spec, then follow the milestone plan (Section 13). Scaffold the recommended stack (React Native + Expo for the offline-first rep app, Next.js + TypeScript + Tailwind for the manager/admin web, NestJS + PostgreSQL + PostGIS backend), set up auth and roles, create the database schema (Section 3), and write the IMS-brick import script that parses my Excel into the `bricks` table — validate it loads all 148 bricks.
>
> Build feature-by-feature. The accompanying `BiosynCRM.jsx` prototype shows the intended UI, branding, and flows — match its structure and the navy/gold Biosyn identity. Keep the UI in English; only doctor names (Arabic, min two parts) and detailed addresses (Arabic) are in Arabic, bidi-isolated.
>
> Implement every rule in the Section 15 checklist precisely — especially the KPI formulas and caps, the monthly-vs-quarterly split, the session/valid-visit logic, server-time authority, offline-first sync, the list-lock windows, the dual-approval cycle, the weekly-plan deadlines, and all 8 anti-gaming features plus the 5 reports.
>
> Only pause to ask me about items tagged **[INPUT NEEDED]** or any genuine ambiguity. Otherwise build straight through and show me progress at each milestone. Don't ask me to restate requirements — they're all in the spec.

---

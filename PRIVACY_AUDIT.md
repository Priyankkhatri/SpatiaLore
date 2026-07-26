# SpatiaLore Privacy & GDPR Compliance Audit

## 📌 Scope
This privacy audit covers all data flows, storage layers, and network boundaries across the SpatiaLore monorepo (`spatialore-mobile`, `spatialore-backend`, and `spatialore-dashboard`) as of **Phase 7.2**.

---

## 📋 Data Inventory Matrix

| Data Category | Source | Destination Table / Layer | Purpose | Legal Basis / Governance | Max Retention |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Traveler Geofence Position** | Mobile GPS / PDR | Client-Side In-Memory Only | Evaluating POI triggers & prefetch zones | Legitimate Interest (Core Functionality) | **0 seconds** (Never persisted to DB or server) |
| **Traveler Analytics Events** | Mobile App | `public.analytics_events` | Anonymous aggregate usage metrics | Legitimate Interest / Anonymized | **90 days** (Purged by `purgeOldAnalyticsEvents`) |
| **Ephemeral Session ID** | Mobile App | `public.analytics_events` | Grouping events within a single app run | Privacy-by-Design (Non-identifiable) | **90 days** (Destroyed on app cold restart & purged) |
| **Admin User Auth** | Dashboard | `auth.users` & `public.profiles` | Authentication & role-based dashboard access | Contract / Legitimate Interest | Indefinite until admin account deletion |
| **Tour & POI Content** | Dashboard | `public.tours` & `public.pois` | Tour metadata, coordinates, & scripts | Contract / Public Information | Indefinite (Managed by Tourism Board Admins) |

---

## 🔍 Audit Methodology & Code Trace Verification

### A. Data Minimization & Field Consistency
1. **Field Set Alignment**:
   - `spatialore-mobile/src/lib/analytics/analyticsEvents.js` constructs strictly: `event_type`, `tour_id`, `poi_id`, `session_id`, `value_numeric`, `metadata`, and `created_at_client`.
   - `spatialore-backend/src/middleware/validateAnalyticsPayload.js` enforces this exact field set and explicitly rejects forbidden PII keys (`latitude`, `longitude`, `lat`, `lng`, `device_id`, `user_email`, `email`, `ip_address`).
   - `supabase/migrations/0005_create_analytics_events_table.sql` maps these exact column names with no extraneous fields.
2. **Ephemeral `session_id` Integrity**:
   - `SESSION_ID` is initialized once at JavaScript module evaluation time (`generateUuid()`).
   - It is stored only in volatile in-memory state and is **never** saved to `AsyncStorage`, SQLite, or hardware storage.
   - Force-quitting and reopening the mobile app generates a completely new, uncorrelated UUID, ensuring zero cross-session traveler tracking.
3. **Location Isolation**:
   - Grep verification confirms raw GPS coordinates (`latitude`, `longitude`, `lat`, `lng`) exist strictly within local geofencing engines (`geofenceEngine.js`, `pdrEngine.js`, `tourCacheApi.js`).
   - No location coordinate is ever serialized into an analytics payload or transmitted over HTTP.

### B. Server-Side Logging & Administrative Privacy
1. **Server Log Hygiene**:
   - `spatialore-backend/src/middleware/requestLogger.js` utilizes standard Morgan HTTP formats (`dev` and `combined`).
   - Requests record `:method :url :status :response-time`, strictly excluding request bodies (`req.body`).
2. **Admin vs. Traveler Dual Standard**:
   - **Admin Users**: Auth credential management (`profiles`, `auth.users`) is governed by Supabase Auth with RLS policies (`0007_enable_rls.sql`). Deleting an admin account cascades via `ON DELETE CASCADE`.
   - **Travelers**: No authentication, no tokens, no cookies, and no persistent device fingerprints exist.

---

## 🛡️ Audit Findings

### ✅ Confirmed Compliant
* **Zero Location Leaks**: No raw GPS coordinates ever leave the local mobile device.
* **Ephemeral Session Identifiers**: `SESSION_ID` is non-persistent and regenerated fresh on every app cold start.
* **Schema & Validation Harmony**: Mobile builder functions, backend validation middleware, and Supabase SQL schemas agree on identical minimal field shapes.
* **Moote Erasure Requests**: Because traveler analytics events contain zero persistent identifiers, individual traveler identification is structurally impossible. Data is anonymized by design, satisfying GDPR Recital 26.
* **Server Observability Safety**: Express request logging never persists request payloads or metadata to server log files.

---

### ⚠️ Gap Found & Resolved This Phase
* **Unbounded Server Storage**: Prior to Phase 7.2, `public.analytics_events` accumulated event rows indefinitely without an automated expiration window.
* **Fix Applied**:
  * Created `spatialore-backend/src/lib/dataRetentionJob.js` exporting `purgeOldAnalyticsEvents(retentionDays = 90)`.
  * Created protected admin endpoint `POST /api/admin/purge-old-analytics` authorized via `X-Admin-Task-Secret` header.

---

## 📌 Action Items Remaining (Deployment & Governance)

- [ ] **Configure Production Task Secret**: Set a strong `ADMIN_TASK_SECRET` in the `spatialore-backend` production environment.
- [ ] **Wire Automated Retention Scheduler**: Configure a monthly cron job (e.g., via GitHub Actions, external cron trigger, or Supabase `pg_cron` extension) to hit `POST /api/admin/purge-old-analytics`.
- [ ] **Governance Agreement**: Establish a formal legal data controller/processor agreement between SpatiaLore operators and participating Tourism Boards.

# SpatiaLore Monorepo Deployment Guide

This guide documents the full deployment sequence for the **SpatiaLore** tourism audio tour platform.

---

## 🚀 Order of Operations

1. **Database & Storage (Supabase)**
   - Already provisioned with PostGIS extensions and Row-Level Security (RLS) policies.
   - Obtain your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

2. **Backend Service (`spatialore-backend`) — Deploy First**
   - Deploy to Node.js hosting platform (e.g. **Render.com**, **Railway.app**, or **Fly.io**).
   - Set environment variables: `PORT=3001`, `GROQ_API_KEY`, `LLM_BASE_URL`.
   - Note the deployed public URL (e.g. `https://spatialore-backend.onrender.com`).

3. **Admin Dashboard (`spatialore-dashboard`) — Deploy Second**
   - Deploy to static site host (**Netlify** or **Vercel**).
   - Set environment variables in Site Settings:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_BACKEND_URL` = `https://spatialore-backend.onrender.com` (from Step 2).
   - Rebuild/deploy static assets. SPA routing is automatically handled via `_redirects` / `netlify.toml` / `vercel.json`.

4. **Update Backend CORS (`ALLOWED_ORIGIN`)**
   - In backend host environment settings, update `ALLOWED_ORIGIN` to match your deployed dashboard URL (e.g. `https://spatialore-dashboard.netlify.app`).
   - Trigger a backend restart/redeploy.

5. **Self-Hosted LLM Tunnel / Reachability Verification**
   - Confirm backend can reach `LLM_BASE_URL`. If self-hosted model is offline, backend will automatically fall back to Groq Cloud API.

---

## 🔑 Environment Variables Reference Table

| Variable Name | Owned By Service | Type / Location | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `spatialore-dashboard` | Build-time Env Var | Public URL of live Supabase project |
| `VITE_SUPABASE_ANON_KEY` | `spatialore-dashboard` | Build-time Env Var | Supabase anon key (protected by RLS) |
| `VITE_BACKEND_URL` | `spatialore-dashboard` | Build-time Env Var | Public URL of deployed Express backend |
| `PORT` | `spatialore-backend` | Runtime Env Var | Port number (default `3001` or set by host) |
| `ALLOWED_ORIGIN` | `spatialore-backend` | Runtime Env Var | Dashboard origin allowed for CORS (e.g. Netlify URL) |
| `LLM_BASE_URL` | `spatialore-backend` | Runtime Env Var | OpenAI-compatible endpoint URL for primary self-hosted LLM |
| `LLM_API_KEY` | `spatialore-backend` | Runtime Env Var | API key for primary LLM (default `not-needed-for-local`) |
| `LLM_MODEL_NAME` | `spatialore-backend` | Runtime Env Var | Model name for primary LLM (e.g. `llama-3-8b-instruct`) |
| `GROQ_API_KEY` | `spatialore-backend` | Runtime Env Var | Free-tier Groq API key from `console.groq.com` |
| `GROQ_MODEL_NAME` | `spatialore-backend` | Runtime Env Var | Fallback Groq model (default `llama-3.1-8b-instant`) |

---

## ⚠️ Important Production Warnings & Known Limitations

> [!WARNING]  
> **Production Blockers & Self-Hosted LLM Reachability:**  
> `LLM_BASE_URL` currently defaults to `http://localhost:8000/v1`. A cloud-deployed backend (e.g., Render container) cannot reach your local machine's `localhost`. For production, point `LLM_BASE_URL` to a publicly reachable endpoint (or use ngrok/Tailscale tunnel). In the meantime, the system will **automatically fall back to Groq Cloud API**, so script generation remains fully functional!

> [!NOTE]  
> **Vite Environment Variable Baking:**  
> `VITE_*` environment variables are baked into static JavaScript files at **build time**. Updating `VITE_BACKEND_URL` in your hosting dashboard requires triggering a new build/redeploy to take effect.

> [!NOTE]  
> **Free-Tier Cold Starts:**  
> Free Node hosts (e.g., Render free tier) spin down idle instances after 15 minutes of inactivity. Initial requests after spin-down may take 30+ seconds to wake up.

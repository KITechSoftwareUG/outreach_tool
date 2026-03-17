# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**outreach_frontend** — LinkedIn-Outreach-Tool fuer KITech. Vite + React SPA (kein Next.js) mit Supabase-Backend. Deutsche UI-Sprache.

Kernfeatures: Sender-Profile verwalten, LinkedIn-Screenshot hochladen, KI-basierte Profilanalyse (Name + Icebreaker extrahieren), Template-Nachrichten mit Platzhaltern.

## Commands

```bash
npm run dev          # Dev-Server auf Port 8080
npm run build        # Production Build
npm run lint         # ESLint
npm run test         # Vitest einmalig
npm run test:watch   # Vitest Watch-Modus
```

## Architecture

**Vite React SPA** — kein SSR, kein App Router. Client-side Routing via React Router DOM.

### Routing & Auth
- `src/App.tsx` — BrowserRouter mit AuthProvider-Wrapper. Zeigt Auth-Seite oder Index-Seite je nach Session-Status.
- `src/hooks/useAuth.tsx` — Context-basierter Auth-Provider mit Supabase Auth (signUp/signIn/signOut). Session-State via `onAuthStateChange`.
- Nur zwei Routen: `/` (Dashboard) und `/*` (404).

### Datenfluss
- **Kein globaler State-Manager** — nur `useState` pro Komponente.
- **Kein React Query in Verwendung** (importiert aber ungenutzt) — direkte Supabase-Calls in `useEffect`.
- Supabase Client: `src/integrations/supabase/client.ts` mit Env-Variablen `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- DB-Typen: `src/integrations/supabase/types.ts` (auto-generiert).

### Kernkomponenten
- `src/pages/Index.tsx` — Hauptseite: laedt Profile, Sidebar + OutreachArea-Layout.
- `src/components/OutreachArea.tsx` — Workflow: Screenshot-Upload → Supabase Storage → Edge Function → KI-Analyse → Ergebnis mit Template-Vorschau.
- `src/components/ProfileSidebar.tsx` — Profil-Auswahl + Logout.
- `src/components/TemplateEditor.tsx` — Template-Nachricht bearbeiten mit Platzhaltern `{name}`, `{icebreaker}`.
- `src/components/CreateProfileDialog.tsx` — Neues Sender-Profil anlegen.

### Edge Function
- `supabase/functions/analyze-profile/index.ts` — Deno Edge Function. Nimmt Screenshot-URL + Profilbeschreibung, ruft Gemini 2.5 Flash via Lovable AI Gateway auf, gibt `{ name, icebreakers[] }` zurueck. JWT-Verification ist deaktiviert. Loescht Screenshot nach Analyse.

### UI Stack
- shadcn/ui (55+ Komponenten in `src/components/ui/`) + Tailwind CSS mit HSL-Variablen.
- Path-Alias: `@/` → `./src/`.

## Database

Tabelle `sender_profiles` mit RLS (user_id-scoped). Storage-Bucket `screenshots` (privat, user_id-Ordner).

## Environment Variables

```
VITE_SUPABASE_URL           # Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase Anon Key
VITE_SUPABASE_PROJECT_ID    # Supabase Project ID
```

Edge Function benoetigt serverseitig: `LOVABLE_API_KEY`.

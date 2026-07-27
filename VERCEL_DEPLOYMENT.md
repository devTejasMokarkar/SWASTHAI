# Vercel Deployment Guide — SwasthAI

## Prerequisites

- Node.js project with `vercel.json` in root
- Vite-based frontend (build output → `dist/`)
- API routes as serverless functions in `api/` directory
- Vercel account (sign up at https://vercel.com)

---

## 1. Login to Vercel CLI

```bash
npx vercel login
```

Opens a browser / device flow. Follow the prompt to authenticate.

---

## 2. Verify Login

```bash
npx vercel whoami
# → tejasmokar-7918 (example)
```

---

## 3. Link your project

```bash
npx vercel link
```

This creates a `.vercel/project.json` linking the local directory to a Vercel project. If no project exists, it prompts to create one.

> Alternatively, skip interactive prompts: `npx vercel link --yes`

---

## 4. Set Environment Variables

### For VITE_ frontend variables (compiled into JS bundle)

```bash
npx vercel env add VITE_GOOGLE_CLIENT_ID production "" --value "your-client-id" --yes

npx vercel env add VITE_GOOGLE_CLIENT_ID preview "" --value "your-client-id" --yes

npx vercel env add VITE_GOOGLE_CLIENT_ID development "" --value "your-client-id" --yes
```

### For server-side variables

Same syntax — note: **no VITE_** prefix:

```bash
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production "" --value "your-key" --yes
```

| Argument | Purpose |
|---|---|
| `production` / `preview` / `development` | Target environment |
| `""` (empty string) | Git branch — empty = all branches |
| `--value "..."` | Non-interactive value input |
| `--yes` | Skip confirmation prompt |

### List all env vars

```bash
npx vercel env ls
```

### Remove an env var

```bash
npx vercel env rm VARIABLE_NAME production
```

---

## 5. Deploy

### Preview deploy (creates a .vercel.app URL)

```bash
npx vercel
```

### Production deploy (aliases to your production domain)

```bash
npx vercel --prod
```

> VITE_ environment variables require a **redeploy** to take effect — they are baked into the JS bundle at build time.

---

## 6. View Deployments

```bash
npx vercel list
```

### Open the deployment dashboard

```bash
npx vercel open
```

---

## vercel.json Reference

```json
{
  "rewrites": [
    { "source": "/api/auth/(.*)", "destination": "/api/auth" },
    { "source": "/api/files/upload", "destination": "/api/upload-file" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "functions": {
    "api/**/*.ts": { "maxDuration": 60 }
  }
}
```

| Field | Purpose |
|---|---|
| `rewrites` | Route URL paths to serverless functions (catch sub-paths like `/api/auth/profile` → `api/auth` handler) |
| `buildCommand` | Override build command |
| `outputDirectory` | Where build output goes |
| `functions.maxDuration` | Max execution time in seconds (Hobby: 60s max) |

### Rewrite ordering is important

More specific routes must come before general ones. Example:

```json
{ "source": "/api/files/upload", "destination": "/api/upload-file" },   // specific first
{ "source": "/api/files/(.*)", "destination": "/api/files" },           // general after
```

---

## Hobby Plan Limitations

| Limit | Value |
|---|---|
| Max Serverless Functions | **12** per deployment |
| Function maxDuration | **60s** (configurable) |
| Bandwidth | 100 GB/month |
| Build minutes | 6,000 min/month |

### If you hit the 12-function limit

Consolidate multiple routes into a single handler file and use URL-path routing internally:

```typescript
function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

export default async function handler(req, res) {
  const sub = getSubPath(req)

  if (sub === '/profile' && req.method === 'GET') { ... }
  if (sub === '/profile/update' && (req.method === 'PUT' || req.method === 'POST')) { ... }
}
```

---

## Troubleshooting

### `Error: No more than 12 Serverless Functions`

**Cause:** Too many individual files in `api/`. Consolidate routes.

### `Error: Missing required parameter: client_id` (Google OAuth)

**Cause:** `VITE_GOOGLE_CLIENT_ID` not set or deployment hasn't been redeployed after setting it.

### `Error: The specified token is not valid`

**Cause:** Vercel session expired. Run `npx vercel login` again.

### Build succeeds but API returns 404

**Cause:** Rewrite rules in `vercel.json` don't match the request path, or the handler file doesn't exist at the destination path.

Check with:
```bash
curl -s -o /dev/null -w "%{http_code}" https://your-app.vercel.app/api/auth/profile
```

### VITE_ env vars not picked up

**Cause:** Env vars were set **after** the last deployment. Redeploy:
```bash
npx vercel --prod
```

---

## Quick Reference — Common Commands

```bash
npx vercel login                  # Log in to Vercel
npx vercel whoami                 # Check current user
npx vercel link                   # Link local project to Vercel
npx vercel                        # Deploy preview
npx vercel --prod                 # Deploy production
npx vercel env add KEY env "" --value "val" --yes   # Add env var
npx vercel env ls                 # List env vars
npx vercel env rm KEY env         # Remove env var
npx vercel list                   # List deployments
npx vercel logs                   # View function logs
npx vercel open                   # Open dashboard
```

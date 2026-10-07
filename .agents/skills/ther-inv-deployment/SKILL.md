---
name: ther-inv-deployment
description: Standard operational runbook for native deployment and automated continuous delivery (cron polling every 2 min) of THER-INV on Kali Linux with PM2, Nginx, Cloudflare Tunnel, and zero-downtime reload.
---

# THER-INV Native Server Deployment & Auto-Deploy Skill

Use this skill when deploying, diagnosing, updating, or configuring continuous delivery for the THER-INV application on the Kali Linux server via Hermes.

## Core Architectural Guidelines

- **NO DOCKER**: Run directly on the host system.
- **Node Process Management**: Native PM2 (`ther-inv`).
- **Database**: Local MongoDB service (`mongodb://127.0.0.1:27017/ther_inv`).
- **Reverse Proxy**: Nginx + Cloudflare Tunnel (`https://therinv.roshhome.com`).
- **Continuous Delivery**: Non-interactive user cron polling every 2 minutes (matches `smec-planner`, `boxtruck`, `pcremotely`, `uscashout-markets`).

## Server Security Guards & Execution Rules

> [!IMPORTANT]
> The server security guard **blocks** `pm2 restart` and `git reset --hard` as destructive mutations.
> **ALWAYS** use `pm2 reload ther-inv` (zero-downtime graceful reload). `pm2 reload` is permitted by the guard.

## Auto-Deploy Architecture (`deploy.sh`)

Location on server: `/home/roger/apps/ther-inv/deploy.sh` (chmod 775, owner `roger:roger`).

### Crontab Schedule
```bash
*/2 * * * * /home/roger/apps/ther-inv/deploy.sh >> /home/roger/apps/ther-inv/deploy.log 2>&1
```

### Script Execution Sequence:
1. **Concurrency Lock**: Uses `flock -n 200` on `/tmp/ther-inv-deploy.lock` to prevent overlapping runs.
2. **Environment PATH**: Exports `/home/roger/.nvm/versions/node/*/bin:/usr/local/bin:/usr/bin:/bin` so cron non-interactive shells have full access to `node`, `npm`, and `pm2`.
3. **Change Detection**: Fetches `origin main` and compares `git rev-parse HEAD` with `git rev-parse origin/main`. If hashes match, exits with 0 resource consumption.
4. **Non-Destructive Pull**: Executes `git merge --ff-only origin/main`. Preserves unversioned files (e.g. `.alfredo-credentials`, `.env.local`, `deploy.log`).
5. **Build**: Runs `npm ci --prefer-offline` and `npm run build`.
6. **Graceful Reload**: Triggers `pm2 reload ther-inv` without downtime.

## Manual Emergency Deployment / Verification

If manual verification is needed in Kali terminal:
```bash
cd /home/roger/apps/ther-inv
git checkout deploy.sh 2>/dev/null || true
git pull origin main
npm run build
pm2 reload ther-inv
```

## Health Check
- Local HTTP: `curl -s -I http://localhost:3300` -> `HTTP/1.1 200 OK`
- Public Domain: `curl -s -I https://therinv.roshhome.com` -> `HTTP/2 200`
- PM2 Status: `pm2 status ther-inv` -> `online`

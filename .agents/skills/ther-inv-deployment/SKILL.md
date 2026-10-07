---
name: ther-inv-deployment
description: Runbook for native non-Docker deployment on Kali Linux server using Hermes, PM2 or systemd process managers, local MongoDB database, and GitHub commit continuous delivery.
---

# THER-INV Native Server Deployment Skill

Use this skill when deploying, diagnosing, or configuring continuous delivery for the THER-INV application on the Kali Linux server via Hermes.

## Strict Guidelines

- **NO DOCKER**: The system must run directly on the host operating system.
- **Adopt Existing Conventions**: First inspect how other services run on the server (PM2 vs systemd, Nginx reverse proxy vs direct binding) and adopt the same architecture.

## Server Inspection Commands

```bash
# 1. Check running process managers
pm2 list
systemctl list-units --type=service | grep -E 'node|app|web'

# 2. Check web reverse proxies
systemctl status nginx
ls -la /etc/nginx/sites-enabled/

# 3. Check open ports
ss -tulpn | grep LISTEN

# 4. Check local MongoDB
systemctl status mongod || systemctl status mongodb
mongosh --eval "db.adminCommand('ping')"
```

## Deployment Flow (`deploy.sh`)

When triggered manually or via a GitHub commit webhook:
1. `git fetch origin main && git reset --hard origin/main`
2. `npm ci --prefer-offline || npm install`
3. `npm run build`
4. Process reload:
   - If PM2: `pm2 reload ther-inv || pm2 start ecosystem.config.cjs`
   - If systemd: `systemctl restart ther-inv.service`
5. Seed verification: `curl -s -X POST http://localhost:3000/api/seed`

## Auto-Deploy Pattern (Server Standard: Cron Polling)

The server uses **cron polling every 2 minutes** (NOT GitHub Webhooks, due to Cloudflare Tunnel and security guards):

```bash
# Crontab entry on Kali Linux:
*/2 * * * * /home/roger/apps/ther-inv/deploy.sh >> /home/roger/apps/ther-inv/deploy.log 2>&1
```

The script [deploy.sh](file:///c:/Users/roger/Desktop/THER-INV/deploy.sh):
1. Uses `flock` to guarantee single-instance execution.
2. Checks `LOCAL_HASH` vs `REMOTE_HASH` (`git rev-parse HEAD` vs `origin/main`).
3. If no new commits exist, exits immediately with 0 overhead.
4. If new commits exist, does `git merge --ff-only origin/main` (non-destructive, preserves unversioned files like `.alfredo-credentials`).
5. Runs `npm ci --prefer-offline` and `npm run build`.
6. Reloads the PM2 process: `pm2 reload ther-inv || pm2 restart ther-inv`.

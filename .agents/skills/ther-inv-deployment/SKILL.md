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

## Webhook Auto-Deploy Setup

To trigger deployments automatically on every GitHub push:
```bash
apt update && apt install -y webhook
cat <<EOF > /etc/webhook.json
[
  {
    "id": "deploy-ther-inv",
    "execute-command": "/opt/ther-inv/deploy.sh",
    "command-working-directory": "/opt/ther-inv"
  }
]
EOF
systemctl enable --now webhook
```
Configure GitHub repository Settings -> Webhooks to target:
`http://<SERVER_IP>:9000/hooks/deploy-ther-inv`

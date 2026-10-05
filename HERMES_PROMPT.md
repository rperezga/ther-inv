# 🤖 Hermes Deployment Prompt for Kali Linux Server

Copy and paste the prompt below into **Hermes** on your Kali Linux server. It instructs Hermes to inspect existing deployments on the host, adopt the same architecture without Docker, configure local MongoDB, and enable automated continuous deployment via GitHub.

---

```text
Hello Hermes, 

I need you to deploy our new web application "THER-INV" (Agency Weekly Invoicing & Payroll System) on this Kali Linux server.

IMPORTANT REQUIREMENTS:
1. DO NOT USE DOCKER. We want this deployed natively on the host system.
2. First, inspect how other applications are deployed on this server, and deploy THER-INV following the exact same conventions and architecture.

Please execute the following steps autonomously and report back with your findings:

---

### STEP 1: SERVER & DEPLOYMENT ARCHITECTURE INSPECTION
Before setting up the app, inspect how existing applications are hosted on this server:
1. Process Management:
   - Check if PM2 is running and managing apps: `pm2 list` or `pm2 status`
   - Check if systemd custom services are used: `systemctl list-units --type=service | grep -E 'node|web|app|ther'`
2. Reverse Proxy & Web Servers:
   - Check if Nginx is active: `systemctl status nginx` and inspect `/etc/nginx/sites-enabled/`
   - Check if Apache or Caddy are present: `systemctl status apache2` / `caddy`
3. Network & Ports:
   - Check all listening ports: `ss -tulpn | grep LISTEN`
   - Determine which port is best suited for THER-INV (default: 3000, or proxy port).
4. Node.js & MongoDB:
   - Verify Node.js and npm versions: `node -v` (Node 18+ or 20+ required), `npm -v`
   - Verify local MongoDB service: `systemctl status mongod` or `systemctl status mongodb`
   - Confirm MongoDB is listening on 127.0.0.1:27017 (or equivalent local socket). If MongoDB is stopped, start and enable it (`systemctl enable --now mongod`).
5. Directory Conventions:
   - Check where applications are stored (e.g., `/opt/`, `/var/www/`, or user home directory).

---

### STEP 2: REPOSITORY CLONING & ENVIRONMENT CONFIGURATION
1. Clone our repository into the server's standard application directory (e.g., `/opt/ther-inv` or `~/ther-inv`):
   `git clone <GITHUB_REPO_URL> /opt/ther-inv`
   `cd /opt/ther-inv`
2. Create the production `.env` file inside the application directory:
   ```env
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/ther_inv
   JWT_SECRET=generate_a_secure_random_hex_secret_here
   NEXT_PUBLIC_APP_URL=http://<SERVER_IP_OR_DOMAIN>:3000
   ADMIN_EMAIL=roger@admin.com
   ADMIN_PASSWORD=admin123456
   ADMIN_NAME="Roger (Admin)"
   MANAGER_EMAIL=therina@agency.com
   MANAGER_PASSWORD=therina123456
   MANAGER_NAME="Therina"
   ```
3. Install dependencies and build the application:
   `npm ci --prefer-offline || npm install`
   `npm run build`

---

### STEP 3: PROCESS LAUNCH (MATCHING EXISTING CONVENTIONS)
Adopt the process management pattern discovered in Step 1:
- If PM2 is the convention:
  - Start the application using PM2:
    `pm2 start ecosystem.config.cjs`
    or `pm2 start npm --name "ther-inv" -- start`
  - Persist the process table: `pm2 save`
- If systemd is the convention:
  - Install our unit file: `cp ther-inv.service.example /etc/systemd/system/ther-inv.service`
  - Adjust paths/ports if necessary, run `systemctl daemon-reload`, then:
    `systemctl enable --now ther-inv.service`
- If Nginx reverse proxy is used on the server:
  - Add an Nginx virtual host configuration routing traffic (domain or port) to `http://127.0.0.1:3000`
  - Test configuration with `nginx -t` and reload `systemctl reload nginx`

---

### STEP 4: SEED INITIAL ACCOUNTS
Ensure the primary accounts for Therina (Manager) and Roger (Admin) as well as initial staff are created in the database:
`curl -s -X POST http://localhost:3000/api/seed`

---

### STEP 5: CONTINUOUS DEPLOYMENT (GITHUB COMMIT AUTO-DEPLOY)
Set up automated deployment so every git commit/push to `main` triggers `/opt/ther-inv/deploy.sh`:
1. Make sure `/opt/ther-inv/deploy.sh` is executable:
   `chmod +x /opt/ther-inv/deploy.sh`
2. If the server already has a continuous deployment mechanism or webhook listener (such as `webhook` package, custom GitHub runner, or cron listener), hook `deploy.sh` into it.
3. If not, configure a lightweight webhook listener:
   - Install webhook: `apt update && apt install -y webhook`
   - Create a webhook configuration (e.g., `/etc/webhook.json`):
     ```json
     [
       {
         "id": "deploy-ther-inv",
         "execute-command": "/opt/ther-inv/deploy.sh",
         "command-working-directory": "/opt/ther-inv"
       }
     ]
     ```
   - Run or enable webhook service on port 9000:
     `webhook -hooks /etc/webhook.json -port 9000 -verbose` (or configure as systemd service `systemctl enable --now webhook`)
   - Alternatively, if external webhook ports are not desired, configure a systemd timer or cron job that pulls changes periodically.

---

### STEP 6: FINAL REPORT & SUMMARY
Please reply with a summary explaining:
1. How other applications were deployed on this server (PM2 vs systemd, Nginx vs direct port).
2. How THER-INV was deployed to match that architecture.
3. The URL and port to access THER-INV from the browser.
4. The Webhook URL or trigger mechanism to configure in GitHub repository settings.
5. Confirmation of MongoDB connection and initialization status.
```

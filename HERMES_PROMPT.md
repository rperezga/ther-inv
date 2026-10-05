# 🤖 Hermes Deployment Prompt for Kali Linux (therinv.roshhome.com)

Copy and paste the prompt below into **Hermes** on your Kali Linux server. It instructs Hermes to inspect existing deployments, host THER-INV natively without Docker, configure local MongoDB, set up the domain **`therinv.roshhome.com`** via Nginx reverse proxy, and enable automated continuous deployment via GitHub.

---

```text
Hello Hermes, 

I need you to deploy our new web application "THER-INV" (Agency Weekly Invoicing & Payroll System) on this Kali Linux server using the domain: therinv.roshhome.com.

IMPORTANT REQUIREMENTS:
1. DO NOT USE DOCKER. Deploy natively on the host system.
2. First inspect how other applications are deployed on this server, and deploy THER-INV following the exact same conventions and architecture.
3. Configure Nginx to serve therinv.roshhome.com proxying to the local Node.js port (3000), and configure SSL if Certbot is present.

Please execute the following steps autonomously and report back with your findings:

---

### STEP 1: SERVER & ARCHITECTURE INSPECTION
Before launching, inspect the server configuration:
1. Process Managers:
   - Check PM2: `pm2 list` or `pm2 status`
   - Check systemd custom services: `systemctl list-units --type=service | grep -E 'node|web|app|rosh'`
2. Reverse Proxy & Web Servers:
   - Check Nginx: `systemctl status nginx` and review existing sites: `ls -la /etc/nginx/sites-enabled/`
3. Network & Ports:
   - Check listening ports: `ss -tulpn | grep LISTEN`
   - Confirm port 3000 is available for the internal Node server (or use next available port).
4. Node.js & MongoDB:
   - Verify Node.js: `node -v` (Node 18+ or 20+ required), `npm -v`
   - Verify local MongoDB service: `systemctl status mongod` or `systemctl status mongodb`
   - Confirm MongoDB is listening on 127.0.0.1:27017. If not running, enable and start it (`systemctl enable --now mongod`).
5. Application Directory:
   - Check where other web apps are placed (e.g., `/opt/`, `/var/www/`, or home directory).

---

### STEP 2: REPOSITORY CLONING & CONFIGURATION
1. Clone our repository into the server's standard directory (e.g., `/opt/ther-inv` or `~/ther-inv`):
   `git clone https://github.com/rperezga/ther-inv.git /opt/ther-inv`
   `cd /opt/ther-inv`
2. Create the production `.env` file:
   ```env
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/ther_inv
   JWT_SECRET=therinv_jwt_production_secret_kali_2026_key
   NEXT_PUBLIC_APP_URL=https://therinv.roshhome.com
   ADMIN_EMAIL=roger@admin.com
   ADMIN_PASSWORD=admin123456
   ADMIN_NAME="Roger (Admin)"
   MANAGER_EMAIL=therina@agency.com
   MANAGER_PASSWORD=therina123456
   MANAGER_NAME="Therina"
   ```
3. Install dependencies and build the Next.js production bundle:
   `npm ci --prefer-offline || npm install`
   `npm run build`

---

### STEP 3: PROCESS LIFECYCLE (PM2 OR SYSTEMD)
Adopt the process management pattern discovered in Step 1:
- If PM2:
  - Start app: `pm2 start ecosystem.config.cjs` (or `pm2 start npm --name "ther-inv" -- start`)
  - Persist list: `pm2 save`
- If systemd:
  - Install unit: `cp ther-inv.service.example /etc/systemd/system/ther-inv.service`
  - Adjust paths if needed, then: `systemctl daemon-reload && systemctl enable --now ther-inv.service`

---

### STEP 4: NGINX REVERSE PROXY & DOMAIN CONFIGURATION
Configure **therinv.roshhome.com**:
1. Copy or create the Nginx site configuration:
   `cp nginx-therinv.conf.example /etc/nginx/sites-available/therinv.roshhome.com`
   `ln -sf /etc/nginx/sites-available/therinv.roshhome.com /etc/nginx/sites-enabled/`
2. Test Nginx syntax and reload:
   `nginx -t && systemctl reload nginx`
3. SSL Certificate (if Certbot is installed):
   `certbot --nginx -d therinv.roshhome.com --non-interactive --agree-tos --redirect -m roger@admin.com` (or inspect how other roshhome.com subdomains handle SSL).

---

### STEP 5: INITIALIZE ACCOUNTS & AGENCY STAFF
Run the seed initialization to create Therina (Manager) and Roger (Admin) in the database:
`curl -s -X POST http://localhost:3000/api/seed`

---

### STEP 6: CONTINUOUS DEPLOYMENT (GITHUB AUTO-DEPLOY)
1. Make deploy script executable:
   `chmod +x /opt/ther-inv/deploy.sh`
2. Set up Webhook listener:
   - If `webhook` is available or installable: `apt update && apt install -y webhook`
   - Create `/etc/webhook.json`:
     ```json
     [
       {
         "id": "deploy-ther-inv",
         "execute-command": "/opt/ther-inv/deploy.sh",
         "command-working-directory": "/opt/ther-inv"
       }
     ]
     ```
   - Start/enable webhook service on port 9000: `systemctl enable --now webhook`
   - (Or integrate with the existing pull/webhook script used by other applications on this server).

---

### STEP 7: FINAL REPORT
Please summarize:
1. Architecture found on the server (PM2 vs systemd, existing Nginx configs).
2. Public URL status: https://therinv.roshhome.com (HTTP status check).
3. MongoDB connection confirmation and users seeded.
4. Webhook URL to register in GitHub repo settings (e.g., http://<SERVER_IP>:9000/hooks/deploy-ther-inv).
```

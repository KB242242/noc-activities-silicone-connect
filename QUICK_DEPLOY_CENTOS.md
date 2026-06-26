# Fast CentOS Deployment - Copy/Paste Commands

## Prerequisites
- CentOS Stream 9 or later
- Root or sudo access
- Git configured (SSH or HTTPS)

---

## Option A: Automatic Deployment (Recommended)

Download and run the script:

```bash
cd /tmp
curl -O https://raw.githubusercontent.com/siliconeconnect/noc-activities/main/deploy-production.sh
chmod +x deploy-production.sh
sudo bash ./deploy-production.sh https://github.com/siliconeconnect/noc-activities.git
```

Or if you have the script locally:

```bash
sudo bash deploy-production.sh
```

Then skip to **"Verify Deployment"** section below.

---

## Option B: Manual Step-by-Step Commands

### 1. Update and Install Dependencies
```bash
sudo dnf update -y
sudo dnf install -y postfix mailx curl nodejs git
```

### 2. Install Bun Runtime
```bash
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
source ~/.bashrc
```

### 3. Create NOC User
```bash
sudo useradd -m -s /bin/bash noc
```

### 4. Clone and Build Application
```bash
sudo mkdir -p /opt/noc-activities
sudo chown noc:noc /opt/noc-activities
sudo -u noc git clone https://github.com/siliconeconnect/noc-activities.git /opt/noc-activities
cd /opt/noc-activities
sudo -u noc bun install
sudo -u noc bun run build
```

### 5. Configure Postfix
```bash
# Backup original config
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.orig

# Apply minimal config
sudo tee /etc/postfix/main.cf > /dev/null << 'EOF'
inet_interfaces = localhost
inet_protocols = ipv4
mydestination = localhost.localdomain, localhost
mynetworks = 127.0.0.0/8, [::1]/128
queue_directory = /var/spool/postfix
maillog_file = /var/log/maillog
EOF

# Restart Postfix
sudo systemctl enable postfix
sudo systemctl restart postfix
```

### 6. Install Systemd Service
```bash
sudo tee /etc/systemd/system/noc-activities.service > /dev/null << 'EOF'
[Unit]
Description=NOC Activities - Next.js Application
After=network-online.target postfix.service
Wants=network-online.target
Requires=postfix.service

[Service]
Type=simple
User=noc
WorkingDirectory=/opt/noc-activities
Environment="NODE_ENV=production"
Environment="SMTP_HOST=127.0.0.1"
Environment="SMTP_PORT=25"
Environment="SMTP_SECURE=false"
Environment="SMTP_FROM=NOC Silicone Connect <noc@siliconeconnect.com>"
ExecStart=/root/.bun/bin/bun start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=noc-activities

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable noc-activities
```

---

## Verify Deployment

### Start the Application
```bash
sudo systemctl start noc-activities
sleep 5
```

### Check Status
```bash
sudo systemctl status noc-activities
```

Expected output:
```
● noc-activities.service - NOC Activities - Next.js Application
   Loaded: loaded (/etc/systemd/system/noc-activities.service; enabled)
   Active: active (running)
```

### View Logs
```bash
sudo journalctl -u noc-activities -n 50
```

### Test SMTP Configuration
```bash
curl -X POST http://localhost:3000/api/tickets/email-test \
  -H "Content-Type: application/json" \
  -d '{"to":"noc@siliconeconnect.com"}'
```

Expected response:
```json
{
  "ok": true,
  "smtp": {
    "configured": true,
    "mode": "local_no_auth",
    "host": "127.0.0.1",
    "port": "25",
    "secure": false
  },
  "message": "SMTP en mode Postfix local (sans auth). Vous pouvez lancer un test par POST."
}
```

### Check Postfix Queue
```bash
mailq
```

If queue is empty: ✓ Email was sent successfully

---

## Monitor Production

### Real-time Logs
```bash
sudo journalctl -u noc-activities -f
sudo tail -f /var/log/maillog
```

### Restart Service
```bash
sudo systemctl restart noc-activities
```

### Stop Service
```bash
sudo systemctl stop noc-activities
```

### Check System Resources
```bash
ps aux | grep bun
systemctl show -p MemoryCurrent -p TasksCurrent noc-activities
```

---

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u noc-activities --no-pager
systemctl status noc-activities
```

### Postfix not sending emails
```bash
sudo systemctl status postfix
sudo tail -n 100 /var/log/maillog
mailq
```

### Clear stuck Postfix queue
```bash
sudo postfix flush
```

### Reinstall systemd service
```bash
sudo systemctl stop noc-activities
sudo rm /etc/systemd/system/noc-activities.service
sudo systemctl daemon-reload
# Then re-run Step 6 above
```

---

## Firewall (if needed)

If your server has a firewall, allow HTTP/HTTPS:
```bash
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

---

## Next: Reverse Proxy (nginx/Apache)

Set up a reverse proxy on port 80/443 pointing to localhost:3000:

### Nginx example
```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Configure proxy in /etc/nginx/conf.d/noc-activities.conf
```

---

## Support

For issues or questions:
- Email: noc@siliconeconnect.com
- Logs: `/var/log/maillog` and `journalctl -u noc-activities`

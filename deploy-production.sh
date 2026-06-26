#!/bin/bash
# NOC Activities - CentOS Production Deployment Script
# Execute as root or with sudo
# Usage: sudo bash deploy-production.sh <git-repo-url>

set -e

GIT_REPO="${1:-https://github.com/siliconeconnect/noc-activities.git}"
APP_DIR="/opt/noc-activities"
APP_USER="noc"
APP_GROUP="noc"

echo "======================================"
echo "NOC Activities - Production Deploy"
echo "======================================"

# Step 1: Update system
echo "[1/8] Updating system packages..."
sudo dnf update -y > /dev/null

# Step 2: Install dependencies
echo "[2/8] Installing dependencies..."
sudo dnf install -y postfix mailx curl nodejs git > /dev/null

# Install Bun runtime
echo "[3/8] Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash > /dev/null
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Step 4: Create noc user
echo "[4/8] Creating noc system user..."
if ! id -u "$APP_USER" > /dev/null 2>&1; then
    sudo useradd -m -s /bin/bash "$APP_USER"
    echo "✓ User '$APP_USER' created"
else
    echo "✓ User '$APP_USER' already exists"
fi

# Step 5: Deploy application
echo "[5/8] Deploying application..."
sudo mkdir -p "$APP_DIR"
sudo chown "$APP_USER:$APP_GROUP" "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
    echo "  Updating existing repo..."
    sudo -u "$APP_USER" git -C "$APP_DIR" pull origin main > /dev/null
else
    echo "  Cloning repository..."
    sudo -u "$APP_USER" git clone "$GIT_REPO" "$APP_DIR" > /dev/null
fi

echo "[6/8] Building application..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR && bun install > /dev/null && bun run build > /dev/null"
echo "✓ Application built"

# Step 7: Setup Postfix
echo "[7/8] Configuring Postfix..."
sudo systemctl enable postfix > /dev/null 2>&1 || true

# Backup original config
if [ ! -f "/etc/postfix/main.cf.orig" ]; then
    sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.orig
fi

# Apply minimal Postfix config
sudo tee /etc/postfix/main.cf > /dev/null << 'POSTFIX_CONFIG'
inet_interfaces = localhost
inet_protocols = ipv4
mydestination = localhost.localdomain, localhost
mynetworks = 127.0.0.0/8, [::1]/128
queue_directory = /var/spool/postfix
maillog_file = /var/log/maillog
POSTFIX_CONFIG

sudo systemctl restart postfix
echo "✓ Postfix configured and restarted"

# Step 8: Install systemd service
echo "[8/8] Installing systemd service..."
sudo tee /etc/systemd/system/noc-activities.service > /dev/null << SYSTEMD_CONFIG
[Unit]
Description=NOC Activities - Next.js Application
After=network-online.target postfix.service
Wants=network-online.target
Requires=postfix.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
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
SYSTEMD_CONFIG

sudo systemctl daemon-reload
sudo systemctl enable noc-activities
echo "✓ Systemd service installed"

echo ""
echo "======================================"
echo "✓ Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the application:"
echo "   sudo systemctl start noc-activities"
echo ""
echo "2. Check status:"
echo "   sudo systemctl status noc-activities"
echo ""
echo "3. View logs:"
echo "   sudo journalctl -u noc-activities -f"
echo ""
echo "4. Test SMTP (wait 5 seconds for app to start):"
echo "   sleep 5 && curl -X POST http://localhost:3000/api/tickets/email-test \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"to\":\"noc@siliconeconnect.com\"}'"
echo ""
echo "5. Check Postfix queue:"
echo "   mailq"
echo ""
echo "======================================"

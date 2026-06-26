# Production Deployment Checklist

## Pre-deployment

- [ ] All code is committed and pushed to the repository.
- [ ] Environment variables are set correctly in `.env.local` or systemd service.
- [ ] Database migrations have been run (`bun run db:migrate`).
- [ ] Build is successful (`bun run build`).

## CentOS Server Setup

### 1. Install Dependencies
```bash
sudo dnf install -y nodejs bun postfix mailx curl
```

### 2. Create NOC User
```bash
sudo useradd -m -s /bin/bash noc
```

### 3. Deploy Application
```bash
sudo mkdir -p /opt/noc-activities
sudo chown noc:noc /opt/noc-activities
cd /opt/noc-activities

# Copy application files
sudo -u noc git clone <repo-url> .
sudo -u noc bun install
sudo -u noc bun run build
```

### 4. Install Postfix
```bash
sudo dnf install -y postfix
sudo cp postfix-main.cf.example /etc/postfix/main.cf.bak
# Edit /etc/postfix/main.cf if needed
sudo systemctl enable postfix
sudo systemctl start postfix
```

### 5. Install systemd Service
```bash
sudo cp noc-activities.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable noc-activities
sudo systemctl start noc-activities
```

## Post-deployment

### Verify Service Status
```bash
sudo systemctl status noc-activities
sudo journalctl -u noc-activities -n 50
```

### Test SMTP Configuration
```bash
curl -X GET http://localhost:3000/api/tickets/email-test
# Should return SMTP status in JSON

curl -X POST http://localhost:3000/api/tickets/email-test \
  -H "Content-Type: application/json" \
  -d '{"to":"noc@siliconeconnect.com"}'
# Should send a test email
```

### Check Postfix Queue
```bash
mailq
# List all queued messages
```

### Monitor Logs
```bash
sudo tail -f /var/log/maillog
sudo journalctl -u noc-activities -f
```

## Security Notes

- [ ] Firewall: Allow only necessary ports (typically 80, 443, 25 for mail).
- [ ] SSL/TLS: Configure reverse proxy (nginx/Apache) for HTTPS.
- [ ] Backups: Set up automated backups of `/opt/noc-activities` and database.
- [ ] Service account: Ensure `noc` user has minimal privileges.
- [ ] SMTP: Limit relay to localhost only in Postfix.

## Rollback Plan

If deployment fails:
```bash
sudo systemctl stop noc-activities
sudo systemctl start noc-activities  # Restart will trigger
# Or:
cd /opt/noc-activities
sudo -u noc git checkout <previous-commit>
sudo -u noc bun run build
sudo systemctl restart noc-activities
```

## Environment Variables Reference

All SMTP variables are set in the systemd service file (`noc-activities.service`):

- `SMTP_HOST` = `127.0.0.1` (Postfix localhost relay)
- `SMTP_PORT` = `25`
- `SMTP_SECURE` = `false`
- `SMTP_FROM` = `NOC Silicone Connect <noc@siliconeconnect.com>`

No credentials needed for local Postfix relay.

## Contact

For support or issues, contact the NOC team at noc@siliconeconnect.com.

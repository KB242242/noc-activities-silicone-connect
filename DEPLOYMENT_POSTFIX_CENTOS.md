# Déploiement SMTP avec Postfix sur CentOS Stream

Ce guide configure l'application pour envoyer les notifications tickets via un relais SMTP local Postfix.
Le destinataire métier reste la boîte NOC `noc@siliconeconnect.com` dans tous les environnements.

## Objectif

- Déployer l'application Next.js en local ou en production sur CentOS Stream.
- Utiliser Postfix comme relais SMTP local sans authentification.
- Garder la même logique applicative en dev et en prod.

## 1. Installer Postfix

```bash
sudo dnf install -y postfix mailx
sudo systemctl enable --now postfix
sudo systemctl status postfix
```

Si le service ne démarre pas, vérifiez le journal système:

```bash
sudo journalctl -u postfix -n 100 --no-pager
```

## 2. Configurer Postfix comme relais local

Le cas standard pour cette application est un relais local sur `127.0.0.1:25`.

Éditez `/etc/postfix/main.cf` et assurez-vous d’avoir au minimum:

```conf
inet_interfaces = localhost
inet_protocols = ipv4
mydestination = localhost.localdomain, localhost
```

Rechargez Postfix après modification:

```bash
sudo systemctl restart postfix
```

## 3. Ouvrir les variables d'environnement de l'application

Dans `.env.local` ou dans les variables du service système, utilisez:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_SECURE=false
SMTP_FROM="NOC Silicone Connect <noc@siliconeconnect.com>"
```

Si vous utilisez encore Gmail en dev:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noc@siliconeconnect.com
SMTP_PASS=mot_de_passe_application
SMTP_FROM="Noc Activities <noc@siliconeconnect.com>"
```

## 4. Lancer l'application

```bash
bun install
bun run build
bun start
```

Si vous testez en local de développement:

```bash
bun run dev
```

## 5. Tester l'envoi SMTP

Le plus simple est d'appeler l'endpoint de diagnostic:

```bash
curl -X POST http://localhost:3000/api/tickets/email-test \
  -H "Content-Type: application/json" \
  -d '{"to":"noc@siliconeconnect.com"}'
```

Vous devez recevoir une réponse JSON `ok: true` et un email de test sur la boîte NOC.

## 6. Contrôler les files Postfix

Si l'email n'arrive pas, inspectez la file locale:

```bash
mailq
```

Et les logs:

```bash
sudo tail -n 200 /var/log/maillog
```

## 7. Bonnes pratiques

- Ne changez pas le destinataire métier dans le code: il doit rester `noc@siliconeconnect.com`.
- Faites varier uniquement le transport SMTP entre dev et prod.
- Conservez le test `/api/tickets/email-test` après chaque modification de configuration.

## 8. Production locale avec Docker + Nginx

Cette stack lance 3 services:

- `mysql` (base de donnees)
- `app` (Next.js en mode production)
- `nginx` (reverse proxy expose sur `http://localhost`)

### Fichiers ajoutes

- `Dockerfile`
- `docker-compose.prod.yml`
- `docker/nginx/default.conf`
- `.env.docker.example`

### Preparation

```bash
cp .env.docker.example .env.docker
```

Adaptez les secrets dans `.env.docker`:

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `JWT_SECRET`
- `NEXTAUTH_SECRET`

### Demarrage

```bash
docker compose --env-file .env.docker -f docker-compose.prod.yml up -d --build
```

### Verification

```bash
docker compose --env-file .env.docker -f docker-compose.prod.yml ps
docker compose --env-file .env.docker -f docker-compose.prod.yml logs -f app
```

L'application doit etre accessible sur:

- `http://localhost` (via Nginx)

### Arret

```bash
docker compose --env-file .env.docker -f docker-compose.prod.yml down
```

Pour arreter et supprimer aussi les volumes (attention: supprime les donnees locales):

```bash
docker compose --env-file .env.docker -f docker-compose.prod.yml down -v
```

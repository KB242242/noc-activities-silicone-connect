# NOC_ACTIVITY - Guide d'installation MySQL/WampServer

## 📋 Prérequis

- WampServer (ou XAMPP) installé
- MySQL 5.7+ ou MySQL 8.0+
- Node.js 18+
- Bun ou npm

## 🚀 Installation

### Étape 1 : Créer la base de données

1. Ouvrez **phpMyAdmin** (http://localhost/phpmyadmin)
2. Cliquez sur l'onglet **SQL**
3. Copiez-collez le contenu du fichier `database/mysql-init.sql`
4. Exécutez le script

Ou en ligne de commande :
```bash
mysql -u root -p < database/mysql-init.sql
```

### Étape 2 : Configurer l'application

1. Copiez le fichier `.env.example` en `.env` :
```bash
copy .env.example .env
```

2. Modifiez le fichier `.env` avec vos paramètres :
```env
DATABASE_URL="mysql://root:@localhost:3306/noc_activity"
```

Si vous avez un mot de passe MySQL :
```env
DATABASE_URL="mysql://root:votre_mot_de_passe@localhost:3306/noc_activity"
```

### Étape 3 : Installer les dépendances

```bash
bun install
```

### Étape 4 : Configurer Prisma pour MySQL

Remplacez le contenu de `prisma/schema.prisma` par celui de `prisma/schema.mysql.prisma` :

```bash
copy prisma\schema.mysql.prisma prisma\schema.prisma
```

### Étape 5 : Générer le client Prisma

```bash
bun run db:generate
```

### Étape 6 : Démarrer l'application

```bash
bun run dev
```

L'application sera accessible sur http://localhost:3000

## 📊 Structure de la base de données

### Tables principales

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (Admin, Superviseur, Agent) |
| `shifts` | Shifts A, B, C |
| `shift_cycles` | Cycles de travail (6 jours + 3 repos) |
| `work_days` | Jours de travail détaillés |
| `tasks` | Tâches journalières des agents |
| `activities` | Journal des activités NOC |
| `overtimes` | Heures supplémentaires |
| `external_links` | Liens vers les outils externes |
| `system_settings` | Paramètres système |

### Comptes par défaut

| Email | Rôle | Shift |
|-------|------|-------|
| admin@siliconeconnect.com | ADMIN | - |
| supervisor@siliconeconnect.com | SUPERVISOR | - |
| alaine@siliconeconnect.com | AGENT | A |
| casimir@siliconeconnect.com | AGENT | A |
| luca@siliconeconnect.com | AGENT | A |
| jose@siliconeconnect.com | AGENT | A |
| sahra@siliconeconnect.com | AGENT | B |
| severin@siliconeconnect.com | AGENT | B |
| marly@siliconeconnect.com | AGENT | B |
| furys@siliconeconnect.com | AGENT | B |
| audrey@siliconeconnect.com | AGENT | C |
| lapreuve@siliconeconnect.com | AGENT | C |
| lotti@siliconeconnect.com | AGENT | C |
| kevine@siliconeconnect.com | AGENT | C |

## 🔗 Liens externes configurés

| Nom | URL | Catégorie |
|-----|-----|-----------|
| Suivi de véhicules | https://za.mixtelematics.com/#/login | Vehicles |
| LibreNMS | http://192.168.2.25:6672/ | Monitoring |
| Zabbix | http://192.168.2.2:6672/ | Monitoring |
| Zoho Desk | https://desk.zoho.com/ | Tickets |
| Liste des tickets | Google Sheets | Tickets |
| WhatsApp Web | https://web.whatsapp.com/ | Communication |
| Gmail | https://mail.google.com/ | Communication |

## 📁 Fichiers importants

```
/home/z/my-project/
├── database/
│   └── mysql-init.sql        # Script SQL complet
├── prisma/
│   ├── schema.prisma         # Schéma actuel (SQLite)
│   └── schema.mysql.prisma   # Schéma MySQL
├── .env.example              # Configuration exemple
└── README.md
```

## 🔧 Commandes utiles

```bash
# Générer le client Prisma
bun run db:generate

# Créer une migration
bun run db:migrate

# Réinitialiser la base
bun run db:reset

# Vérifier le code
bun run lint
```

## ⚠️ Notes importantes

1. **Sauvegarde** : Faites une sauvegarde de votre base de données avant chaque migration
2. **Production** : Changez les mots de passe par défaut en production
3. **Réseau** : Les liens internes (LibreNMS, Zabbix) nécessitent d'être sur le même réseau

## 🆘 Dépannage

### Erreur de connexion MySQL
- Vérifiez que WampServer est démarré
- Vérifiez les identifiants dans `.env`
- Vérifiez que la base `noc_activity` existe

### Erreur Prisma
```bash
# Régénérer le client
bun run db:generate

# Vérifier la connexion
bunx prisma db pull
```

### Port 3000 occupé
Modifiez le port dans le fichier `.env` :
```env
PORT=3001
```

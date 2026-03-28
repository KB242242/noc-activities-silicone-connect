# NOC Activities - Guide d'Installation MySQL

## 📋 Prérequis

- **WampServer** installé (avec MySQL)
- **Node.js** v18+ ou **Bun**
- **Git**

## 🚀 Étapes d'Installation

### 1. Importer la Base de Données MySQL

1. Ouvrez **phpMyAdmin** (généralement: http://localhost/phpmyadmin)
2. Cliquez sur l'onglet **"Importer"**
3. Sélectionnez le fichier `noc_activities_database.sql` situé dans ce dossier
4. Cliquez sur **"Exécuter"**

La base de données `noc_activities` sera créée avec toutes les tables nécessaires.

### 2. Configurer l'Application

1. Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```

2. Modifiez le fichier `.env` selon votre configuration :
```env
# Database Configuration (MySQL - WampServer)
DATABASE_URL="mysql://root:@localhost:3306/noc_activities"

# Si vous avez un mot de passe MySQL:
# DATABASE_URL="mysql://root:votre_mot_de_passe@localhost:3306/noc_activities"
```

### 3. Installer les Dépendances

```bash
bun install
# ou
npm install
```

### 4. Générer le Client Prisma

```bash
bun run db:generate
# ou
npx prisma generate
```

### 5. (Optionnel) Exécuter le Seed

Si vous voulez peupler la base avec les données de démonstration :

```bash
bunx prisma db seed
# ou
npx prisma db seed
```

### 6. Démarrer l'Application

```bash
bun run dev
# ou
npm run dev
```

L'application sera accessible sur : http://localhost:3000

## 👤 Comptes par Défaut

### Super Admin
- **Email:** secureadmin@siliconeconnect.com
- **Mot de passe:** Admin@2026
- **Rôle:** SUPER_ADMIN (accès complet)

### Responsable
- **Email:** theresia@siliconeconnect.com
- **Mot de passe:** Admin@2026
- **Rôle:** RESPONSABLE

### Agents NOC (Techniciens)

**Shift A (Bleu):**
- alaine@siliconeconnect.com - Call Center
- casimir@siliconeconnect.com - Monitoring
- luca@siliconeconnect.com - Reporting 1
- jose@siliconeconnect.com - Reporting 2

**Shift B (Jaune):**
- sahra@siliconeconnect.com - Call Center
- severin@siliconeconnect.com - Monitoring
- marly@siliconeconnect.com - Reporting 1
- furys@siliconeconnect.com - Reporting 2

**Shift C (Vert):**
- audrey@siliconeconnect.com - Call Center
- lapreuve@siliconeconnect.com - Reporting 2
- lotti@siliconeconnect.com - Reporting 1
- kevine@siliconeconnect.com - Monitoring

**Mot de passe par défaut pour tous les agents:** Admin@2026

⚠️ **Note:** Les agents devront changer leur mot de passe à la première connexion.

## 🔧 Structure de la Base de Données

### Tables Principales

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs avec rôles et permissions |
| `shifts` | Équipes (A, B, C) |
| `tasks` | Gestion des tâches NOC |
| `tickets` | Système de tickets |
| `activities` | Journal d'activités |
| `overtimes` | Heures supplémentaires |

### Tables de Messagerie

| Table | Description |
|-------|-------------|
| `internal_messages` | Messages type email |
| `conversations` | Conversations chat |
| `chat_messages` | Messages instantanés |
| `call_history` | Historique d'appels |

### Tables de Documents

| Table | Description |
|-------|-------------|
| `documents` | GED - Documents |
| `document_versions` | Versions des documents |
| `document_shares` | Partages de documents |

### Tables Système

| Table | Description |
|-------|-------------|
| `audit_logs` | Journal d'audit |
| `notifications` | Notifications |
| `system_settings` | Paramètres système |
| `external_links` | Liens externes |

## 🛠️ Commandes Utiles

```bash
# Générer le client Prisma
bun run db:generate

# Créer une migration
bun run db:migrate

# Réinitialiser la base de données
bun run db:reset

# Vérifier le code
bun run lint
```

## 📞 Support

Pour toute question ou problème, contactez l'administrateur système.

---

**NOC Activities** - © 2026 Silicone Connect

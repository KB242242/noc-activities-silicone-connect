# NOC Activities - Database Canonical Rebuild

Ce dossier contient la version canonique de reconstruction complete de la base MySQL de l'application.

## Fichier principal

- `database/noc_activities_final.sql`

Ce script reconstruit l'ensemble de la base avec:

- 31 tables
- contraintes de clefs et index
- donnees seed essentielles (shifts, users, settings, liens externes, compteur tickets)
- domaine chat/messagerie en base (`conversations`, `conversation_participants`, `chat_messages`)

## Prerequis

- MySQL 8+ (ou MySQL 5.7 compatible)
- Node.js 18+
- `DATABASE_URL` valide dans `.env`

Exemple:

```env
DATABASE_URL="mysql://root:@localhost:3306/noc_activity"
```

## Rebuild complet (from scratch)

1. Executer le script SQL complet:

```bash
mysql -u root -p < database/noc_activities_final.sql
```

2. Regenerer Prisma Client:

```bash
npm run db:generate
```

3. Verifier la coherence schema Prisma <-> DB:

```bash
npx prisma db pull
```

4. Lancer l'application:

```bash
npm run dev
```

## Import direct depuis le backup JSON (optionnel)

Si vous voulez recharger exactement les users/shifts du fichier backup en mode programme:

```bash
npm run db:import-backup
```

Ce script lit `backup_users_shifts.json` et injecte:

- shifts
- users (roles, responsibility, shift)
- conversations de groupe par shift + annonces

## Entites couvertes

- Authentification et sessions: `users`, `sessions`, `audit_logs`
- Planning et shifts: `shifts`, `shift_cycles`, `work_days`, `day_assignments`, `individual_rests`, `responsibilities`
- Activites metier: `activities`, `tasks`, `task_comments`, `task_alerts`, `task_history`
- Tickets: `tickets`, `ticket_counters`, `ticket_comments`, `ticket_attachments`, `ticket_history`
- Documents: `documents`, `document_versions`, `document_shares`
- Communication interne: `notifications`, `conversations`, `conversation_participants`, `chat_messages`
- Configuration: `system_settings`, `external_links`, `graph_schedules`, `overtimes`, `handovers`

## Notes importantes

- Le script SQL est la source de reconstruction complete.
- Le fichier `backup_users_shifts.json` peut servir de reference de secours, mais il n'est pas necessaire pour reconstruire la base.
- En production, remplacer les mots de passe seed par des secrets propres a l'environnement.

# 📖 Guide d'Installation - NOC Activities

## Application de Gestion des Activités NOC - Silicone Connect

---

## 📋 PRÉREQUIS

| Logiciel | Version | Lien de téléchargement |
|----------|---------|------------------------|
| WampServer | 3.3+ | https://www.wampserver.com |
| Node.js | 18+ LTS | https://nodejs.org |
| VSCode | Dernière | https://code.visualstudio.com |
| Git | Dernière | https://git-scm.com |

---

## 🚀 INSTALLATION ÉTAPE PAR ÉTAPE

### ÉTAPE 1 : Installer WampServer

1. Télécharger WampServer depuis le site officiel
2. Exécuter l'installateur
3. Choisir le navigateur par défaut
4. Laisser les autres options par défaut
5. Une fois installé, vérifier que l'icône WampServer est **verte** dans la barre des tâches

### ÉTAPE 2 : Créer la base de données MySQL

1. Ouvrir le navigateur et aller sur : `http://localhost/phpmyadmin`
2. Cliquer sur **"Nouvelle base de données"** dans le menu de gauche
3. Remplir :
   - **Nom** : `noc_activities`
   - **Interclassement** : `utf8mb4_general_ci`
4. Cliquer sur **"Créer"**
5. Sélectionner la base `noc_activities` créée
6. Cliquer sur l'onglet **"Importer"**
7. Cliquer sur **"Choisir un fichier"**
8. Sélectionner le fichier `noc_activities_mysql.sql`
9. Cliquer sur **"Exécuter"**

### ÉTAPE 3 : Cloner le projet

Ouvrir VSCode et le terminal (`Ctrl + ù`) :

```bash
# Aller dans le dossier www de WampServer
cd C:\wamp64\www

# Cloner le projet
git clone https://github.com/KB242242/noc_activities.git

# Entrer dans le dossier
cd noc_activities
```

### ÉTAPE 4 : Installer les dépendances

**Option A - Avec Bun (recommandé, plus rapide)** :
```bash
# Installer Bun
powershell -c "irm bun.sh/install.ps1 | iex"

# Installer les dépendances
bun install
```

**Option B - Avec npm** :
```bash
npm install
```

### ÉTAPE 5 : Configurer l'environnement

Le fichier `.env` est déjà configuré pour MySQL :

```env
DATABASE_URL="mysql://root:@localhost:3306/noc_activities"
JWT_SECRET="noc_activities_super_secret_key_2026_silicone_connect"
NODE_ENV="development"
```

> ⚠️ **Note** : Si vous avez défini un mot de passe root MySQL, modifiez la ligne :
> `DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/noc_activities"`

### ÉTAPE 6 : Configurer Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schéma vers la base de données
npx prisma db push
```

### ÉTAPE 7 : Lancer l'application

```bash
# Démarrer le serveur de développement
bun run dev
# ou
npm run dev
```

### ÉTAPE 8 : Accéder à l'application

Ouvrir le navigateur : **http://localhost:3000**

---

## 🔐 IDENTIFIANTS DE CONNEXION

### Super Admin
| Champ | Valeur |
|-------|--------|
| Email | `secureadmin@siliconeconnect.com` |
| Mot de passe | `@adminsc2026` |

### Responsable
| Champ | Valeur |
|-------|--------|
| Email | `theresia@siliconeconnect.com` |
| Mot de passe | `#Esia2026RepSC` |

### Agents (Techniciens NOC)

| Email | Mot de passe | Shift |
|-------|--------------|-------|
| alaine@siliconeconnect.com | Alaine_SC2026! | A |
| casimir@siliconeconnect.com | Casimir@2026SC | A |
| luca@siliconeconnect.com | Luca#2026!SC | A |
| jose@siliconeconnect.com | Jose_SC@2026 | A |
| sahra@siliconeconnect.com | Sahra2026*SC | B |
| severin@siliconeconnect.com | Sev2026_SC@rin | B |
| marly@siliconeconnect.com | Marly_SC2026! | B |
| furys@siliconeconnect.com | Furys#2026SC | B |
| audrey@siliconeconnect.com | Audrey@2026SC | C |
| lapreuve@siliconeconnect.com | Lapreuve#SC26 | C |
| lotti@siliconeconnect.com | Lotti@2026!SC | C |
| kevine@siliconeconnect.com | @Admin2026SC | C |

---

## 📁 STRUCTURE DU PROJET

```
noc_activities/
├── prisma/
│   └── schema.prisma      # Schéma de la base de données
├── src/
│   ├── app/
│   │   ├── api/           # Routes API
│   │   ├── page.tsx       # Page principale
│   │   └── layout.tsx     # Layout
│   └── components/        # Composants UI
├── public/                # Fichiers statiques
├── download/              # Fichiers SQL et exports
├── .env                   # Variables d'environnement
└── package.json           # Dépendances
```

---

## ⚙️ COMMANDES UTILES

```bash
# Démarrer le serveur
npm run dev

# Construire pour la production
npm run build

# Lancer en production
npm start

# Voir la base de données (Prisma Studio)
npx prisma studio

# Régénérer le client Prisma
npx prisma generate

# Mettre à jour la base de données
npx prisma db push
```

---

## 🔧 DÉPANNAGE

### Erreur : "Can't reach database server"
- Vérifier que WampServer est démarré (icône verte)
- Vérifier que MySQL est actif dans WampServer

### Erreur : "Access denied for user 'root'"
- Vérifier le mot de passe dans le fichier `.env`
- Par défaut sur WampServer, root n'a pas de mot de passe

### Erreur : "Port 3000 already in use"
```bash
# Tuer le processus sur le port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou utiliser un autre port
npm run dev -- -p 3001
```

### Erreur : "Module not found"
```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install
```

---

## 📞 SUPPORT

Pour toute question ou problème :
- GitHub : https://github.com/KB242242/noc_activities
- Email : support@siliconeconnect.com

---

**Silicone Connect © 2026**

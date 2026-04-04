# Application NOC Silicone Connect

Je suis **Kevine Bauer** et je vous présente notre application destinée aux agents NOC de **Silicone Connect**.  
Elle a pour objectif de centraliser leurs activités, faciliter la communication interne et offrir des outils de monitoring et de supervision.  

La première version a été déployée le **1er avril 2026**.  
Cette application est moderne, prête pour la production et repose sur des technologies de pointe.

---

## Pile technologique

### Framework principal
- Next.js 16 : framework React optimisé pour la production avec App Router  
- TypeScript 5 : JavaScript typé pour une meilleure fiabilité et productivité  
- Tailwind CSS 4 : framework CSS utilitaire pour un développement rapide et élégant  

### UI et composants
- shadcn/ui : composants accessibles et de qualité basés sur Radix UI  
- Lucide React : bibliothèque d’icônes moderne et cohérente  
- Framer Motion : animations fluides et performantes  
- Next Themes : gestion simple du mode sombre et clair  

### Formulaires et validation
- React Hook Form : gestion performante des formulaires  
- Zod : validation de schémas orientée TypeScript  

### État et données
- Zustand : gestion d’état simple et scalable  
- TanStack Query : synchronisation puissante des données  
- Fetch : requêtes HTTP basées sur les promesses  

### Base de données et backend
- Prisma : ORM moderne et typé pour TypeScript  
- NextAuth.js : solution complète d’authentification open-source  

### Fonctionnalités avancées
- TanStack Table : construction de tableaux et datagrids  
- DND Kit : drag-and-drop moderne pour React  
- Recharts : bibliothèque de graphiques basée sur React et D3  
- Sharp : traitement performant des images  

### Internationalisation et utilitaires
- Next Intl : gestion multilingue pour Next.js  
- Date-fns : utilitaires modernes pour la manipulation des dates  
- ReactUse : collection de hooks essentiels pour React  

---

## Pourquoi cette application ?

- Développement rapide grâce à une configuration pré-établie  
- Interface utilisateur complète et moderne  
- Sécurité renforcée avec TypeScript et Zod  
- Design responsive et animations fluides  
- Base de données prête avec Prisma  
- Authentification intégrée avec NextAuth.js  
- Visualisation de données (graphiques, tableaux, drag-and-drop)  
- Support multilingue avec Next Intl  
- Optimisation pour la production  

---

## Démarrage rapide

```bash
# Installer les dépendances
bun install

# Lancer le serveur de développement
bun run dev

# Construire pour la production
bun run build

# Démarrer le serveur en production
bun start

Accédez à l’application sur http://localhost:3000.

# Contact
Pour toute question ou collaboration, vous pouvez me joindre à :
kevinebauer7@gmail.com

# Structure du projet

```
src/
├── app/                           # Pages App Router Next.js et API routes
│   ├── api/                       # Routes API REST
│   │   ├── activities/            # API activités
│   │   ├── auth/                  # API authentification
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   ├── change-password/
│   │   │   └── check-session/
│   │   ├── documents/             # API gestion documents
│   │   ├── download-project/      # API téléchargement projet
│   │   ├── email/                 # API messagerie interne
│   │   ├── notifications/         # API notifications
│   │   ├── overtime/              # API heures supplémentaires
│   │   ├── pdf/                   # API génération PDF
│   │   ├── planning/              # API planning/shifts
│   │   ├── shifts/                # API shifts/rotations
│   │   ├── tasks/                 # API gestion tâches
│   │   ├── tickets/               # API tickets support
│   │   ├── users/                 # API gestion utilisateurs
│   │   └── route.ts               # Route principale API
│   ├── globals.css                # Styles globaux
│   ├── layout.tsx                 # Layout principal (Toaster global)
│   ├── loading.tsx                # Page loading
│   ├── page.tsx                   # Page principale (app complète)
│   ├── page_backup.tsx            # Sauvegarde page.tsx
│   └── page_original.tsx          # Page originale
│
├── components/                    # Composants React réutilisables
│   ├── index.ts                   # Exports centralisés
│   ├── sidebar/
│   │   └── Sidebar.tsx            # Sidebar navigation
│   ├── tickets/                   # Composants gestion tickets
│   │   ├── TicketManager.tsx
│   │   └── TicketsManagement.tsx
│   ├── users/                     # Composants gestion utilisateurs
│   │   ├── AgentsManagement.tsx   # Gestion des agents NOC
│   │   ├── ClientsManagement.tsx  # Gestion des clients
│   │   └── TechniciansManagement.tsx  # Gestion techniciens
│   └── ui/                        # Composants shadcn/ui (46+ composants)
│       ├── accordion.tsx
│       ├── alert.tsx
│       ├── alert-dialog.tsx
│       ├── aspect-ratio.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── context-menu.tsx
│       ├── dialog.tsx
│       ├── drawer.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── hover-card.tsx
│       ├── input.tsx
│       ├── input-otp.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── navigation-menu.tsx
│       ├── pagination.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx
│       ├── rich-text-editor.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       ├── toggle.tsx
│       ├── toggle-group.tsx
│       └── tooltip.tsx
│
├── hooks/                         # Hooks personnalisés
│   ├── use-mobile.ts              # Détection responsive mobile
│   ├── use-toast.ts               # Hook pour toast notifications
│   └── useTickets.ts              # Hook gestion tickets
│
├── lib/                           # Utilitaires et configurations
│   ├── auth.ts                    # Configuration authentification
│   ├── constants.ts               # Constantes globales
│   ├── db.ts                      # Client Prisma
│   ├── utils.ts                   # Utilitaires généraux
│   └── tickets/                   # Utilitaires tickets
│       ├── constants.ts           # Constantes tickets
│       ├── index.ts
│       ├── types.ts               # Types tickets
│       └── utils.ts               # Utilitaires tickets
│
├── store/                         # État Zustand
│   ├── activityStore.ts           # État activités
│   ├── authStore.ts               # État authentification
│   └── shiftStore.ts              # État shifts/rotations
│
└── types/                         # Types TypeScript
    └── index.ts                   # Exports types
```


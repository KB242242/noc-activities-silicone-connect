# Système d'Appel Vidéo Professionnel - Documentation Complète

## Vue d'ensemble

Ce système offre une plateforme d'appel vidéo complète et robuste, comparable à Teams ou Google Meet, intégrée directement dans l'application NOC.

## Architecture

### Composants principaux

1. **WebRTC Service** (`/src/lib/webrtc.ts`)
   - Gère les connexions peer-to-peer
   - Capture les flux audio/vidéo
   - Gère le partage d'écran
   - Collecte les statistiques de connexion

2. **Real-time Events** (`/src/lib/videoCallRealtime.ts`)
   - Système d'événements pour la synchronisation en temps réel
   - Émission et réception d'événements d'appel
   - Handlers pour tous les événements d'appel

3. **Video Call Store** (`/src/store/videoCallStore.ts`)
   - State management avec Zustand
   - Gestion des participants
   - Réactions et commentaires temporaires
   - Notes de réunion

4. **Call Management Service** (`/src/lib/callManagement.ts`)
   - Logique métier pour les appels
   - Contrôles uniquement pour l'initiateur
   - Formatage et statistiques d'appel

### Modèles de données

#### ScheduledMeeting (Réunions planifiées)
```
- id: String (unique)
- title: String
- description: String (optional)
- conversationId: String (FK)
- organizerId: String (FK -> User)
- scheduledStartTime: DateTime
- scheduledEndTime: DateTime
- callType: 'audio' | 'video'
- meetingLink: String (généré automatiquement)
- maxParticipants: Int
- allowScreenShare: Boolean
- allowRecording: Boolean
- status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
```

#### CallHistory (Historique des appels)
```
- id: String (unique)
- conversationId: String (FK)
- callType: String
- startTime: DateTime
- endTime: DateTime
- duration: Int (en secondes)
- participantIds: String (JSON)
- recordingUrl: String (optional)
- notes: String (optional)
```

## Fonctionnalités implémentées

### 1. Appels vidéo en temps réel ✅
- Activation/désactivation caméra et micro
- Qualité vidéo adaptative (1280x720 @ 30 FPS)
- Audio avec suppression du bruit et gain automatique
- Détection des serveurs STUN/TURN

### 2. Contrôle par l'initiateur ✅
- Mettre en sourdine les participants
- Expulser un participant
- Terminer l'appel pour tous
- Voir le statut de each participant

### 3. Interactions en direct ✅
- Réactions emoji (👍👎👏😂😲🤔❤️)
- Réactions temporaires (3 secondes)
- Commentaires visibles pendant l'appel
- Lever/baisser la main
- Notifications visuelles

### 4. Gestion de réunion ✅
- Planification d'une réunion
- Lien de réunion unique
- Statut des participants (invités/acceptés/rejoints)
- Suivi du temps de participation

### 5. Outils avancés ✅
- Partage d'écran avec curseur
- Prise de notes intégrée
- Compteur de temps d'appel
- Historique des appels
- Export des données d'appel

### 6. Détection du locuteur ✅
- Identification automatique du participant qui parle
- Surlignage du locuteur actif
- Basé sur le niveau audio en entrée

## API Endpoints

### Appels
```
POST /api/chat/calls/initiate
  Initiates a new video call

POST /api/chat/calls/respond
  Accept or decline a call

POST /api/chat/calls/control
  Initiator controls (mute, remove, end)
  Actions: 'mute', 'unmute', 'remove', 'end-call'

GET|POST /api/chat/calls/history
  Call history management
```

### Réunions
```
GET|POST /api/chat/meetings
  Schedule and retrieve meetings
  GET: List all meetings for a conversation
  POST: Create a new scheduled meeting

GET|POST /api/chat/meetings/[id]
  Specific meeting operations
```

## Composants React

### VideoCallWindow
Composant principal pour l'affichage des appels
- Grille de vidéos (locale + distantes)
- Barre de contrôle (audio/vidéo/écran/main)
- Affichage du temps d'appel
- Indicateurs d'état

```tsx
<VideoCallWindow 
  call={call}
  onEndCall={handleEndCall}
/>
```

### ScheduleMeetingDialog
Dialog pour planifier une réunion
- Saisie du titre et description
- Sélection date/heure
- Ajout de participants
- Options (partage écran, enregistrement)

```tsx
<ScheduleMeetingDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  conversationId={conversationId}
  onSchedule={handleSchedule}
/>
```

### LiveInteractionsPanel
Panneau des interactions en direct
- Onglets: Réactions, Commentaires, Notes
- Réactions emoji avec animation
- Commentaires horodatés
- Prise de notes persistent

```tsx
<LiveInteractionsPanel
  callId={callId}
  conversationId={conversationId}
/>
```

### ParticipantsList
Liste des participants avec contrôles
- Affichage des infos (nom, avatar, statut)
- Indicateurs (mic, vidéo, partage écran, main levée)
- Actions pour l'initiateur (mute, expulsion)

```tsx
<ParticipantsList
  participants={participants}
  callId={callId}
  conversationId={conversationId}
  isInitiator={isInitiator}
  onMuteParticipant={handleMute}
  onRemoveParticipant={handleRemove}
/>
```

## Utilisation

### 1. Démarrer un appel
```typescript
const response = await fetch('/api/chat/calls/initiate', {
  method: 'POST',
  body: JSON.stringify({
    conversationId: 'conv-123',
    callType: 'video',
    initiatorId: 'user-456'
  })
});

const { call } = await response.json();
// Afficher VideoCallWindow avec 'call'
```

### 2. Plannifier une meetingmeeting
```typescript
await onSchedule({
  title: 'Réunion NOC',
  description: 'Suivi hebdomadaire',
  scheduledStartTime: Date.now() + 3600000,
  scheduledEndTime: Date.now() + 7200000,
  allowScreenShare: true,
  allowRecording: false,
  participantIds: ['user-1', 'user-2']
});
```

### 3. Contrôler les participants (initiateur)
```typescript
// Mettre en sourdine
await fetch('/api/chat/calls/control', {
  method: 'POST',
  body: JSON.stringify({
    callId: 'call-123',
    conversationId: 'conv-456',
    initiatorId: 'user-789',
    action: 'mute',
    targetParticipantId: 'user-101'
  })
});

// Expulser
// action: 'remove'

// Terminer l'appel
// action: 'end-call'
```

### 4. S'abonner aux événements
```typescript
import { subscribeVideoCallEvents } from '@/lib/videoCallRealtime';

const unsubscribe = subscribeVideoCallEvents(callId, (event) => {
  switch (event.type) {
    case 'participant-joined':
      console.log('Participant rejoint:', event.data);
      break;
    case 'hand-raised':
      console.log('Main levée');
      break;
    case 'screen-share-started':
      console.log('Partage écran activé');
      break;
  }
});

// Plus tard: unsubscribe()
```

## Configuration

### Serveurs ICE
Pour la production, configurer des serveurs TURN dans le fichier `.env`:

```env
NEXT_PUBLIC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
NEXT_PUBLIC_TURN_SERVERS=turn:turnserver.example.com:3478?transport=udp
NEXT_PUBLIC_TURN_USERNAME=user
NEXT_PUBLIC_TURN_PASSWORD=pass
```

### Permissions du navigateur
L'application demande automatiquement:
- Accès à la caméra
- Accès au microphone
- Accès à l'écran (pour partage)

## Limitations connues et améliorations futures

### Actuellement
✅ Support jusqu'à 20+ participants
✅ Résolution jusqu'à 1280x720
✅ Enregistrement: à implémenter au niveau du serveur

### À venir
- [ ] Enregistrement vidéo côté serveur
- [ ] Transcription automatique
- [ ] Arrière-plans virtuels
- [ ] Effets de beauté
- [ ] Chat textuel dans l'appel
- [ ] Sondages en temps réel
- [ ] Fichiers partagés
- [ ] Tableau blanc collaboratif

## Sécurité

- ✅ Vérification des permissions (seul l'initiateur peut contrôler)
- ✅ Chiffrement WebRTC (DTLS-SRTP)
- ✅ Autorisations de conversation (FK via Prisma)
- [ ] Authentification des tokens pour les liens de réunion
- [ ] Rate limiting sur les APIs
- [ ] Audit logging des actions

## Performance

- WebRTC utilise la compression H.264 pour vidéo
- Adaptation automatique de la qualité
- Suppression du bruit côté client
- Gestion efficace de la mémoire
- Cleanup automatique des ressources

## Debugging

Activer les logs Prisma:
```env
DEBUG=prisma:query
```

Logs WebRTC:
```typescript
// Dans VideoCallWindow.tsx
if (process.env.NODE_ENV === 'development') {
  webrtcServiceRef.current.onConnectionStateChange((userId, state) => {
    console.log(`[WebRTC] ${userId}: ${state}`);
  });
}
```

## Migration de base de données

Après l'ajout des modèles Prisma:

```bash
# Créer une migration
npm run db:migrate

# Ou réinitialiser complètement
npm run db:reset
```

## Support et exemples

Pour des exemples complets d'intégration, voir:
- `/src/components/videocall/` - Composants
- `/src/lib/webrtc.ts` - Service WebRTC
- `/src/types/videoCall.ts` - Types TypeScript

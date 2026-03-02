# Smart Pulse - Système de Monitoring Cardiaque LoRaWAN

Smart Pulse est une application web de monitoring cardiaque en temps réel utilisant la technologie LoRaWAN. Elle permet aux médecins de surveiller leurs patients à distance et aux patients de suivre leur activité cardiaque.

## 🏥 Fonctionnalités

### Pour les Médecins
- **Dashboard de surveillance** : Vue d'ensemble de tous les patients
- **Alertes en temps réel** : Notifications automatiques en cas de dépassement des seuils
- **Gestion des patients** : Ajout et suivi des patients
- **Prescription d'activités** : Création d'exercices personnalisés
- **Historique complet** : Accès aux données historiques de chaque patient

### Pour les Patients
- **Monitoring en temps réel** : Visualisation de la fréquence cardiaque en direct
- **Sessions d'activité** : Suivi des exercices prescrits par le médecin
- **Sessions libres** : Monitoring cardiaque sans activité spécifique
- **Graphiques interactifs** : Visualisation des données avec seuils personnalisés
- **Notifications** : Alertes en cas de valeurs anormales

## 🛠️ Technologies Utilisées

- **Frontend** : Next.js 16, React 19, TypeScript
- **UI/UX** : Tailwind CSS, Radix UI, Lucide Icons
- **Graphiques** : Recharts
- **Temps réel** : WebSocket (STOMP.js, SockJS)
- **Authentification** : JWT avec localStorage

## 📋 Prérequis

- Node.js 18+ 
- npm, yarn, pnpm ou bun
- Backend API Smart Pulse en cours d'exécution

## 🚀 Installation et Lancement

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd frontend
```

### 2. Installer les dépendances
```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 3. Configuration de l'environnement

Créer un fichier `.env.local` à la racine du projet :

```bash
# Configuration pour développement local
NEXT_PUBLIC_API_URL=http://localhost:8080

# Configuration pour mobile (décommentez cette ligne et commentez celle du dessus)
# NEXT_PUBLIC_API_URL=http://VOTRE_IP_LOCALE:8080

# Pour production
# NEXT_PUBLIC_API_URL=https://votre-api.com
```

**Important** : Remplacez `VOTRE_IP_LOCALE` par votre adresse IP locale si vous testez sur mobile.

### 4. Lancer l'application

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📱 Structure de l'Application

```
app/
├── login/              # Page de connexion (médecin/patient)
├── register/doctor/    # Inscription médecin
├── doctor/
│   ├── dashboard/      # Dashboard médecin
│   ├── patients/[id]/  # Détail d'un patient
│   └── activities/     # Gestion des activités
├── patient/
│   ├── dashboard/      # Dashboard patient
│   └── history/        # Historique des sessions
├── profile/            # Profil utilisateur
└── debug/              # Page de debug

components/
├── ui/                 # Composants UI de base
├── heart-rate-chart.tsx    # Graphique temps réel
├── notifications-panel.tsx # Panneau de notifications
├── patient-card.tsx        # Carte patient
└── activity-card.tsx       # Carte activité
```

## 🔐 Authentification

### Comptes de test
L'application supporte deux types d'utilisateurs :

**Médecin** :
- Accès au dashboard de surveillance
- Gestion des patients
- Prescription d'activités

**Patient** :
- Monitoring personnel
- Suivi des activités prescrites
- Historique des sessions

### Connexion
1. Aller sur `/login`
2. Choisir l'onglet "Médecin" ou "Patient"
3. Saisir les identifiants
4. Redirection automatique vers le dashboard approprié

## 🌐 Connexion Temps Réel

L'application utilise WebSocket pour recevoir les données cardiaques en temps réel :

- **Protocole** : STOMP over SockJS
- **Endpoint** : `/ws-cardiac`
- **Topic** : `/topic/pulse`
- **Reconnexion automatique** : Oui (5 secondes)

## 📊 Fonctionnalités Avancées

### Seuils Personnalisés
- Chaque patient a des seuils BPM min/max configurables
- Alertes automatiques en cas de dépassement
- Visualisation des seuils sur les graphiques

### Sessions de Monitoring
- **Sessions d'activité** : Liées à un exercice prescrit
- **Sessions libres** : Monitoring sans activité spécifique
- Sauvegarde automatique des données

### Notifications
- Panneau de notifications en temps réel
- Alertes visuelles et sonores
- Historique des notifications

## 🔧 Scripts Disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm run start

# Linting
npm run lint
```

## 🐛 Debug et Développement

Une page de debug est disponible sur `/debug` pour :
- Tester les connexions WebSocket
- Vérifier les données en temps réel
- Diagnostiquer les problèmes de connexion

## 📝 Notes Importantes

1. **Backend requis** : Cette application frontend nécessite le backend Smart Pulse
2. **HTTPS en production** : Utilisez HTTPS pour les WebSockets en production
3. **Compatibilité mobile** : Interface responsive optimisée pour mobile
4. **Données temps réel** : Les données BPM sont reçues via WebSocket uniquement

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence privée. Tous droits réservés.

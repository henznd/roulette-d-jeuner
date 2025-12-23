# LunchSquad 🍔

Application de vote quotidien pour choisir le restaurant du déjeuner en équipe, avec système de véto et gamification.

## 🚀 Quick Start

### Prérequis
- Node.js 18+
- Compte Supabase (https://supabase.com)

### Installation

1. **Cloner et installer**
```bash
npm install
```

2. **Configuration Supabase**

Créer `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. **Setup de la base de données**

Dans le SQL Editor de Supabase, exécuter dans l'ordre :

```bash
# 1. Schéma de base
schema.sql

# 2. Schéma Admin & Settings
admin_schema.sql

# 3. Trigger auto-création profils
trigger_auto_profile.sql

# 4. (Optionnel mais recommandé) Politiques RLS renforcées
enhanced_rls.sql
```

4. **Définir l'administrateur**

```bash
# Remplacer l'email par le vôtre dans restrict_admin.js si besoin
node restrict_admin.js
```

5. **Lancer l'application**
```bash
npm run dev
```

Ouvrir http://localhost:3000

---

## 🔧 Scripts Utilitaires

### `make_admins.js`
Promouvoir tous les utilisateurs en Admin (pour tests)
```bash
node make_admins.js
```

### `restrict_admin.js`
Restreindre l'admin à un seul email
```bash
node restrict_admin.js
```

### `reset_password.js`
Réinitialiser le mot de passe d'un utilisateur
```bash
# Modifier l'email/userId dans le fichier avant
node reset_password.js
```

### `verify_db.js`
Afficher l'état actuel de la table `profiles`
```bash
node verify_db.js
```

---

## 🎮 Fonctionnalités

### Pour les utilisateurs
- ✅ Inscription / Connexion par email/mot de passe
- ✅ Vote quotidien pour un restaurant (changement possible)
- ✅ Véto hebdomadaire (bloque un resto pour tout le monde)
- ✅ Vote aléatoire si indécis
- ✅ Résultats automatiques à l'heure de fermeture (défaut: 12h)
- ✅ Confettis pour le gagnant 🎉

### Pour les admins
- ✅ Modifier l'heure de clôture des votes
- ✅ Activer/désactiver des jours de la semaine
- ✅ Ajouter/supprimer des restaurants

---

## 📁 Structure

```
roulette-d-jeuner/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Page principale (logique de jeu)
│   │   ├── layout.tsx
│   │   └── globals.css       # Styles Neubrutalism
│   ├── components/
│   │   ├── AuthForm.tsx      # Formulaire connexion/inscription
│   │   ├── RestaurantCard.tsx
│   │   ├── ResultsView.tsx
│   │   ├── AdminSettingsDialog.tsx
│   │   └── ui/               # shadcn/ui components
│   └── lib/
│       ├── supabase.ts       # Client Supabase
│       └── utils.ts
├── schema.sql                # Schéma DB initial
├── admin_schema.sql          # Schéma Admin + Settings
├── trigger_auto_profile.sql  # Auto-création profils
├── enhanced_rls.sql          # Sécurité RLS
└── *.js                      # Scripts utilitaires
```

---

## 🔐 Sécurité

### Row Level Security (RLS)
- ✅ Les profils sont visibles par tous, modifiables par leur propriétaire uniquement
- ✅ Seuls les admins peuvent modifier `app_settings`
- ✅ Les votes/vetos sont liés à l'utilisateur authentifié
- ✅ Un utilisateur ne peut pas se promouvoir admin lui-même

### Admin
- L'email admin est défini dans `trigger_auto_profile.sql` et `restrict_admin.js`
- Par défaut: `fousouley2002@gmail.com`
- Pour changer: modifier ces fichiers puis re-exécuter

---

## 🐛 Debug

### Mode Debug Temps
Boutons en bas à gauche de l'app :
- **[DEBUG] AVANT-JEU** : Simule une heure avant fermeture
- **[DEBUG] APRES-JEU** : Simule après fermeture (mode résultats)
- **[DEBUG] RESET** : Revient à l'heure réelle

### Logs Console
L'application log abondamment dans la console :
- `📱` Initial session
- `🔍` Vérification admin
- `✅` Profil chargé
- `👑` Mode Admin activé
- `❌` Erreurs

---

## 📝 TODO / Améliorations Futures

- [ ] Reset automatique des vétos chaque semaine (actuellement: reset quotidien)
- [ ] Historique des gagnants
- [ ] Statistiques de votes par resto
- [ ] Notifications push (Expo/PWA)
- [ ] Mode sombre
- [ ] Traductions i18n

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI**: shadcn/ui, Framer Motion, Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Design**: Neubrutalism (bordures dures, couleurs pop, ombres marquées)

---

## 📄 License

Projet personnel - Tous droits réservés

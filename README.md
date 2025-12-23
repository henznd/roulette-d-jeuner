# LunchRoulette 🎰

**by baptiste**

La roue de la fortune des déjeuners d'équipe - Plus de débats, juste du fun !

## 🚀 Déploiement

**Production** : [Votre URL Vercel](https://your-app.vercel.app)

## 🛠️ Stack Technique

- **Framework** : Next.js 16 + React 19
- **Styling** : Tailwind CSS 4 + shadcn/ui
- **Backend** : Supabase (Auth + Database + Realtime)
- **Animations** : Framer Motion + Canvas Confetti
- **Hosting** : Vercel

## 📦 Installation Locale

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
# Créer .env.local avec :
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# 3. Lancer en dev
npm run dev
# App disponible sur http://localhost:3000
```

## 🎯 Features

- ✅ **Multi-Teams** : Plusieurs équipes isolées
- ✅ **Vote System** : Vote simple ou double (1x/mois)
- ✅ **Roue de la Fortune** : Sélection pondérée dramatique
- ✅ **Bannissement** : Exclure un resto (1x/mois)
- ✅ **Auth Supabase** : Email + Password
- ✅ **Admin Dashboard** : Gestion complète (users, restos, settings)
- ✅ **Real-time** : Votes en temps réel
- ✅ **Design Apple-like** : UI premium avec gradients et animations

## 📁 Structure du Projet

```
roulette-d-jeuner/
├── src/
│   ├── app/              # Pages Next.js
│   │   ├── page.tsx      # Page principale (votes + roue)
│   │   ├── admin/        # Dashboard admin
│   │   ├── create-team/  # Création d'équipe
│   │   └── join-team/    # Rejoindre une équipe
│   ├── components/       # Composants React
│   │   ├── RestaurantCard.tsx
│   │   ├── SpinWheel.tsx
│   │   ├── VotersPanel.tsx
│   │   └── ui/           # shadcn components
│   └── lib/              # Utils
│       └── supabase.ts   # Client Supabase
├── public/               # Assets statiques
├── docs/                 # Documentation & scripts
│   ├── database/         # Migrations SQL
│   └── scripts/          # Scripts setup
└── package.json
```

## 🗄️ Base de Données

**Tables principales** :
- `teams` : Équipes
- `profiles` : Utilisateurs (lié à auth.users)
- `restaurants` : Restaurants par team
- `votes` : Votes quotidiens
- `banishments` : Bannissements mensuels
- `app_settings` : Configuration (horaires, jours actifs)

**RLS Policies** : Isolation complète par `team_id`

## 🔧 Scripts Utiles

```bash
# Build production
npm run build

# Linter
npm run lint

# Déploiement
git push origin main  # Auto-deploy Vercel
```

## 📚 Documentation

- [Guide de Déploiement Vercel](/.gemini/antigravity/brain/.../vercel_deployment_guide.md)
- [Guide Test & Itération](/.gemini/antigravity/brain/.../testing_iteration_guide.md)
- [Templates Email Supabase](/.gemini/antigravity/brain/.../email_templates_guide.md)

## 🎨 Design Tokens

**Couleurs principales** :
- Primary Purple : `#5D2EE8`
- Secondary Pink : `#E91E63`
- Background gradients : `from-[#5D2EE8] to-[#E91E63]`

**Animations** :
- Smooth transitions (200-300ms)
- Framer Motion pour les composants
- Confetti sur victoire roue

## 🚦 Workflow de Développement

1. Faire un changement en local
2. Tester avec `npm run dev`
3. Commit : `git commit -m "Description"`
4. Push : `git push origin main`
5. Vercel déploie automatiquement ! (2-3 min)

## 📝 License

Projet personnel - © 2025 Baptiste

## 🤝 Contributeurs

- **Baptiste** - Créateur & Développeur principal

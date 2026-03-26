# MuscleVision

Plateforme fitness avec app mobile existante, backend FastAPI, et nouvelle version web Next.js pour l'analyse vidéo, la visualisation musculaire 3D, le coach IA et la nutrition.

## Structure

```
MuscleVision/
├── web/             # Next.js App Router web app
├── mobile/          # React Native CLI app
└── backend/         # Python FastAPI
```

## Setup rapide

### 1. Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier ton `Project URL` et `anon key`
3. Aller dans **SQL Editor** → coller et exécuter `backend/schema.sql`
4. Mettre à jour `mobile/src/store/supabase.ts` et `web/.env.example` avec tes clés si besoin

### 2. Backend
```bash
cd backend
cp .env.example .env
# Remplir .env avec tes clés Supabase, Groq, et DB

# Avec Docker (recommandé)
docker-compose up

# Sans Docker
pip install -r requirements.txt
uvicorn app.main:app --reload

# Worker vidéo
python -m app.workers.run_worker video_processing --url redis://127.0.0.1:6379
```

### 3. Web app
```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

### 4. App mobile
```bash
cd mobile
npm install

# iOS
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

## Variables d'environnement backend (.env)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL de ton projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings > API) |
| `GROQ_API_KEY` | Clé API Groq pour texte + vision |
| `GROQ_TEXT_MODEL` | Modèle texte pour feedback / coach |
| `GROQ_VISION_MODEL` | Modèle vision pour nutrition |
| `AI_PROVIDER` | Provider IA texte, `groq` par défaut |
| `REDIS_URL` | URL Redis (docker-compose le fournit) |
| `DATABASE_URL` | Connection string PostgreSQL |
| `PUBLIC_BASE_URL` | URL publique du backend pour servir les artefacts |
| `ANALYSIS_STORAGE_MODE` | `local` ou `supabase` |
| `ANALYSIS_BUCKET` | Bucket Supabase optionnel pour les artefacts |
| `LOCAL_STORAGE_PATH` | Racine locale pour uploads et artefacts |

## Variables d'environnement web (`web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL du backend FastAPI |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon/publishable Supabase |

## Déploiement (Railway.app)

1. Créer un compte sur [railway.app](https://railway.app)
2. Nouveau projet → Deploy from GitHub
3. Ajouter les variables d'environnement
4. Railway détecte automatiquement le `Dockerfile`
5. Mettre à jour `mobile/src/api/client.ts` avec l'URL Railway

## Architecture

- **Auth** : Supabase Auth (email/password)
- **Vidéo** : Upload/webcam → FastAPI → MediaPipe → PostgreSQL
- **Artefacts** : `keypoints.json` + `analysis.txt`
- **3D web** : React Three Fiber mannequin stylisé piloté par l'engagement musculaire
- **Coach IA** : provider texte via Groq, branché sur le résumé biomécanique compact
- **Nutrition** : Groq Vision pour reconnaissance photo + journal alimentaire

## Notes macOS

- Sur macOS, lance le worker avec `python -m app.workers.run_worker ...`.
- Cet entrypoint utilise `SimpleWorker` par défaut sur Darwin pour éviter les crashs `fork` liés aux dépendances natives de l'analyse vidéo.

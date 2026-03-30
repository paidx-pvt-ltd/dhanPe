# CI/CD & Deployment Setup Guide

## Overview

This dhanPe backend uses **3-tier CI/CD pipeline**:

```
CODE COMMIT
    ↓
01. SECURITY & QUALITY GATES (Early fail if bad)
    - ESLint: Code quality checks
    - Prettier: Format verification
    - TypeScript: Type safety
    - npm audit: Dependency vulnerabilities
    ├─ FAIL → Block merge
    └─ PASS ↓
02. TESTS & BUILD (Parallel execution)
    - Unit tests (vitest)
    - Database migrations
    - TypeScript compilation
    - Coverage reporting
    ├─ FAIL → Block merge
    └─ PASS ↓
03. DEPLOY (Environment-specific)
    - develop → dev.dhanpe.com (auto)
    - staging → staging.dhanpe.com (auto)
    - main → api.dhanpe.com (manual approval required)
```

---

## GitHub Setup

### 1. Secret Management

Go to `Settings → Secrets → Actions` and add:

```yaml
VERCEL_TOKEN
  ↓ Generate from vercel.com settings
  
VERCEL_ORG_ID
  ↓ Find in Vercel dashboard URL
  
VERCEL_PROJECT_ID_DEV
  ↓ Create Vercel project: "dhanpe-dev"

VERCEL_PROJECT_ID_STAGING
  ↓ Create Vercel project: "dhanpe-staging"

VERCEL_PROJECT_ID_PROD
  ↓ Create Vercel project: "dhanpe-prod"
```

### 2. Environment Branches

In `Settings → Environments` create 3 environments:

```
Development (develop)
  - Auto-deploy enabled
  - No approval required
  
Staging (staging)
  - Auto-deploy enabled
  - No approval required
  
Production (main)
  ⚠️ REQUIRES APPROVAL
  - Manual approval required
  - Only 2 people can approve
  - Auto-time out after 30 days
```

### 3. Branch Protection Rules

Go to `Settings → Branches` and protect:

#### `main` (Production)
- Require pull request reviews: yes (1 approval)
- Require status checks to pass: yes
  - ✓ security-and-lint
  - ✓ test-and-build
- Require branches to be up to date: yes
- Include administrators: yes
- Restrict who can push: only `@dhanpe-ci` bot (optional)

#### `staging` (Staging)
- Require pull request reviews: yes (1 approval)
- Require status checks to pass: yes
- Require branches to be up to date: yes

#### `develop` (Development)
- Require status checks to pass: yes
- Fast merge allowed (no reviews needed - fast iteration)

---

## Vercel Project Setup

### Step 1: Create 3 Vercel Projects

```bash
# A. Development
vercel --name dhanpe-dev --confirm
  → Copy PROJECT_ID_DEV

# B. Staging  
vercel --name dhanpe-staging --confirm
  → Copy PROJECT_ID_STAGING

# C. Production
vercel --name dhanpe-prod --confirm
  → Copy PROJECT_ID_PROD
```

### Step 2: Environment Variables in Vercel

For **each** Vercel project, go to `Settings → Environment Variables` and add:

```
Development (dhanpe-dev):
  - DATABASE_URL: (dev PostgreSQL connection)
  - JWT_SECRET: (dev JWT key)
  - CASHFREE_CLIENT_ID: (sandbox)
  - CASHFREE_CLIENT_SECRET: (sandbox)
  - NODE_ENV: development

Staging (dhanpe-staging):
  - DATABASE_URL: (staging PostgreSQL connection)
  - JWT_SECRET: (staging JWT key)
  - CASHFREE_CLIENT_ID: (sandbox)
  - CASHFREE_CLIENT_SECRET: (sandbox)
  - NODE_ENV: staging

Production (dhanpe-prod):
  ⚠️ CRITICAL - USE EXTREME CARE
  - DATABASE_URL: (prod PostgreSQL - must be highly reliable)
  - JWT_SECRET: (prod JWT secret - NEW, not copied from dev)
  - CASHFREE_CLIENT_ID: (LIVE CREDENTIALS)
  - CASHFREE_CLIENT_SECRET: (LIVE CREDENTIALS)
  - NODE_ENV: production
```

### Step 3: Connect GitHub Repository

For each Vercel project:
1. Go to `Settings → Git`
2. Connect GitHub repository
3. Set Production Branch: `main`
4. Set Preview Branch: `staging`
5. Disable Auto-Deploy (let GitHub Actions handle it)

---

## Deployment Workflow

### Normal Development (feature → develop)
```
1. Create feature branch: git checkout -b feature/new-feature
2. Make changes, commit
3. Push: git push origin feature/new-feature
4. Create PR to develop
5. CI runs: ✓ lint ✓ tests ✓ build
6. Merge approved
7. Auto-deploy to dev.dhanpe.com
8. Test in dev environment
```

### Promote to Staging
```
1. Create PR: develop → staging
2. CI runs automatically
3. Merge approved
4. Auto-deploy to staging.dhanpe.com
5. Run smoke tests & QA approval
```

### Production Release
```
1. Create PR: staging → main
2. CI runs: lint → test → build
3. ⚠️ PRODUCTION APPROVAL REQUIRED
4. Only authorized team members approve
5. Once approved, auto-deploy to api.dhanpe.com
6. Smoke tests run
7. ✅ LIVE
```

---

## Local Development

### First Time Setup

```bash
cd backend

# Install dependencies
npm ci

# Setup git hooks (optional but recommended)
npm install husky lint-staged --save-dev

# Generate Prisma client
npx prisma generate

# Create local .env
cp .env.development .env.local
# Edit .env.local with your local PostgreSQL connection
```

### Before Committing

```bash
# Format code
npm run format

# Check linting
npm run lint

# Run tests
npm run test

# Build
npm run build
```

---

## Troubleshooting

### "Failed to deploy: Status check failed"
- Check GitHub Actions run: `Actions → Latest run`
- Look for red X on lint/test step
- Common fixes:
  ```bash
  npm run format              # Fix formatting
  npm run lint -- --fix       # Fix linting issues
  npm run test                # Fix test failures
  ```

### "Vercel deployment failed"
- Check Vercel logs: `Vercel Dashboard → Project → Deployments`
- Verify environment variables are set in Vercel
- Check DATABASE_URL is accessible from Vercel region

### "I need to rollback production"
```bash
# Go to Vercel dashboard
# Find the "Deployments" tab
# Click "Rollback" on previous stable version
```

---

## Security Checklist

- [ ] Production environment requires 2-person approval
- [ ] Secrets are **NOT** in .env, .gitignore includes all .env files
- [ ] Database credentials encrypted in Vercel
- [ ] Cashfree credentials rotated every 90 days
- [ ] All secrets have separate dev/staging/prod values
- [ ] npm audit passes with zero critical vulnerabilities
- [ ] ESLint + Prettier configured for code quality
- [ ] Tests have 70%+ coverage
- [ ] Staging tests passed before prod merge

---

## Key Takeaways

✅ **Quality First**: Lint & security checks block bad code early
✅ **Parallel Testing**: Tests & build run simultaneously  
✅ **Auto Deploy**: Dev/Staging auto-deploy on merge
✅ **Manual Prod**: Production requires approval before going live
✅ **Zero Downtime**: Vercel handles deployments without downtime
✅ **Observability**: Each environment has separate logs & monitoring


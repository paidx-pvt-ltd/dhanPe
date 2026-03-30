#!/bin/bash

# ============================================
# QUICK CI/CD SETUP SCRIPT
# Run this after all files are pushed to GitHub
# ============================================

echo "🚀 dhanPe CI/CD Setup Guide"
echo "================================"
echo ""

# Step 1: GitHub Secrets
echo "📝 STEP 1: Add GitHub Secrets"
echo "  Go to: Settings → Secrets and variables → Actions"
echo ""
echo "  Add these secrets:"
echo "    • VERCEL_TOKEN (from vercel.com/account/tokens)"
echo "    • VERCEL_ORG_ID (from Vercel dashboard URL)"
echo "    • VERCEL_PROJECT_ID_DEV"
echo "    • VERCEL_PROJECT_ID_STAGING"
echo "    • VERCEL_PROJECT_ID_PROD"
echo ""
read -p "✓ Done adding secrets? (y/n) " -n 1 -r
echo

# Step 2: Vercel Projects
echo ""
echo "📝 STEP 2: Create Vercel Projects"
echo "  You'll create 3 projects on vercel.com:"
echo ""
echo "  A. Development"
echo "     Name: dhanpe-dev"
echo "     Branch: develop"
echo ""
echo "  B. Staging  "
echo "     Name: dhanpe-staging"
echo "     Branch: staging"
echo ""
echo "  C. Production"
echo "     Name: dhanpe-prod"
echo "     Branch: main"
echo ""
read -p "✓ Done creating Vercel projects? (y/n) " -n 1 -r
echo

# Step 3: Environment Variables
echo ""
echo "📝 STEP 3: Add Environment Variables to Each Vercel Project"
echo "  For each project, go to: Settings → Environment Variables"
echo ""
echo "  Development (dhanpe-dev):"
echo "    DATABASE_URL: [dev postgres connection]"
echo "    JWT_SECRET: [dev secret]"
echo "    CASHFREE_CLIENT_ID: [sandbox]"
echo "    CASHFREE_CLIENT_SECRET: [sandbox]"
echo "    NODE_ENV: development"
echo ""
read -p "✓ Done adding dev env vars? (y/n) " -n 1 -r
echo

echo "  Staging (dhanpe-staging):"
echo "    DATABASE_URL: [staging postgres connection]"
echo "    JWT_SECRET: [staging secret]"
echo "    CASHFREE_CLIENT_ID: [sandbox]"
echo "    CASHFREE_CLIENT_SECRET: [sandbox]"
echo "    NODE_ENV: staging"
echo ""
read -p "✓ Done adding staging env vars? (y/n) " -n 1 -r
echo

echo "  ⚠️  Production (dhanpe-prod) - CRITICAL"
echo "    DATABASE_URL: [prod postgres - persistent!]"
echo "    JWT_SECRET: [prod secret - CHANGE THIS]"
echo "    CASHFREE_CLIENT_ID: [LIVE credentials]"
echo "    CASHFREE_CLIENT_SECRET: [LIVE credentials]"
echo "    NODE_ENV: production"
echo ""
read -p "✓ Done adding prod env vars? (y/n) " -n 1 -r
echo

# Step 4: Branch Protection
echo ""
echo "📝 STEP 4: Configure Branch Protection"
echo "  Go to: Settings → Branches"
echo ""
echo "  Protect 'main' branch:"
echo "    ✓ Require pull request reviews (1 approval)"
echo "    ✓ Require status checks to pass"
echo "    ✓ Require branches to be up to date"
echo "    ✓ Include administrators"
echo ""
read -p "✓ Done protecting main? (y/n) " -n 1 -r
echo

echo "  Protect 'staging' branch:"
echo "    ✓ Require pull request reviews (1 approval)"
echo "    ✓ Require status checks to pass"
echo "    ✓ Require branches to be up to date"
echo ""
read -p "✓ Done protecting staging? (y/n) " -n 1 -r
echo

echo "  Protect 'develop' branch:"
echo "    ✓ Require status checks to pass"
echo "    (NO reviews needed - fast iteration)"
echo ""
read -p "✓ Done protecting develop? (y/n) " -n 1 -r
echo

# Step 5: Environment Settings
echo ""
echo "📝 STEP 5: Create Deployment Environments"
echo "  Go to: Settings → Environments"
echo ""
echo "  Create 'development':"
echo "    - No approval required"
echo ""
read -p "✓ Done? (y/n) " -n 1 -r
echo

echo "  Create 'staging':"
echo "    - No approval required"
echo ""
read -p "✓ Done? (y/n) " -n 1 -r
echo

echo "  Create 'production':"
echo "    - ⚠️ REQUIRES APPROVAL"
echo "    - Set reviewers (2 people)"
echo "    - Auto-timeout: 30 days"
echo ""
read -p "✓ Done? (y/n) " -n 1 -r
echo

echo ""
echo "✅ All done!"
echo ""
echo "📊 Next steps:"
echo "  1. Push this code to GitHub"
echo "  2. Create a PR: feature/something → develop"
echo "  3. Watch GitHub Actions run (should be green ✓)"
echo "  4. Merge PR"
echo "  5. Auto-deploy to dev.dhanpe.com"
echo ""
echo "🎉 You now have production-grade CI/CD!"

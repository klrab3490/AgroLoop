#!/usr/bin/env bash
set -e

# ==============================================================================
# Push AgroLoop to GitHub without changing any historical committer data
# Target: https://github.com/klrab3490/AgroLoop.git
# ==============================================================================

TARGET_REMOTE="https://github.com/klrab3490/AgroLoop.git"

echo "=========================================================="
echo "Pushing AgroLoop to GitHub (Committer data untouched)"
echo "Target Remote: $TARGET_REMOTE"
echo "=========================================================="

# 1. Stage and commit the new AgroLoop name and logo updates
if [ -n "$(git status --porcelain)" ]; then
    echo "Committing AgroLoop brand and logo updates..."
    git add .
    git commit -m "chore(branding): update project name and logo to AgroLoop"
else
    echo "No uncommitted changes."
fi

# 2. Set remote to the new repository
echo "Configuring remote origin to $TARGET_REMOTE..."
if git remote | grep -q "^origin$"; then
    git remote set-url origin "$TARGET_REMOTE"
else
    git remote add origin "$TARGET_REMOTE"
fi

# 3. Push to GitHub
CURRENT_BRANCH=$(git branch --show-current)
echo "Pushing branch $CURRENT_BRANCH and all tags to $TARGET_REMOTE..."
git push -u origin "$CURRENT_BRANCH" --force
git push origin --tags --force

echo ""
echo "=========================================================="
echo "SUCCESS! AgroLoop pushed to GitHub with original committer history:"
echo "  $TARGET_REMOTE"
echo "=========================================================="

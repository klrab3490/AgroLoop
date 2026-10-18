# ==============================================================================
# Push AgroLoop to GitHub without changing historical committer data (PowerShell)
# Target: https://github.com/klrab3490/AgroLoop.git
# ==============================================================================

$TargetRemote = "https://github.com/klrab3490/AgroLoop.git"

Write-Host "=========================================================="
Write-Host "Pushing AgroLoop to GitHub (Committer data untouched)"
Write-Host "Target Remote: $TargetRemote"
Write-Host "=========================================================="

# 1. Commit branding changes
$status = git status --porcelain
if ($status) {
    Write-Host "Committing AgroLoop brand and logo updates..."
    git add .
    git commit -m "chore(branding): update project name and logo to AgroLoop"
}

# 2. Set remote origin
Write-Host "Configuring remote origin to $TargetRemote..."
$remotes = git remote
if ($remotes -contains "origin") {
    git remote set-url origin $TargetRemote
} else {
    git remote add origin $TargetRemote
}

# 3. Push to GitHub
$currentBranch = (git branch --show-current).Trim()
Write-Host "Pushing branch $currentBranch and all tags to $TargetRemote..."
git push -u origin "$currentBranch" --force
git push origin --tags --force

Write-Host ""
Write-Host "=========================================================="
Write-Host "SUCCESS! AgroLoop pushed to GitHub with original committer history:"
Write-Host "  $TargetRemote"
Write-Host "=========================================================="

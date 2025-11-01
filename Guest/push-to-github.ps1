# Script to replace all GitHub repository contents with local project
# WARNING: This will overwrite everything in the remote repository

Write-Host "=== Push Local Project to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Show current status
Write-Host "📊 Current Git Status:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Step 2: Stage all changes (including deletions and new files)
Write-Host "📦 Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host "✅ All changes staged" -ForegroundColor Green
Write-Host ""

# Step 3: Create commit
$commitMessage = "Update project: Replace all contents with current local state"
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
Write-Host "   Message: $commitMessage" -ForegroundColor Gray
git commit -m $commitMessage
Write-Host "✅ Changes committed" -ForegroundColor Green
Write-Host ""

# Step 4: Check if user wants to force push
Write-Host "⚠️  WARNING: This will replace ALL remote content with local content" -ForegroundColor Red
Write-Host "   Remote repository: https://github.com/strylith/Kina-Resort-main.git" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "Do you want to push to GitHub? (yes/no)"

if ($confirm -eq "yes" -or $confirm -eq "y") {
    Write-Host ""
    Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "   Repository: https://github.com/strylith/Kina-Resort-main" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Push failed. You may need to pull first or force push." -ForegroundColor Red
        Write-Host ""
        Write-Host "If you're sure you want to replace remote with local, run:" -ForegroundColor Yellow
        Write-Host "   git push origin main --force" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  WARNING: --force will overwrite remote history!" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "❌ Push cancelled" -ForegroundColor Yellow
    Write-Host "   Changes are committed locally but not pushed" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Cyan


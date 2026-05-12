# ============================================
# cache-bust.ps1 — Mini Games Hub
# 
# RUN THIS SCRIPT every time you update code.
# It adds ?v=TIMESTAMP to all local CSS/JS refs
# and ensures no-cache meta tags are present.
#
# Usage:  powershell -File cache-bust.ps1
# ============================================

$projectDir = $PSScriptRoot
if (-not $projectDir) {
    $projectDir = "c:\Users\HP\Desktop\Web Game\mini-games-website"
}

# Generate a version timestamp (Unix seconds)
$version = [int][double]::Parse((Get-Date -UFormat %s))

Write-Host "=== Mini Games Hub Cache Buster ===" -ForegroundColor Cyan
Write-Host "Version: $version" -ForegroundColor Yellow
Write-Host ""

# Process all HTML files
$htmlFiles = Get-ChildItem -Path $projectDir -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw

    # Add no-cache meta tags if missing (after <meta name="viewport">)
    if ($content -notmatch 'http-equiv="Cache-Control"') {
        $cacheMeta = @"
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
"@
        $content = $content -replace '(<meta name="viewport"[^/]*/\s*>)', "`$1`n$cacheMeta"
    }

    # Strip old version query strings: ?v=anything
    $content = $content -replace '(\.(css|js))\?v=[^"''>\s]+', '$1'

    # Add new version to local CSS refs (not CDN/external)
    $content = $content -replace '(href="(?!https?://)[^"]*\.css)"', "`$1?v=$version`""

    # Add new version to local JS refs (not CDN/external)  
    $content = $content -replace '(src="(?!https?://)[^"]*\.js)"', "`$1?v=$version`""

    Set-Content $file.FullName $content -NoNewline
    $relativePath = $file.FullName.Replace($projectDir, "").TrimStart("\")
    Write-Host "[OK] $relativePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Done! $($htmlFiles.Count) HTML files updated ===" -ForegroundColor Cyan
Write-Host "Version string: ?v=$version" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Commit & deploy these changes to your server." -ForegroundColor Magenta

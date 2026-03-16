# ==============================================
# CronoReport - CSS Modularization Script
# Splits styles.css (4392 lines) into 12 partials
# ==============================================

Set-Location "C:\Users\dom19\Desktop\CronoReport"

Write-Host ""
Write-Host "=== CSS MODULARIZATION ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "[1/6] Creating backup..." -ForegroundColor Cyan
Copy-Item "styles.css" "styles.css.backup-modular" -Force
Write-Host "  OK backup created" -ForegroundColor Green

Write-Host "[2/6] Reading styles.css..." -ForegroundColor Cyan
$allLines = Get-Content "styles.css" -Encoding UTF8
$totalLines = $allLines.Count
Write-Host "  OK $totalLines lines read" -ForegroundColor Green

Write-Host "[3/6] Creating styles/ directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "styles" -Force | Out-Null
Write-Host "  OK styles/" -ForegroundColor Green

function Write-Partial {
    param(
        [string]$FileName,
        [int[]]$Ranges,
        [bool]$WrapInLayer
    )
    $extracted = [System.Collections.ArrayList]::new()
    for ($i = 0; $i -lt $Ranges.Count; $i += 2) {
        $startIdx = $Ranges[$i] - 1
        $endIdx   = $Ranges[$i + 1] - 1
        if ($extracted.Count -gt 0) {
            [void]$extracted.Add("")
        }
        for ($j = $startIdx; $j -le $endIdx; $j++) {
            [void]$extracted.Add($allLines[$j])
        }
    }
    $output = [System.Collections.ArrayList]::new()
    if ($WrapInLayer) {
        [void]$output.Add("@layer components {")
        [void]$output.Add("")
        foreach ($line in $extracted) { [void]$output.Add($line) }
        [void]$output.Add("")
        [void]$output.Add("}")
    }
    else {
        foreach ($line in $extracted) { [void]$output.Add($line) }
    }
    $path = Join-Path "styles" $FileName
    $fullPath = Join-Path $PWD $path
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($fullPath, $output.ToArray(), $utf8NoBom)
    $cl = $extracted.Count
    Write-Host "  $FileName - $cl lines" -ForegroundColor Green
}

Write-Host "[4/6] Splitting into partials..." -ForegroundColor Cyan
Write-Host ""

Write-Partial -FileName "theme.css"            -Ranges @(6, 112)                   -WrapInLayer $false
Write-Partial -FileName "base.css"             -Ranges @(116, 184)                 -WrapInLayer $false
Write-Partial -FileName "design-system.css"    -Ranges @(188, 577)                 -WrapInLayer $true
Write-Partial -FileName "bootstrap-compat.css" -Ranges @(579, 1363)                -WrapInLayer $true
Write-Partial -FileName "saved-timers.css"     -Ranges @(1365, 1632)               -WrapInLayer $true
Write-Partial -FileName "report-wizard.css"    -Ranges @(1634, 2050, 3862, 3898)   -WrapInLayer $true
Write-Partial -FileName "timer-page.css"       -Ranges @(2052, 2262, 3612, 3700)   -WrapInLayer $true
Write-Partial -FileName "data-management.css"  -Ranges @(2264, 2491, 3702, 3860)   -WrapInLayer $true
Write-Partial -FileName "soul-and-depth.css"   -Ranges @(2605, 3009)               -WrapInLayer $true
Write-Partial -FileName "dashboard.css"        -Ranges @(3011, 3610)               -WrapInLayer $true
Write-Partial -FileName "wysiwyg-preview.css"  -Ranges @(3900, 4380)               -WrapInLayer $true
Write-Partial -FileName "responsive.css"       -Ranges @(2493, 2603, 4381, 4391)   -WrapInLayer $true

Write-Host ""
Write-Host "[5/6] Writing barrel styles.css..." -ForegroundColor Cyan

$barrel = @(
    '@import "tailwindcss";'
    '@source "./*.js";'
    '@source "./*.html";'
    '@source "./src/**/*.js";'
    ''
    '/* === CronoReport Design System === */'
    '@import "./styles/theme.css";'
    '@import "./styles/base.css";'
    '@import "./styles/design-system.css";'
    '@import "./styles/bootstrap-compat.css";'
    '@import "./styles/saved-timers.css";'
    '@import "./styles/report-wizard.css";'
    '@import "./styles/timer-page.css";'
    '@import "./styles/data-management.css";'
    '@import "./styles/soul-and-depth.css";'
    '@import "./styles/dashboard.css";'
    '@import "./styles/wysiwyg-preview.css";'
    '@import "./styles/responsive.css";'
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$barrelPath = Join-Path $PWD "styles.css"
[System.IO.File]::WriteAllLines($barrelPath, $barrel, $utf8NoBom)
Write-Host "  OK barrel written" -ForegroundColor Green

Write-Host ""
Write-Host "[6/6] Verification..." -ForegroundColor Cyan
$partialFiles = Get-ChildItem "styles/*.css" | Sort-Object Name
$totalPartialLines = 0
Write-Host ""
foreach ($f in $partialFiles) {
    $count = (Get-Content $f.FullName).Count
    $totalPartialLines += $count
    $name = $f.Name.PadRight(25)
    Write-Host "  $name $count" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Original: $totalLines lines" -ForegroundColor White
Write-Host "  Partials: $totalPartialLines lines total" -ForegroundColor White
Write-Host "  Files:    $($partialFiles.Count)" -ForegroundColor White
Write-Host ""
Write-Host "DONE!" -ForegroundColor Green

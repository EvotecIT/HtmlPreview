[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'packages/preview-core'
$target = Join-Path $root 'site/core'
$assetShimTarget = Join-Path $root 'site/assets/core'
$siteNoJekyll = Join-Path $root 'site/.nojekyll'

if (-not (Test-Path -LiteralPath $source)) {
    throw "Preview core source folder not found: $source"
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
New-Item -ItemType Directory -Force -Path $assetShimTarget | Out-Null

Get-ChildItem -LiteralPath $target -Filter '*.js' -File -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -LiteralPath $assetShimTarget -Filter '*.js' -File -ErrorAction SilentlyContinue | Remove-Item -Force

$files = Get-ChildItem -LiteralPath $source -Filter '*.js' -File | Sort-Object Name
foreach ($file in $files) {
    $destination = Join-Path $target $file.Name
    Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    Write-Host "Copied $($file.FullName) -> $destination"
}

$shim = Join-Path $assetShimTarget 'index.js'
Set-Content -LiteralPath $shim -Value "export * from '../../core/index.js?v=20260513-initial-mode-lazy2';" -Encoding UTF8
Write-Host "Created $shim"

if (-not (Test-Path -LiteralPath $siteNoJekyll)) {
    New-Item -ItemType File -Path $siteNoJekyll -Force | Out-Null
    Write-Host "Created $siteNoJekyll"
}

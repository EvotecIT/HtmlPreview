[CmdletBinding()]
param(
    [int] $Port = 8080
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$site = Join-Path $root 'site'
$prepare = Join-Path $PSScriptRoot 'prepare-site.ps1'

& $prepare

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $python) {
    Write-Host "Python was not found. Run a static web server from: $site"
    Write-Host "Then open: http://localhost:$Port/"
    exit 1
}

Push-Location $site
try {
    Write-Host "Serving $site at http://localhost:$Port/"
    if ($python.Name -eq 'py.exe' -or $python.Name -eq 'py') {
        & $python.Source -3 -m http.server $Port
    } else {
        & $python.Source -m http.server $Port
    }
}
finally {
    Pop-Location
}

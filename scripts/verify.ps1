$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot

function Invoke-ProjectCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Project,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $projectPath = Join-Path $workspace $Project
    Push-Location $projectPath
    try {
        & npm @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed in ${Project}: npm $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

Invoke-ProjectCommand -Project "Backend" -Arguments @("test")
Invoke-ProjectCommand -Project "frontend-user" -Arguments @("run", "build")
Invoke-ProjectCommand -Project "frontend-superAdmin" -Arguments @("run", "build")
Invoke-ProjectCommand -Project "Support" -Arguments @("run", "build")
Invoke-ProjectCommand -Project "frontend-user" -Arguments @("run", "test:e2e")

Write-Host ""
Write-Host "All verification checks passed." -ForegroundColor Green

$ErrorActionPreference = "Continue"
$script:failed = $false
function Check-Path([string]$label, [string]$path) {
    if (Test-Path -LiteralPath $path) {
        Write-Host "[OK] $label : $path" -ForegroundColor Green
    } else {
        Write-Host "[FALTA] $label : $path" -ForegroundColor Yellow
        $script:failed = $true
    }
}
function Find-Tool([string]$root, [string]$name) {
    $direct = Join-Path $root $name
    if (Test-Path -LiteralPath $direct) { return $direct }
    $found = Get-ChildItem -LiteralPath $root -Filter $name -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}
Write-Host "=== HADES STORE - PRE-CHECK WINDOWS ===" -ForegroundColor Cyan
$nativeRoot = Split-Path -Parent $PSScriptRoot
$toolchain = $env:OO_PS4_TOOLCHAIN
if ([string]::IsNullOrWhiteSpace($toolchain)) {
    Write-Host "[FALTA] Variavel OO_PS4_TOOLCHAIN nao definida." -ForegroundColor Red
    $script:failed = $true
} elseif (-not (Test-Path -LiteralPath $toolchain)) {
    Write-Host "[FALTA] Pasta da toolchain nao encontrada: $toolchain" -ForegroundColor Red
    $script:failed = $true
} else {
    Check-Path "Linker script" (Join-Path $toolchain "link.x")
    Check-Path "CRT" (Join-Path $toolchain "lib\crt1.o")
    Check-Path "libc" (Join-Path $toolchain "lib\libc.a")
    Check-Path "libc++" (Join-Path $toolchain "lib\libc++.a")
    Check-Path "libkernel shared" (Join-Path $toolchain "lib\libkernel.so")
    foreach ($tool in @("create-fself.exe", "create-gp4.exe", "PkgTool.Core.exe")) {
        $found = Find-Tool $toolchain $tool
        if ($found) { Write-Host "[OK] $tool : $found" -ForegroundColor Green }
        else { Write-Host "[FALTA] $tool" -ForegroundColor Yellow; $script:failed = $true }
    }
}
$clang = Get-Command clang++.exe -ErrorAction SilentlyContinue
if ($clang) { Write-Host "[OK] clang++ : $($clang.Source)" -ForegroundColor Green }
else { Write-Host "[FALTA] clang++ nao encontrado no PATH." -ForegroundColor Yellow; $script:failed = $true }
$required = @(
 "src\main.cpp", "src\HadesApp.cpp", "src\Catalog.cpp", "src\Json.cpp",
 "src\DownloadManager.cpp", "src\CatalogService.cpp", "src\Settings.cpp",
 "src\HadesApp.h", "src\Catalog.h", "src\Json.h", "src\DownloadManager.h",
 "src\AppLoop.h", "src\AppView.h", "src\Input.h", "src\Platform.h",
 "src\ViewRenderer.h", "src\UiTheme.h", "src\ControllerMapping.h", "sources.cmake",
 "tools\build-hades.ps1", "tools\build-config.example.psd1",
 "tools\validate-package-metadata.ps1", "package\package-metadata.example.json",
 "src\CatalogService.h", "src\Settings.h", "catalog\catalog-v1.example.json",
 "catalog\SCHEMA.md"
)
foreach ($relative in $required) { Check-Path $relative (Join-Path $nativeRoot $relative) }
Write-Host ""
Write-Host "Este pre-check nao compila, nao gera PKG e nao altera arquivos."
if ($script:failed) { Write-Host "Resultado: HA PENDENCIAS" -ForegroundColor Yellow; exit 1 }
Write-Host "Resultado: ESTRUTURA BASICA PRESENTE" -ForegroundColor Green
exit 0

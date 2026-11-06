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
Write-Host "=== HADES STORE - PRE-CHECK WINDOWS ===" -ForegroundColor Cyan
$repoRoot = Split-Path -Parent $PSScriptRoot
$toolchain = $env:OO_PS4_TOOLCHAIN
if ([string]::IsNullOrWhiteSpace($toolchain)) {
    Write-Host "[FALTA] Variavel OO_PS4_TOOLCHAIN nao definida." -ForegroundColor Red
    $script:failed = $true
} else {
    Check-Path "Toolchain" $toolchain
    Check-Path "Linker script" (Join-Path $toolchain "link.x")
    Check-Path "CRT" (Join-Path $toolchain "lib\crt1.o")
    Check-Path "libc" (Join-Path $toolchain "lib\libc.a")
    Check-Path "libc++" (Join-Path $toolchain "lib\libc++.a")
    Check-Path "libkernel shared" (Join-Path $toolchain "lib\libkernel.so")
    Check-Path "SELF creator" (Join-Path $toolchain "bin\create-fself.exe")
}
$llvm = Get-Command clang++.exe -ErrorAction SilentlyContinue
if ($llvm) { Write-Host "[OK] clang++ : $($llvm.Source)" -ForegroundColor Green }
else { Write-Host "[FALTA] clang++ nao encontrado no PATH." -ForegroundColor Yellow; $script:failed = $true }
$required = @(
 "src\main.cpp", "src\HadesApp.cpp", "src\Catalog.cpp",
 "src\Json.cpp", "src\DownloadManager.cpp", "src\CatalogService.cpp",
 "src\Settings.cpp", "src\HadesApp.h", "src\Catalog.h",
 "src\Json.h", "src\DownloadManager.h", "src\CatalogService.h",
 "src\Settings.h", "catalog\catalog-v1.example.json",
 "catalog\SCHEMA.md"
)
foreach ($relative in $required) { Check-Path $relative (Join-Path $PSScriptRoot $relative) }
Write-Host ""
Write-Host "Este pre-check nao compila, nao gera PKG e nao altera arquivos."
Write-Host "Resultado: " -NoNewline
if ($script:failed) { Write-Host "HA PENDENCIAS" -ForegroundColor Yellow; exit 1 }
Write-Host "ESTRUTURA BASICA PRESENTE" -ForegroundColor Green
exit 0

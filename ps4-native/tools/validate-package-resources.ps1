param(
    [string]$NativeRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$MetadataPath = "package/package-metadata.example.json",
    [string]$ManifestPath = "package/resources-manifest.example.json"
)

$ErrorActionPreference = "Stop"
$failed = $false

function Fail([string]$Message) {
    Write-Host "[ERRO] $Message" -ForegroundColor Red
    $script:failed = $true
}
function Pass([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

$root = [System.IO.Path]::GetFullPath($NativeRoot)
$metadataFile = Join-Path $root $MetadataPath
$manifestFile = Join-Path $root $ManifestPath

Write-Host "=== HADES STORE - VALIDACAO DE RECURSOS ===" -ForegroundColor Cyan

foreach ($file in @($metadataFile, $manifestFile)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        Fail "Arquivo de configuracao ausente: $file"
    }
}
if ($failed) { exit 1 }

try {
    $metadata = Get-Content -LiteralPath $metadataFile -Raw | ConvertFrom-Json
    $manifest = Get-Content -LiteralPath $manifestFile -Raw | ConvertFrom-Json
} catch {
    Fail "JSON invalido: $($_.Exception.Message)"
    exit 1
}

if ($metadata.schemaVersion -ne 1) { Fail "schemaVersion dos metadados deve ser 1." }
if ($manifest.schemaVersion -ne 1) { Fail "schemaVersion do manifesto deve ser 1." }
if ([string]::IsNullOrWhiteSpace([string]$metadata.executable)) {
    Fail "Metadados sem caminho de executavel."
}
if ([string]::IsNullOrWhiteSpace([string]$metadata.icon)) {
    Fail "Metadados sem caminho de icone."
}
if ([string]::IsNullOrWhiteSpace([string]$manifest.packageRoot)) {
    Fail "Manifesto sem packageRoot."
}
if (-not $manifest.resources -or @($manifest.resources).Count -eq 0) {
    Fail "Manifesto sem recursos."
}

$packageRoot = [string]$manifest.packageRoot
if ([System.IO.Path]::IsPathRooted($packageRoot) -or $packageRoot -match '(^|[\\/])\.\.([\\/]|$)') {
    Fail "packageRoot deve ser relativo e nao pode subir diretorios."
    exit 1
}
$packageDirectory = [System.IO.Path]::GetFullPath((Join-Path $root $packageRoot))
if (-not $packageDirectory.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail "packageRoot aponta para fora da pasta nativa."
    exit 1
}

$seen = @{}
$manifestPaths = @()
foreach ($resource in @($manifest.resources)) {
    $relative = [string]$resource.path
    if ([string]::IsNullOrWhiteSpace($relative) -or [System.IO.Path]::IsPathRooted($relative) -or $relative -match '(^|[\\/])\.\.([\\/]|$)') {
        Fail "Caminho de recurso invalido: '$relative'"
        continue
    }
    $normalized = $relative.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    if ($seen.ContainsKey($normalized)) {
        Fail "Recurso duplicado no manifesto: $relative"
        continue
    }
    $seen[$normalized] = $true
    $manifestPaths += $normalized
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $packageDirectory $normalized))
    if (-not $fullPath.StartsWith($packageDirectory, [System.StringComparison]::OrdinalIgnoreCase)) {
        Fail "Recurso fora da raiz do pacote: $relative"
        continue
    }
    if ($resource.required -and -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        Write-Host "[PENDENTE] Recurso obrigatorio ainda nao existe: $fullPath" -ForegroundColor Yellow
        $script:failed = $true
    } elseif (Test-Path -LiteralPath $fullPath -PathType Leaf) {
        Pass "Recurso presente: $relative"
    }
}

$expectedExecutable = ([string]$metadata.executable).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
$expectedIcon = ([string]$metadata.icon).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
if ($expectedExecutable -notin $manifestPaths) { Fail "Executavel dos metadados nao esta listado no manifesto." }
if ($expectedIcon -notin $manifestPaths) { Fail "Icone dos metadados nao esta listado no manifesto." }

if ($failed) {
    Write-Host "Resultado: HA PENDENCIAS. Nenhum arquivo foi gerado ou alterado." -ForegroundColor Yellow
    exit 1
}
Write-Host "Resultado: RECURSOS E REFERENCIAS CONSISTENTES." -ForegroundColor Green
Write-Host "Este validador nao inspeciona o formato interno dos arquivos nem gera PKG."
exit 0

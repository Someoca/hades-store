param(
    [string]$MetadataFile = ".\package\package-metadata.example.json"
)

$ErrorActionPreference = "Stop"
$nativeRoot = Split-Path -Parent $PSScriptRoot
$metadataPath = if ([IO.Path]::IsPathRooted($MetadataFile)) {
    $MetadataFile
} else {
    Join-Path $nativeRoot $MetadataFile
}
if (-not (Test-Path -LiteralPath $metadataPath -PathType Leaf)) {
    throw "Arquivo de metadados nao encontrado: $metadataPath"
}

$data = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
$errors = New-Object System.Collections.Generic.List[string]
if ($data.schemaVersion -ne 1) { $errors.Add("schemaVersion deve ser 1.") }
if ([string]::IsNullOrWhiteSpace($data.applicationName)) { $errors.Add("applicationName obrigatorio.") }
if ($data.titleId -notmatch '^[A-Z]{4}[0-9]{5}$') { $errors.Add("titleId deve conter quatro letras maiusculas e cinco digitos; use um identificador reservado para o projeto.") }
foreach ($field in @("contentId", "appVersion", "requiredSystemSoftwareVersion", "publisher", "executable", "icon")) {
    if ([string]::IsNullOrWhiteSpace([string]$data.$field) -or [string]$data.$field -eq "CHANGE_ME") {
        $errors.Add("$field precisa ser definido antes do empacotamento.")
    }
}
if ($data.executable -ne "eboot.bin") { $errors.Add("O executavel de pacote deve usar o nome eboot.bin.") }
if ($data.icon -ne "sce_sys/icon0.png") { $errors.Add("O icone deve estar em sce_sys/icon0.png.") }

Write-Host "=== HADES STORE - VALIDACAO DE METADADOS ===" -ForegroundColor Cyan
Write-Host "Aplicativo: $($data.applicationName)"
Write-Host "Title ID: $($data.titleId)"
Write-Host "Versao: $($data.appVersion)"
if ($errors.Count -gt 0) {
    foreach ($problem in $errors) { Write-Host "[PENDENTE] $problem" -ForegroundColor Yellow }
    throw "Metadados incompletos. Nenhum GP4/PKG foi gerado."
}
Write-Host "[OK] Metadados basicos preenchidos." -ForegroundColor Green
Write-Host "Esta etapa apenas valida o manifesto; nao cria param.sfo, GP4, FSELF ou PKG."

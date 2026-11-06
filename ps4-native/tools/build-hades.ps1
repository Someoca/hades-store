param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigFile
)

$ErrorActionPreference = "Stop"
$nativeRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $nativeRoot
$configPath = Resolve-Path -LiteralPath $ConfigFile -ErrorAction Stop
$config = Import-PowerShellDataFile -LiteralPath $configPath

function Require-ConfigValue([string]$name) {
    if (-not $config.ContainsKey($name) -or $null -eq $config[$name]) {
        throw "Configuracao obrigatoria ausente: $name"
    }
}

foreach ($name in @("Compiler", "Linker", "CompileFlags", "LinkFlags", "OutputPath")) {
    Require-ConfigValue $name
}
if (-not (Test-Path -LiteralPath $config.Compiler -PathType Leaf)) {
    throw "Compilador nao encontrado: $($config.Compiler)"
}
if (-not (Test-Path -LiteralPath $config.Linker -PathType Leaf)) {
    throw "Linker nao encontrado: $($config.Linker)"
}
if ($config.CompileFlags.Count -eq 0 -or $config.LinkFlags.Count -eq 0) {
    throw "CompileFlags e LinkFlags devem conter os parametros validados para sua release OpenOrbis."
}

$manifest = Join-Path $nativeRoot "sources.cmake"
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
    throw "Manifesto de fontes nao encontrado: $manifest"
}
$manifestText = Get-Content -LiteralPath $manifest -Raw
$sourceMatches = [regex]::Matches($manifestText, '(?m)^\s+(src/[^\s)]+\.cpp)\s*$')
$sources = @($sourceMatches | ForEach-Object { $_.Groups[1].Value.Replace('/', '\') })
if ($sources.Count -eq 0) { throw "Nenhum fonte C++ encontrado em sources.cmake." }

$objectDir = Join-Path $nativeRoot "build\obj"
New-Item -ItemType Directory -Force -Path $objectDir | Out-Null
$objects = @()
foreach ($relative in $sources) {
    $source = Join-Path $nativeRoot $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Fonte listado no manifesto nao encontrado: $source"
    }
    $object = Join-Path $objectDir (([IO.Path]::GetFileNameWithoutExtension($relative)) + ".o")
    $arguments = @($config.CompileFlags) + @("-I", (Join-Path $nativeRoot "src"), "-c", $source, "-o", $object)
    Write-Host "[COMPILAR] $relative"
    & $config.Compiler @arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar $relative (codigo $LASTEXITCODE)." }
    $objects += $object
}

$output = Join-Path $nativeRoot $config.OutputPath
$outputDirectory = Split-Path -Parent $output
if ($outputDirectory) { New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null }
$linkArguments = @($config.LinkFlags) + $objects + @("-o", $output)
Write-Host "[LINK] $output"
& $config.Linker @linkArguments
if ($LASTEXITCODE -ne 0) { throw "Falha na linkagem (codigo $LASTEXITCODE)." }

Write-Host "[OK] ELF gerado: $output" -ForegroundColor Green
Write-Host "Este script nao gera FSELF/PKG e nao instala no console."

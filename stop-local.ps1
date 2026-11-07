$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $env:TEMP 'hades-store-local-server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Output 'O servidor local da HADES Store não está registrado como ativo.'
    exit 0
}

$serverId = 0
[void][int]::TryParse((Get-Content -Raw -LiteralPath $pidFile), [ref]$serverId)
$serverProcess = if ($serverId -gt 0) { Get-CimInstance Win32_Process -Filter "ProcessId = $serverId" -ErrorAction SilentlyContinue }
if ($serverProcess -and $serverProcess.CommandLine -like '*serve_local.py*') {
    Stop-Process -Id $serverId -Force
    Write-Output 'Servidor local da HADES Store encerrado.'
} else {
    Write-Output 'O processo registrado já não está ativo.'
}
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue


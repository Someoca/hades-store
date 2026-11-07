$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $env:TEMP 'hades-store-local-server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Output 'O servidor local da HADES Store não está registrado como ativo.'
    exit 0
}

$pidParts = (Get-Content -Raw -LiteralPath $pidFile).Trim().Split('|')
$serverId = 0
[void][int]::TryParse($pidParts[0], [ref]$serverId)
$serverProcess = if ($serverId -gt 0) { Get-Process -Id $serverId -ErrorAction SilentlyContinue }
$isOurServer = $false
if ($serverProcess -and $serverProcess.ProcessName -eq 'node' -and $pidParts.Count -gt 1) {
    $isOurServer = $serverProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $pidParts[1]
}
if ($isOurServer) {
    Stop-Process -Id $serverId -Force
    Write-Output 'Servidor local da HADES Store encerrado.'
} else {
    Write-Output 'O processo registrado já não está ativo.'
}
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue


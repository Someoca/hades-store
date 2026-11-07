$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8000
$pidFile = Join-Path $env:TEMP 'hades-store-local-server.pid'
$stdoutLog = Join-Path $env:TEMP 'hades-store-local-server.log'
$stderrLog = Join-Path $env:TEMP 'hades-store-local-server-error.log'

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'serve_local.js'))) {
    throw 'serve_local.js was not found beside this script.'
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $nodeCommand) {
    throw 'Node.js is required. Install Node.js, then run this script again.'
}

$hostAddress = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object { $_.OperationalStatus -eq 'Up' } |
    ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
    ForEach-Object { $_.Address.IPAddressToString } |
    Where-Object { $_ -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } |
    Select-Object -First 1
if (-not $hostAddress) {
    throw 'No active private IPv4 address was found. Connect the PC to the local network and retry.'
}

if (Test-Path -LiteralPath $pidFile) {
    $pidParts = (Get-Content -Raw -LiteralPath $pidFile).Trim().Split('|')
    $existingId = 0
    [void][int]::TryParse($pidParts[0], [ref]$existingId)
    $existingProcess = if ($existingId -gt 0) { Get-Process -Id $existingId -ErrorAction SilentlyContinue }
    $matchesServer = $false
    if ($existingProcess -and $existingProcess.ProcessName -eq 'node' -and $pidParts.Count -gt 1) {
        $matchesServer = $existingProcess.StartTime.ToUniversalTime().Ticks.ToString() -eq $pidParts[1]
    }
    if ($matchesServer) {
        Write-Output "HADES Store já está rodando em http://${hostAddress}:$port/"
        exit 0
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$serverProcess = Start-Process -FilePath $nodeCommand.Source `
    -ArgumentList @('serve_local.js', '--host', $hostAddress, '--port', "$port") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru
Set-Content -LiteralPath $pidFile -Value "$($serverProcess.Id)|$($serverProcess.StartTime.ToUniversalTime().Ticks)" -Encoding ascii
Start-Sleep -Seconds 1

if ($serverProcess.HasExited) {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    $details = if (Test-Path -LiteralPath $stderrLog) { Get-Content -Raw -LiteralPath $stderrLog } else { 'No server log was created.' }
    throw "Local server did not start. $details"
}

Write-Output "HADES Store disponível na rede local: http://${hostAddress}:$port/"
Write-Output 'Abra esse endereço no PS4 ou em outro dispositivo conectado à mesma rede.'


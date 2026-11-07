$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8000
$pidFile = Join-Path $env:TEMP 'hades-store-local-server.pid'
$stdoutLog = Join-Path $env:TEMP 'hades-store-local-server.log'
$stderrLog = Join-Path $env:TEMP 'hades-store-local-server-error.log'

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'serve_local.py'))) {
    throw 'serve_local.py was not found beside this script.'
}

$pythonCommand = Get-Command python.exe, py.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pythonCommand) {
    throw 'Python 3 is required. Install Python 3, then run this script again.'
}

$networkConfig = Get-NetIPConfiguration | Where-Object {
    $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address
} | Select-Object -First 1
if (-not $networkConfig) {
    throw 'No active network interface with an IPv4 gateway was found.'
}
$hostAddress = $networkConfig.IPv4Address.IPAddress

if (Test-Path -LiteralPath $pidFile) {
    $existingId = 0
    [void][int]::TryParse((Get-Content -Raw -LiteralPath $pidFile), [ref]$existingId)
    $existingProcess = if ($existingId -gt 0) { Get-CimInstance Win32_Process -Filter "ProcessId = $existingId" -ErrorAction SilentlyContinue }
    if ($existingProcess -and $existingProcess.CommandLine -like '*serve_local.py*') {
        Write-Output "HADES Store já está rodando em http://${hostAddress}:$port/"
        exit 0
    }
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$serverProcess = Start-Process -FilePath $pythonCommand.Source `
    -ArgumentList @('serve_local.py', '--host', $hostAddress, '--port', "$port") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru
Set-Content -LiteralPath $pidFile -Value $serverProcess.Id -Encoding ascii
Start-Sleep -Seconds 1

if ($serverProcess.HasExited) {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    $details = if (Test-Path -LiteralPath $stderrLog) { Get-Content -Raw -LiteralPath $stderrLog } else { 'No server log was created.' }
    throw "Local server did not start. $details"
}

Write-Output "HADES Store disponível na rede local: http://${hostAddress}:$port/"
Write-Output 'Abra esse endereço no PS4 ou em outro dispositivo conectado à mesma rede.'


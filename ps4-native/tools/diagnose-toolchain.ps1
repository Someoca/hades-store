$ErrorActionPreference = "Continue"
Write-Host "=== HADES / DIAGNOSTICO DA TOOLCHAIN PS4 ===" -ForegroundColor Cyan
$root = $env:OO_PS4_TOOLCHAIN
if ([string]::IsNullOrWhiteSpace($root)) {
  Write-Host "[FALHA] OO_PS4_TOOLCHAIN nao esta definida." -ForegroundColor Red
  exit 2
}
Write-Host "OO_PS4_TOOLCHAIN=$root"
if (-not (Test-Path -LiteralPath $root)) {
  Write-Host "[FALHA] O caminho da toolchain nao existe." -ForegroundColor Red
  exit 2
}
Write-Host "[OK] Pasta da toolchain encontrada." -ForegroundColor Green
$names = @("clang.exe","clang++.exe","llvm-readobj.exe","create-fself.exe","PkgTool.Core.exe","make.exe")
$found = @()
foreach ($name in $names) {
  $item = Get-ChildItem -LiteralPath $root -Filter $name -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($item) {
    $found += $item
    Write-Host "[OK] $name -> $($item.FullName)" -ForegroundColor Green
  } else {
    Write-Host "[AUSENTE] $name" -ForegroundColor Yellow
  }
}
Write-Host ""
Write-Host "Este diagnostico nao compila nem altera arquivos."
Write-Host "Proximo marco: compilar o hello_world oficial sem modificacoes."
if ($found.Count -eq 0) { exit 3 }
exit 0

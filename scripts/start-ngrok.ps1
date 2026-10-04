param(
  [string]$Domain = $env:NGROK_DOMAIN
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$adminEnv = Join-Path $repoRoot 'client/admin-dashboard/.env'
$mobileEnv = Join-Path $repoRoot 'client/mobile-client/.env'
$ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue
$ngrokPath = if ($ngrokCommand) {
  $ngrokCommand.Source
} else {
  Join-Path $env:LOCALAPPDATA 'ngrok/ngrok.exe'
}

if (-not (Test-Path $ngrokPath)) {
  throw 'ngrok chưa được cài hoặc chưa có trong PATH. Cài ngrok rồi chạy lại lệnh này.'
}

$arguments = @('http', '127.0.0.1:3000')
if ($Domain) {
  $arguments += "--domain=$Domain"
}

$tunnel = $null
$getTunnel = {
  $tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels'
  $httpsTunnels = @($tunnels.tunnels | Where-Object { $_.public_url -like 'https://*' })
  if ($Domain) {
    return $httpsTunnels |
      Where-Object { $_.public_url -eq "https://$Domain" } |
      Select-Object -First 1
  }
  return $httpsTunnels | Select-Object -First 1
}

try {
  $tunnel = & $getTunnel
} catch {
  $tunnel = $null
}

if (-not $tunnel) {
  Start-Process -FilePath $ngrokPath -ArgumentList $arguments -WindowStyle Minimized | Out-Null
}

for ($attempt = 0; $attempt -lt 30 -and -not $tunnel; $attempt++) {
  try {
    $tunnel = & $getTunnel
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $tunnel) {
  throw 'Không lấy được HTTPS URL từ ngrok. Kiểm tra ngrok auth hoặc cửa sổ ngrok.'
}

$apiUrl = $tunnel.public_url.TrimEnd('/')
Set-Content -Path $adminEnv -Value "VITE_API_BASE_URL=$apiUrl" -Encoding utf8
Set-Content -Path $mobileEnv -Value "EXPO_PUBLIC_API_URL=$apiUrl" -Encoding utf8

Write-Host "API tunnel: $apiUrl"
Write-Host 'Đã cập nhật client env. Khởi động lại dashboard/Expo để nạp URL mới.'
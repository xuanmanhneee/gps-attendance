param(
  [string]$Domain = $env:NGROK_DOMAIN,
  [int]$Port = 3001
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

$expectedAddress = "http://127.0.0.1:$Port"
$env:PORT = "$Port"
$arguments = @('http', "127.0.0.1:$Port")
if ($Domain) {
  $arguments += "--domain=$Domain"
}

function Get-NgrokTunnels {
  $ngrokProcesses = @(
    Get-CimInstance Win32_Process -Filter "Name = 'ngrok.exe'" -ErrorAction Stop
  )
  if ($ngrokProcesses.Count -eq 0) {
    return @()
  }

  $processIds = @($ngrokProcesses | ForEach-Object { [int]$_.ProcessId })
  $apiPorts = @(
    Get-NetTCPConnection -State Listen -ErrorAction Stop |
      Where-Object {
        $processIds -contains $_.OwningProcess -and
        $_.LocalPort -ge 4040 -and
        $_.LocalPort -le 4999
      } |
      Select-Object -ExpandProperty LocalPort -Unique
  )

  $activeTunnels = @()
  foreach ($apiPort in $apiPorts) {
    try {
      $agent = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/api/tunnels" -TimeoutSec 2
      foreach ($activeTunnel in $agent.tunnels) {
        $activeTunnels += $activeTunnel |
          Add-Member -NotePropertyName agentPort -NotePropertyValue $apiPort -PassThru
      }
    } catch {
      Write-Warning "Không đọc được ngrok API tại cổng $apiPort`: $($_.Exception.Message)"
    }
  }

  return $activeTunnels
}

$tunnel = $null
$httpsTunnels = @(Get-NgrokTunnels | Where-Object { $_.public_url -like 'https://*' })

if ($Domain) {
  $matchingDomain = @($httpsTunnels | Where-Object {
    $_.public_url -eq "https://$Domain"
  })
} else {
  $matchingDomain = $httpsTunnels
}

$tunnel = $matchingDomain |
  Where-Object { $_.config.addr -eq $expectedAddress } |
  Select-Object -First 1

if (-not $tunnel -and @($matchingDomain).Count -gt 0) {
  $staleTunnel = $matchingDomain[0]
  Write-Host "Đang thay tunnel $($staleTunnel.public_url) từ $($staleTunnel.config.addr) sang $expectedAddress."

  try {
    Invoke-RestMethod -Method Delete -Uri "http://127.0.0.1:$($staleTunnel.agentPort)$($staleTunnel.uri)" | Out-Null
  } catch {
    throw "Không thể đóng tunnel cũ '$($staleTunnel.public_url)'. Đóng tunnel đó trong ngrok rồi chạy lại. Chi tiết: $($_.Exception.Message)"
  }

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    $httpsTunnels = @(Get-NgrokTunnels | Where-Object { $_.public_url -like 'https://*' })
    $matchingDomain = @($httpsTunnels | Where-Object {
      $_.public_url -eq $staleTunnel.public_url
    })
    if ($matchingDomain.Count -eq 0) {
      break
    }
    Start-Sleep -Milliseconds 250
  }

  if (@($matchingDomain).Count -gt 0) {
    throw "Ngrok chưa đóng tunnel cũ '$($staleTunnel.public_url)'; không thể chuyển tunnel sang $expectedAddress."
  }
}

if (-not $tunnel) {
  Start-Process -FilePath $ngrokPath -ArgumentList $arguments -WindowStyle Minimized | Out-Null
}

for ($attempt = 0; $attempt -lt 30 -and -not $tunnel; $attempt++) {
  $httpsTunnels = @(Get-NgrokTunnels | Where-Object { $_.public_url -like 'https://*' })
  if ($Domain) {
    $matchingDomain = @($httpsTunnels | Where-Object {
      $_.public_url -eq "https://$Domain"
    })
  } else {
    $matchingDomain = $httpsTunnels
  }
  $tunnel = $matchingDomain |
    Where-Object { $_.config.addr -eq $expectedAddress } |
    Select-Object -First 1
  if (-not $tunnel) { Start-Sleep -Milliseconds 500 }
}

if (-not $tunnel) {
  throw 'Không lấy được HTTPS URL từ ngrok. Kiểm tra ngrok auth hoặc cửa sổ ngrok.'
}

$apiUrl = $tunnel.public_url.TrimEnd('/')
Set-Content -Path $adminEnv -Value "VITE_API_BASE_URL=$apiUrl" -Encoding utf8
Set-Content -Path $mobileEnv -Value "EXPO_PUBLIC_API_URL=$apiUrl" -Encoding utf8

Write-Host "API tunnel: $apiUrl"
Write-Host 'Đã cập nhật client env. Khởi động lại dashboard/Expo để nạp URL mới.'
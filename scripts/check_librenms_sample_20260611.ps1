$ErrorActionPreference = 'Stop'

$envLines = @()
if (Test-Path .env.local) { $envLines += Get-Content .env.local }
if (Test-Path .env) { $envLines += Get-Content .env }

$kv = @{}
foreach ($line in $envLines) {
  if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
  if ($line -match '^\s*([^=]+)=(.*)$') {
    $k = $matches[1].Trim()
    $v = $matches[2].Trim().Trim('"')
    if (-not $kv.ContainsKey($k)) { $kv[$k] = $v }
  }
}

$base = $kv['LibreNMS_API_URL']
$token = $kv['LibreNMS_API_TOKEN']
$user = $kv['LibreNMS_API_USER']

if ([string]::IsNullOrWhiteSpace($base) -or [string]::IsNullOrWhiteSpace($token)) {
  throw 'LibreNMS env missing (LibreNMS_API_URL / LibreNMS_API_TOKEN).'
}

$base = $base.TrimEnd('/')
$headers = @{ 'X-Auth-Token' = $token; 'Accept' = 'application/json' }
if (-not [string]::IsNullOrWhiteSpace($user)) {
  $headers['X-Auth-User'] = $user
}

$ids = @('160', '44', '21', '224', '214')

function Build-LibreNmsUrl([string]$baseUrl, [string]$path) {
  $trimmedPath = ([string]$path).Trim().TrimStart('/')
  $u = [uri]$baseUrl
  $root = "$($u.Scheme)://$($u.Authority)"
  return "$root/api/v0/$trimmedPath"
}

foreach ($id in $ids) {
  $rxFound = $null
  $equipStatus = 'N/A'

  # Step 1: get device status
  try {
    $url = Build-LibreNmsUrl -baseUrl $base -path "devices/$id"
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 20
    $device = @($res.devices)[0]
    if ($null -ne $device) {
      $equipStatus = if ([string]$device.status -eq '1') { 'UP' } else { 'DOWN' }
      Write-Host ("device id={0} hostname={1} sysName={2} status={3}" -f $id, ($device.hostname + ''), ($device.sysName + ''), $equipStatus)
    }
  } catch {
    Write-Host ("device fetch FAIL id={0} : {1}" -f $id, $_.Exception.Message)
  }

  # Step 2: try health/device_dbm (confirmed working on this LibreNMS instance)
  try {
    $url = Build-LibreNmsUrl -baseUrl $base -path "devices/$id/health/device_dbm"
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 20
    $graphs = @($res.graphs)
    $rxSensor = $graphs | Where-Object {
      $label = ([string]($_.desc + $_.sensor_descr)).ToLowerInvariant()
      $label -match 'rx|receive|reception'
    } | Sort-Object {
      $label = ([string]($_.desc + $_.sensor_descr)).ToLowerInvariant() -replace '[^a-z0-9]',''
      $score = 0
      if ($label -match 'sfp1rx') { $score += 300 }
      elseif ($label -match 'sfp1') { $score += 150 }
      elseif ($label -match 'rxpower|receiverpower') { $score += 120 }
      elseif ($label -match 'rx') { $score += 80 }
      -$score
    } | Select-Object -First 1

    if ($rxSensor) {
      $sensorId = $rxSensor.sensor_id
      # Step 3: get actual sensor value
      try {
        $sUrl = Build-LibreNmsUrl -baseUrl $base -path "devices/$id/health/device_dbm/$sensorId"
        $sRes = Invoke-RestMethod -Uri $sUrl -Headers $headers -Method Get -TimeoutSec 20
        $sRow = @($sRes.graphs)[0]
        if ($null -ne $sRow) {
          $rxFound = $sRow.sensor_current
        }
      } catch {
        # Keep sensor_current from health list if detail fails
        $rxFound = $rxSensor.sensor_current
      }
    }
  } catch {
    # health/device_dbm not available for this device
  }

  if ($null -ne $rxFound) {
    Write-Host ("LibreNMS RX OK id={0} rx_dbm={1} equip={2}" -f $id, $rxFound, $equipStatus)
  } else {
    Write-Host ("LibreNMS id={0} : no Rx sensor found in health/device_dbm (equip={1})" -f $id, $equipStatus)
  }
}

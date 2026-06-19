$ErrorActionPreference = 'Stop'

function Convert-ServiceType([string]$value) {
  $normalized = ([string]$value).Trim().ToUpperInvariant()
  switch -Regex ($normalized) {
    'INTERCO\s*&\s*INTERNET|INTERNET\s*ET\s*INTERCO|INTERCO\s*ET\s*INTERNET|INTERNET_INTERCO' { return 'INTERNET_INTERCO' }
    '^INTERCO$' { return 'INTERCO' }
    '^LIAISON$' { return 'LIAISON' }
    default { return 'INTERNET' }
  }
}

function Convert-ClientStatus([string]$value) {
  $normalized = ([string]$value).Trim().ToUpperInvariant()
  if ($normalized -eq 'EN SERVICE') { return 'ACTIVE' }
  if ($normalized -eq 'SUSPENDU') { return 'SUSPENDED' }
  if ($normalized -eq 'INACTIF') { return 'INACTIVE' }
  return 'ACTIVE'
}

function Escape-Sql([string]$value) {
  if ($null -eq $value) { return '' }
  return $value.Replace("\\", "\\\\").Replace("'", "''")
}

$csv = @'
locality;librenms;zabbix;name;service;ip;status
Brazzaville;160;141;BEN'TSI;INTERNET;102.220.244.150;EN SERVICE
Brazzaville;44;168;OMS;INTERNET;192.168.99.12;EN SERVICE
Brazzaville;65;141;CHAIRMAN;INTERNET;102.220.244.58;EN SERVICE
Brazzaville;22;112;MFB - BZV;INTERNET et INTERCO;192.168.99.21;EN SERVICE
Brazzaville;92;141;CI-GUSTA;INTERNET;102.220.244.122;EN SERVICE
Brazzaville;60;186;ECOBANK DG;INTERNET;192.168.99.17;EN SERVICE
Brazzaville;5;157;NEW-PARLEMENT;INTERNET;102.220.244.118;EN SERVICE
Brazzaville;25;177;SNPC BZV;INTERCO & INTERNET;192.168.99.13;EN SERVICE
Brazzaville;101;213;AERCO - BZV;INTERNET;192.168.99.11;EN SERVICE
Brazzaville;53;186;ACSI - BZV;INTERCO & INTERNET;192.168.99.22;EN SERVICE
Brazzaville;51;129;Appo BZV;INTERNET;102.220.244.170;EN SERVICE
Brazzaville;46;132;UBA DG;INTERCO;192.168.99.36;EN SERVICE
Brazzaville;68;177;PNUD;INTERNET;192.168.99.23;EN SERVICE
Brazzaville;67;132;COORDINATION PNUD;INTERNET;102.220.244.226;EN SERVICE
Brazzaville;72;168;GUOT;INTERCO;192.168.99.53;EN SERVICE
Brazzaville;85;186;UNICEF BZV;INTERNET;192.168.99.26;EN SERVICE
Brazzaville;142;168;AISB;INTERNET;192.168.99.77;EN SERVICE
Brazzaville;88;141;SERFIN;INTERNET;102.220.244.242;EN SERVICE
Brazzaville;97;168;REP OMS;INTERNET;192.168.99.29;EN SERVICE
Brazzaville;98;186;UNFPA OFFICE;INTERNET;192.168.99.30;EN SERVICE
Brazzaville;109;174;PAM;INTERNET;192.168.99.35;EN SERVICE
Brazzaville;110;165;PAM-ENTREPOT;INTERNET;192.168.99.28;EN SERVICE
Brazzaville;112;25;REP-UNICEF;INTERNET;192.168.99.31;EN SERVICE
Brazzaville;236;96;PODI;INTERNET;102.220.244.102;EN SERVICE
Brazzaville;115;141;FSIE;INTERNET;102.220.244.54;EN SERVICE
Brazzaville;141;174;3C-TECH SIEGE BPC;INTERCO;192.168.99.78;EN SERVICE
Brazzaville;121;96;Résidence VIP;INTERNET;102.220.245.38;EN SERVICE
Brazzaville;229;123;SECURIPORT;INTERNET;192.168.99.38;EN SERVICE
Brazzaville;128;96;BSCA POTO POTO;INTERNET;102.220.245.17;EN SERVICE
Brazzaville;134;168;ECAIR SIEGE;INTERNET;192.168.99.42;EN SERVICE
Brazzaville;140;-;AGC-KOMBO;INTERNET;102.220.245.46;EN SERVICE
Brazzaville;157;123;UNESCO;INTERNET;192.168.99.106;EN SERVICE
Brazzaville;180;-;AIR-COTE-DIVOIRE;INTERNET;192.168.99.107;EN SERVICE
Brazzaville;219;168;MISTRAL;INTERNET;192.168.99.109;EN SERVICE
Brazzaville;208;123;SCLOG;INTERNET;192.168.99.108;EN SERVICE
Brazzaville;192;-;KEMPINSKI;INTERNET;192.168.99.24;EN SERVICE
Brazzaville;224;96;ACONOQ;INTERNET;102.220.245.186;EN SERVICE
Brazzaville;;;PATN - UMNG;INTERNET;192.168.99.100;EN SERVICE
Brazzaville;175;168;PATN - HOPITAL TALANGAI;INTERNET;10.80.10.10;EN SERVICE
Brazzaville;168;168;PATN - CHU;INTERNET;10.80.10.12;EN SERVICE
Brazzaville;167;168;PATN - MORGUE;INTERNET;10.80.10.14;EN SERVICE
Brazzaville;185;-;PATN - MAIRIE DE OUENZE;INTERNET;10.80.10.2;EN SERVICE
Brazzaville;191;-;CAFI;INTERNET;102.220.245.54;EN SERVICE
Pointe-Noire;21;186;MFB PNR;INTERCO & INTERNET;192.168.99.136;EN SERVICE
Pointe-Noire;54;141;CONGOBET POINTE NOIRE;INTERNET;102.220.246.106;EN SERVICE
Pointe-Noire;91;168;SNPC COMILOG;INTERNET;192.168.99.143;EN SERVICE
Pointe-Noire;37;195;AERCO OFFICE POINTE NOIRE;INTERNET;192.168.99.133;EN SERVICE
Pointe-Noire;94;186;ACSI POINTE NOIRE;INTERNET;192.168.99.132;EN SERVICE
Pointe-Noire;93;168;UNICEF PNR;INTERNET;192.168.99.142;EN SERVICE
Pointe-Noire;92;168;GUOT;INTERCO;192.168.99.141;EN SERVICE
Pointe-Noire;143;123;SECURIPORT;INTERNET;192.168.99.146;EN SERVICE
Pointe-Noire;135;186;AGL;INTERNET;192.168.99.150;EN SERVICE
Pointe-Noire;166;186;CORAF;INTERCO;192.168.99.157;EN SERVICE
Pointe-Noire;171;123;CCC;INTERNET;192.168.99.155;EN SERVICE
Pointe-Noire;214;165;TRIDENT;INTERNET;192.168.99.241;EN SERVICE
Pointe-Noire;181;-;AIR COTE D'IVOIRE;INTERNET;192.168.99.239;EN SERVICE
Pointe-Noire;213;-;PIC A RISE;INTERNET;192.168.99.238;EN SERVICE
Pointe-Noire;203;-;PERENCO;INTERNET;192.168.99.237;EN SERVICE
Pointe-Noire;210;-;ZES;INTERNET;192.168.99.235;EN SERVICE
Pointe-Noire;188;-;BSCA ATLANTIC;INTERCO;192.168.99.161;EN SERVICE
Pointe-Noire;189;-;BSCA PLAGE;INTERCO;192.168.99.240;EN SERVICE
Pointe-Noire;228;-;ARCHER CAPITAL;INTERNET;192.168.99.244;EN SERVICE
'@

$rows = $csv | ConvertFrom-Csv -Delimiter ';'

# Input-level warnings
$duplicateIps = $rows | Group-Object ip | Where-Object { $_.Count -gt 1 }
$duplicateNames = $rows | Group-Object name | Where-Object { $_.Count -gt 1 }
$duplicateZabbix = $rows | Where-Object { $_.zabbix -and $_.zabbix.Trim() -ne '-' } | Group-Object zabbix | Where-Object { $_.Count -gt 1 }

Write-Host "Total lignes input: $($rows.Count)"
if ($duplicateIps.Count -gt 0) {
  Write-Warning "IPs dupliquees dans l'input: $($duplicateIps.Name -join ', ')"
}
if ($duplicateNames.Count -gt 0) {
  Write-Warning "Noms dupliques dans l'input: $($duplicateNames.Name -join ', ')"
}
if ($duplicateZabbix.Count -gt 0) {
  Write-Warning "IDs Zabbix dupliques dans l'input (possibles elements partages): $($duplicateZabbix.Name -join ', ')"
}

$today = Get-Date -Format 'yyyyMMdd'
$seq = 1

$sql = New-Object System.Text.StringBuilder
[void]$sql.AppendLine('SET NAMES utf8mb4;')
[void]$sql.AppendLine('USE noc_activity;')
[void]$sql.AppendLine("SET @col_locality := (SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='noc_clients' AND COLUMN_NAME='locality' LIMIT 1);")
[void]$sql.AppendLine("SET @sql_add_locality := IF(@col_locality IS NULL, 'ALTER TABLE noc_clients ADD COLUMN locality VARCHAR(120) NULL AFTER address', 'SELECT 1');")
[void]$sql.AppendLine('PREPARE stmt FROM @sql_add_locality; EXECUTE stmt; DEALLOCATE PREPARE stmt;')
[void]$sql.AppendLine("SET @col_libid := (SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='noc_clients' AND COLUMN_NAME='librenms_device_id' LIMIT 1);")
[void]$sql.AppendLine("SET @sql_add_libid := IF(@col_libid IS NULL, 'ALTER TABLE noc_clients ADD COLUMN librenms_device_id VARCHAR(64) NULL AFTER hostid_zabbix', 'SELECT 1');")
[void]$sql.AppendLine('PREPARE stmt FROM @sql_add_libid; EXECUTE stmt; DEALLOCATE PREPARE stmt;')
[void]$sql.AppendLine("SET @col_libname := (SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='noc_clients' AND COLUMN_NAME='librenms_sysname' LIMIT 1);")
[void]$sql.AppendLine("SET @sql_add_libname := IF(@col_libname IS NULL, 'ALTER TABLE noc_clients ADD COLUMN librenms_sysname VARCHAR(255) NULL AFTER librenms_device_id', 'SELECT 1');")
[void]$sql.AppendLine('PREPARE stmt FROM @sql_add_libname; EXECUTE stmt; DEALLOCATE PREPARE stmt;')

# Repair mapping_zabbix schema to match application behavior
[void]$sql.AppendLine("SET @fk_users := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='mapping_zabbix' AND REFERENCED_TABLE_NAME='users' LIMIT 1);")
[void]$sql.AppendLine("SET @sql_drop_fk_users := IF(@fk_users IS NULL, 'SELECT 1', CONCAT('ALTER TABLE mapping_zabbix DROP FOREIGN KEY `', @fk_users, '`'));")
[void]$sql.AppendLine('PREPARE stmt FROM @sql_drop_fk_users; EXECUTE stmt; DEALLOCATE PREPARE stmt;')
[void]$sql.AppendLine("SET @uk_host := (SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='mapping_zabbix' AND INDEX_NAME='uk_mapping_zabbix_host' LIMIT 1);")
[void]$sql.AppendLine("SET @sql_drop_uk_host := IF(@uk_host IS NULL, 'SELECT 1', 'ALTER TABLE mapping_zabbix DROP INDEX uk_mapping_zabbix_host');")
[void]$sql.AppendLine('PREPARE stmt FROM @sql_drop_uk_host; EXECUTE stmt; DEALLOCATE PREPARE stmt;')
[void]$sql.AppendLine("SET @fk_noc := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='noc_activity' AND TABLE_NAME='mapping_zabbix' AND REFERENCED_TABLE_NAME='noc_clients' LIMIT 1);")
[void]$sql.AppendLine("SET @sql_add_fk_noc := IF(@fk_noc IS NULL, 'ALTER TABLE mapping_zabbix ADD CONSTRAINT fk_mapping_zabbix_noc_clients FOREIGN KEY (id_client) REFERENCES noc_clients(client_ref) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');")
[void]$sql.AppendLine('PREPARE stmt FROM @sql_add_fk_noc; EXECUTE stmt; DEALLOCATE PREPARE stmt;')

foreach ($r in $rows) {
  $locality = Escape-Sql ([string]$r.locality).Trim()
  $name = Escape-Sql ([string]$r.name).Trim()
  $ip = Escape-Sql ([string]$r.ip).Trim()
  $serviceType = Convert-ServiceType $r.service
  $clientStatus = Convert-ClientStatus $r.status

  $zabbixRaw = ([string]$r.zabbix).Trim()
  $zabbix = if ([string]::IsNullOrWhiteSpace($zabbixRaw) -or $zabbixRaw -eq '-') { $null } else { Escape-Sql $zabbixRaw }

  $libRaw = ([string]$r.librenms).Trim()
  $librenms = if ([string]::IsNullOrWhiteSpace($libRaw) -or $libRaw -eq '-') { $null } else { Escape-Sql $libRaw }

  $generatedRef = ('CLISC_IMPORT_{0}_{1:0000}' -f $today, $seq)
  $seq += 1

  $zabbixSql = if ($null -eq $zabbix) { 'NULL' } else { "'$zabbix'" }
  $libSql = if ($null -eq $librenms) { 'NULL' } else { "'$librenms'" }

  [void]$sql.AppendLine(@"
INSERT INTO noc_clients
  (client_ref, client_name, address, locality, country, ip_client, hostid_zabbix, librenms_device_id, service_type, status, sla_target_percent)
VALUES
  ('$generatedRef', '$name', NULL, '$locality', 'République du Congo', '$ip', $zabbixSql, $libSql, '$serviceType', '$clientStatus', 99.90)
ON DUPLICATE KEY UPDATE
  client_name = VALUES(client_name),
  locality = VALUES(locality),
  country = VALUES(country),
  hostid_zabbix = VALUES(hostid_zabbix),
  librenms_device_id = VALUES(librenms_device_id),
  service_type = VALUES(service_type),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
SET @client_ref := (SELECT client_ref FROM noc_clients WHERE ip_client = '$ip' LIMIT 1);
"@)

  if ($null -eq $zabbix) {
    [void]$sql.AppendLine("DELETE FROM mapping_zabbix WHERE id_client = @client_ref;")
  } else {
    [void]$sql.AppendLine(@"
INSERT INTO mapping_zabbix (id_client, hostid_zabbix, ip_client, nom_host, sync_status)
VALUES (@client_ref, '$zabbix', '$ip', '$name', 'SYNCED')
ON DUPLICATE KEY UPDATE
  hostid_zabbix = VALUES(hostid_zabbix),
  ip_client = VALUES(ip_client),
  nom_host = VALUES(nom_host),
  sync_status = 'SYNCED',
  updated_at = CURRENT_TIMESTAMP;
"@)
  }
}

$sqlPath = Join-Path $PSScriptRoot 'import_clients_librenms_zabbix_20260611.sql'
[System.IO.File]::WriteAllText($sqlPath, $sql.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Host "SQL genere: $sqlPath"
$sqlContent = Get-Content -Raw -Path $sqlPath
$sqlContent | & mysql -uroot --default-character-set=utf8mb4 noc_activity
if ($LASTEXITCODE -ne 0) {
  throw "Execution SQL echouee"
}

$ipList = (($rows | ForEach-Object { "'" + (Escape-Sql $_.ip.Trim()) + "'" }) -join ',')

# Optional enrichment: for rows without Zabbix and/or missing LibreNMS device id,
# try to resolve LibreNMS by client IP so no client is left without LibreNMS linkage.
$envLines = @()
if (Test-Path .env.local) { $envLines += Get-Content .env.local }
if (Test-Path .env) { $envLines += Get-Content .env }

$envKv = @{}
foreach ($line in $envLines) {
  if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
  if ($line -match '^\s*([^=]+)=(.*)$') {
    $k = $matches[1].Trim()
    $v = $matches[2].Trim().Trim('"')
    if (-not $envKv.ContainsKey($k)) { $envKv[$k] = $v }
  }
}

$libBase = $envKv['LIBRENMS_API_URL']
if (-not $libBase) { $libBase = $envKv['LibreNMS_API_URL'] }
$libToken = $envKv['LIBRENMS_API_TOKEN']
if (-not $libToken) { $libToken = $envKv['LibreNMS_API_TOKEN'] }
$libUser = $envKv['LIBRENMS_API_USER']
if (-not $libUser) { $libUser = $envKv['LibreNMS_API_USER'] }

if (-not [string]::IsNullOrWhiteSpace($libBase) -and -not [string]::IsNullOrWhiteSpace($libToken)) {
  try {
    $u = [uri]$libBase
    $root = "$($u.Scheme)://$($u.Authority)"
    $headers = @{ 'X-Auth-Token' = $libToken; 'Accept' = 'application/json' }
    if (-not [string]::IsNullOrWhiteSpace($libUser)) { $headers['X-Auth-User'] = $libUser }

    $missingIps = & mysql -N -uroot -e "USE noc_activity; SELECT ip_client FROM noc_clients WHERE ip_client IN ($ipList) AND (librenms_device_id IS NULL OR TRIM(librenms_device_id)='') AND ip_client IS NOT NULL AND TRIM(ip_client)<>'';"

    $resolvedCount = 0
    foreach ($ipRaw in $missingIps) {
      $ip = ([string]$ipRaw).Trim()
      if ([string]::IsNullOrWhiteSpace($ip)) { continue }

      try {
        $lookupUrl = "$root/api/v0/devices?type=ipv4&query=$([uri]::EscapeDataString($ip))"
        $resp = Invoke-RestMethod -Uri $lookupUrl -Headers $headers -Method Get -TimeoutSec 25
        $devices = @($resp.devices)
        if ($devices.Count -eq 0) { continue }

        $exact = $devices | Where-Object {
          (([string]$_.ip).Trim() -eq $ip) -or (([string]$_.hostname).Trim() -eq $ip)
        } | Select-Object -First 1

        $picked = if ($null -ne $exact) { $exact } else { $devices | Select-Object -First 1 }
        if ($null -eq $picked -or $null -eq $picked.device_id) { continue }

        $deviceId = Escape-Sql ([string]$picked.device_id)
        $sysName = Escape-Sql ([string]$picked.sysName)
        $escapedIp = Escape-Sql $ip

        & mysql -uroot -e "USE noc_activity; UPDATE noc_clients SET librenms_device_id='$deviceId', librenms_sysname=IFNULL(NULLIF('$sysName',''), librenms_sysname), updated_at=CURRENT_TIMESTAMP WHERE ip_client='$escapedIp' AND (librenms_device_id IS NULL OR TRIM(librenms_device_id)='');"
        if ($LASTEXITCODE -eq 0) { $resolvedCount += 1 }
      } catch {
        Write-Warning "Lookup LibreNMS impossible pour IP=$ip : $($_.Exception.Message)"
      }
    }

    Write-Host "Enrichissement LibreNMS termine. Resolus par IP: $resolvedCount"
  } catch {
    Write-Warning "Enrichissement LibreNMS ignore (config/API indisponible): $($_.Exception.Message)"
  }
} else {
  Write-Warning 'Enrichissement LibreNMS ignore: variables API non configurees.'
}

Write-Host "Import termine. Verification..."
& mysql -uroot -e "USE noc_activity; SELECT COUNT(*) AS imported_scope FROM noc_clients WHERE ip_client IN ($ipList); SELECT COUNT(*) AS mapping_scope FROM mapping_zabbix WHERE ip_client IN ($ipList); SELECT COUNT(*) AS missing_librenms_scope FROM noc_clients WHERE ip_client IN ($ipList) AND (librenms_device_id IS NULL OR TRIM(librenms_device_id)=''); SELECT locality, COUNT(*) AS cnt FROM noc_clients WHERE ip_client IN ($ipList) GROUP BY locality ORDER BY locality; SELECT client_name, ip_client, librenms_device_id, hostid_zabbix, service_type, status FROM noc_clients WHERE ip_client IN ($ipList) ORDER BY locality, client_name LIMIT 200;"

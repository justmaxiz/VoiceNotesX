$ErrorActionPreference = 'Stop'
$serverRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $serverRoot '.env'

if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath (Join-Path $serverRoot '.env.example') -Destination $envPath
}

$values = @{}
$lines = @(Get-Content -LiteralPath $envPath)
foreach ($line in $lines) {
    if ($line -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        $values[$Matches[1]] = $Matches[2]
    }
}

function New-LocalPassword {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

$additions = [System.Collections.Generic.List[string]]::new()
foreach ($key in @('POSTGRES_ADMIN_PASSWORD', 'APP_DB_PASSWORD', 'MIGRATION_DB_PASSWORD', 'JWT_SECRET')) {
    if (-not $values.ContainsKey($key)) {
        $values[$key] = New-LocalPassword
        $additions.Add("$key=$($values[$key])")
    } elseif ([string]::IsNullOrWhiteSpace($values[$key])) {
        throw "$key is empty. Set a local password before continuing."
    }
}

$defaults = [ordered]@{
    DATABASE_URL = 'postgresql://voicenotes_app:' + [Uri]::EscapeDataString($values['APP_DB_PASSWORD']) + '@127.0.0.1:5433/voicenotes_dev'
    MIGRATION_DATABASE_URL = 'postgresql://voicenotes_migrator:' + [Uri]::EscapeDataString($values['MIGRATION_DB_PASSWORD']) + '@127.0.0.1:5433/voicenotes_dev'
    AUDIO_STORAGE_PATH = '.local/audio'
}

foreach ($key in $defaults.Keys) {
    if (-not $values.ContainsKey($key)) { $additions.Add("$key=$($defaults[$key])") }
}

if ($additions.Count -gt 0) {
    $content = ($lines + @('') + $additions.ToArray()) -join [Environment]::NewLine
    [IO.File]::WriteAllText($envPath, $content + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}

Write-Output 'Local data configuration is ready in server/.env. Existing values were preserved.'

# Script to upload .env vars to Railway tki-social-api service
# Run from project root after: railway link --project ... --service tki-social-api

$schemaKeys = @(
    'AZURE_API_AUDIENCE', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID',
    'BINDER_API_URL', 'BINDER_INTERNAL_SECRET',
    'GMAIL_IMPERSONATED_USER', 'GMAIL_FROM_EMAIL', 'GMAIL_FROM_NAME', 'GMAIL_SERVICE_ACCOUNT_JSON_BASE64', 'GMAIL_SERVICE_ACCOUNT_FILE',
    'INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET',
    'LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET',
    'LOG_LEVEL',
    'META_APP_ID', 'META_APP_SECRET', 'META_PAGE_ACCESS_TOKEN', 'META_PAGE_ID', 'META_VERIFY_TOKEN',
    'METRICOOL_API_TOKEN', 'METRICOOL_BLOG_ID', 'METRICOOL_TEAM_ID', 'METRICOOL_USER_ID',
    'MONGODB_TKIBINDER_URI', 'MONGODB_TKIPORTAL_URI', 'MONGODB_TKISOCIAL_URI',
    'N8N_INTERNAL_SECRET', 'N8N_TONKA_DISPATCH_WEBHOOK_URL',
    'NODE_ENV',
    'THREADS_ACCESS_TOKEN', 'THREADS_CLIENT_ID', 'THREADS_CLIENT_SECRET',
    'TIKTOK_BUSINESS_ACCESS_TOKEN', 'TIKTOK_BUSINESS_CLIENT_ID', 'TIKTOK_BUSINESS_CLIENT_SECRET',
    'TIKTOK_PERSONAL_ACCESS_TOKEN', 'TIKTOK_PERSONAL_CLIENT_ID', 'TIKTOK_PERSONAL_CLIENT_SECRET',
    'TONKA_SPARK_RECIPIENTS', 'TONKA_SPARK_SEND_EMAIL',
    'X_ACCESS_TOKEN', 'X_CLIENT_ID', 'X_CLIENT_SECRET',
    'YOUTUBE_ACCESS_TOKEN', 'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'
)

# Parse .env file
$envFile = Join-Path $PSScriptRoot "..\\.env"
$h = @{}
foreach ($line in (Get-Content $envFile)) {
    if ($line -notmatch "^#" -and $line -match "^([^=]+)=(.*)$") {
        $k = $Matches[1].Trim()
        $v = $Matches[2].Trim()
        if (-not $h.ContainsKey($k)) { $h[$k] = $v }
    }
}

Write-Host "Parsed $($h.Count) keys from .env"
Write-Host ""

$success = 0
$skipped = 0
$failed = 0

foreach ($key in $schemaKeys) {
    if ($h.ContainsKey($key) -and $h[$key] -ne '') {
        Write-Host -NoNewline "Setting $key ... "
        try {
            $output = railway variable set "$key=$($h[$key])" --skip-deploys 2>&1
            Write-Host "OK"
            $success++
        } catch {
            Write-Host "FAILED: $_"
            $failed++
        }
    } else {
        Write-Host "SKIP $key (not in .env)"
        $skipped++
    }
}

Write-Host ""
Write-Host "Done: $success set, $skipped skipped, $failed failed"
Write-Host ""
Write-Host "Triggering deploy with updated vars..."
railway redeploy --yes 2>&1

# Prepares a Windows runner to Authenticode-sign the release with Azure
# Artifact Signing — Pliu AB's identity, Microsoft's HSM. The same account and
# profile sign every Pliu AB release.
#
# Run once per job, before `tauri build`. It:
#   1. refuses to go on when a credential or a name is missing, so a release
#      can never quietly ship unsigned (the same shape as the updater key guard);
#   2. fetches Microsoft's signing client (the signtool "dlib"), pinned by
#      version and verified by SHA-256;
#   3. finds an x64 signtool.exe in the Windows SDK;
#   4. writes the dlib's metadata.json and a Tauri config overlay whose
#      bundle.windows.signCommand runs sign.ps1 on each file Tauri signs.
#
# The overlay is generated, never committed: a committed tauri.windows.conf.json
# would make every developer's local Windows build try to sign and fail.
#
# Inputs (environment):
#   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET — the app registration
#     that signs releases; read by the dlib through EnvironmentCredential
#   AZURE_SIGNING_ENDPOINT — the account's regional endpoint (North Europe:
#     https://neu.codesigning.azure.net); a mismatch reads as 403 Forbidden
#   AZURE_SIGNING_ACCOUNT, AZURE_SIGNING_PROFILE — the account and the
#     Public Trust certificate profile
#
# Outputs: GITHUB_ENV gets BRINDOLA_SIGNTOOL, BRINDOLA_SIGN_DLIB and
# BRINDOLA_SIGN_METADATA (what sign.ps1 reads); GITHUB_OUTPUT gets `args`,
# the `--config <overlay>` to append to `tauri build`.
#
# Bumping the client is deliberate work: change $ClientVersion, download the
# .nupkg from nuget.org, `sha256sum` it, paste the hash below.

$ErrorActionPreference = 'Stop'

$ClientPackage = 'microsoft.artifactsigning.client'
$ClientVersion = '1.0.146'
$ClientSha256  = '7761e5d8f31e54b764da21d33cd8b0a2940e1b05526c7dfcb5e94b0431426f70'

# --------------- 1. Guard ---------------

$missing = @(
  'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET',
  'AZURE_SIGNING_ENDPOINT', 'AZURE_SIGNING_ACCOUNT', 'AZURE_SIGNING_PROFILE'
) | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
if ($missing) {
  Write-Host "::error::Windows code signing is not configured — missing: $($missing -join ', '). Secrets and variables are listed in .github/workflows/release.yml."
  exit 1
}

# The dlib is a .NET 8 assembly (rollForward Major, so 8 or later will do).
$runtimes = & dotnet --list-runtimes 2>$null
if (-not ($runtimes | Select-String -Pattern '^Microsoft\.NETCore\.App ([89]|\d{2,})\.')) {
  Write-Host "::error::The Artifact Signing dlib needs the .NET 8 runtime or later; dotnet --list-runtimes found none"
  exit 1
}

# --------------- 2. The signing client ---------------

$root = Join-Path $env:RUNNER_TEMP 'artifact-signing'
New-Item -ItemType Directory -Force -Path $root | Out-Null
$nupkg = Join-Path $root "$ClientPackage.$ClientVersion.nupkg"
$url = "https://api.nuget.org/v3-flatcontainer/$ClientPackage/$ClientVersion/$ClientPackage.$ClientVersion.nupkg"
Invoke-WebRequest -Uri $url -OutFile $nupkg -UseBasicParsing
$actual = (Get-FileHash -Algorithm SHA256 -Path $nupkg).Hash.ToLowerInvariant()
if ($actual -ne $ClientSha256) {
  Write-Host "::error::$ClientPackage $ClientVersion checksum mismatch: expected $ClientSha256, got $actual"
  exit 1
}
$client = Join-Path $root 'client'
Expand-Archive -Path $nupkg -DestinationPath $client -Force
$dlib = Join-Path $client 'bin\x64\Azure.CodeSigning.Dlib.dll'
if (-not (Test-Path $dlib)) {
  Write-Host "::error::$dlib is not in the package — has the layout changed?"
  exit 1
}

# --------------- 3. signtool (x64, to match the dlib) ---------------

$kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
$signtool = Get-ChildItem -Path $kits -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Directory.Name -eq 'x64' -and $_.Directory.Parent.Name -match '^\d+(\.\d+)+$' } |
  Sort-Object { [version]$_.Directory.Parent.Name } -Descending |
  Select-Object -First 1
if (-not $signtool) {
  Write-Host "::error::No x64 signtool.exe under $kits — the runner image has no Windows SDK"
  exit 1
}

# --------------- 4. metadata.json + the Tauri overlay ---------------

# Only EnvironmentCredential may answer: with every other credential in the
# chain excluded, a missing secret fails as "authentication failed" instead of
# timing out against a managed identity the runner does not have.
$metadata = Join-Path $root 'metadata.json'
[ordered]@{
  Endpoint               = $env:AZURE_SIGNING_ENDPOINT
  CodeSigningAccountName = $env:AZURE_SIGNING_ACCOUNT
  CertificateProfileName = $env:AZURE_SIGNING_PROFILE
  CorrelationId          = "github-$env:GITHUB_RUN_ID"
  ExcludeCredentials     = @(
    'ManagedIdentityCredential', 'WorkloadIdentityCredential', 'SharedTokenCacheCredential',
    'VisualStudioCredential', 'VisualStudioCodeCredential', 'AzureCliCredential',
    'AzurePowerShellCredential', 'AzureDeveloperCliCredential', 'InteractiveBrowserCredential'
  )
} | ConvertTo-Json | Set-Content -Path $metadata -Encoding utf8

$signScript = Join-Path $PSScriptRoot 'sign.ps1'
$overlay = Join-Path $root 'tauri.signing.conf.json'
@{
  bundle = @{
    windows = @{
      signCommand = @{
        cmd  = 'pwsh'
        args = @('-NoProfile', '-NonInteractive', '-File', $signScript, '%1')
      }
    }
  }
} | ConvertTo-Json -Depth 6 | Set-Content -Path $overlay -Encoding utf8

"BRINDOLA_SIGNTOOL=$($signtool.FullName)" >> $env:GITHUB_ENV
"BRINDOLA_SIGN_DLIB=$dlib" >> $env:GITHUB_ENV
"BRINDOLA_SIGN_METADATA=$metadata" >> $env:GITHUB_ENV
# Forward slashes: the path may be spliced into a bash command line, where a
# backslash is an escape. Windows and Tauri read either.
"args=--config $($overlay -replace '\\', '/')" >> $env:GITHUB_OUTPUT

Write-Host "Signing prepared: $ClientPackage $ClientVersion, $($signtool.FullName)"
Write-Host "Account $env:AZURE_SIGNING_ACCOUNT / profile $env:AZURE_SIGNING_PROFILE at $env:AZURE_SIGNING_ENDPOINT"

# Signs one file with Azure Artifact Signing and proves it took.
#
# Tauri calls this once per file it signs — the app's .exe, the WiX DLLs, the
# MSI — through the signCommand prepare.ps1 writes, with the path as the only
# argument. It runs BEFORE Tauri writes the updater's .sig and latest.json, so
# the minisign signature covers the Authenticode-signed bytes; signing after
# `tauri build` would break every update.
#
#   pwsh -File scripts/windows-signing/sign.ps1 <file>
#
# Reads BRINDOLA_SIGNTOOL, BRINDOLA_SIGN_DLIB and BRINDOLA_SIGN_METADATA (set
# by prepare.ps1) and the AZURE_* credentials the dlib picks up itself.
#
# A non-zero exit fails `tauri build`, so a file that is unsigned, untimestamped
# or signed by anyone but Pliu AB never reaches a release.

param([Parameter(Mandatory)][string]$Path)

$ErrorActionPreference = 'Stop'
$ExpectedPublisher = 'Pliu AB'

foreach ($name in 'BRINDOLA_SIGNTOOL', 'BRINDOLA_SIGN_DLIB', 'BRINDOLA_SIGN_METADATA') {
  if (-not [Environment]::GetEnvironmentVariable($name)) {
    Write-Host "::error::$name is not set — run scripts/windows-signing/prepare.ps1 first"
    exit 1
  }
}

# The certificate lives three days: without the RFC 3161
# timestamp the signature would die with it.
& $env:BRINDOLA_SIGNTOOL sign /v /fd SHA256 `
  /tr 'http://timestamp.acs.microsoft.com' /td SHA256 `
  /dlib $env:BRINDOLA_SIGN_DLIB /dmdf $env:BRINDOLA_SIGN_METADATA `
  $Path
if ($LASTEXITCODE -ne 0) {
  Write-Host "::error::signtool failed ($LASTEXITCODE) on $Path"
  exit 1
}

$sig = Get-AuthenticodeSignature -FilePath $Path
$subject = $sig.SignerCertificate.Subject
if ($sig.Status -ne 'Valid') {
  Write-Host "::error::$Path signature is $($sig.Status): $($sig.StatusMessage)"
  exit 1
}
if ($subject -notmatch "(^|, )CN=$([regex]::Escape($ExpectedPublisher))(,|$)") {
  Write-Host "::error::$Path is signed by '$subject', not $ExpectedPublisher"
  exit 1
}
if (-not $sig.TimeStamperCertificate) {
  Write-Host "::error::$Path carries no timestamp"
  exit 1
}

Write-Host "Signed $Path — $subject"

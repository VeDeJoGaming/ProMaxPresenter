param([ValidateSet('Get','Save')][string]$Action='Get')
$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
function Git-Step {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    $result = & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Git kunne ikke fullfoere: $($Arguments[0]). Arbeidet ditt er beholdt lokalt." }
    return $result
}
$branch=(Git-Step @('branch','--show-current')).Trim()
if ($branch -ne 'work/pc-laptop') { throw 'Bytt til work/pc-laptop i Codex foer du synkroniserer.' }
Git-Step @('fetch','origin','work/pc-laptop') | Out-Host
if ($Action -eq 'Save') {
    # Only already tracked files. New files must first be reviewed/staged in Codex.
    Git-Step @('add','--update') | Out-Host
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 1) {
        Git-Step @('commit','-m',('Lagre arbeid fra '+$env:COMPUTERNAME+' '+(Get-Date -Format 'yyyy-MM-dd HH:mm'))) | Out-Host
    } elseif ($LASTEXITCODE -ne 0) { throw 'Kunne ikke kontrollere endringene.' }
}
$dirty=Git-Step @('status','--porcelain')
if ($dirty) { throw 'Lokale eller nye filer maa gjennomgaas i Codex foer henting. Ingen filer er overskrevet.' }
Git-Step @('merge','--ff-only','origin/work/pc-laptop') | Out-Host
if ($Action -eq 'Save') { Git-Step @('push','origin','HEAD:refs/heads/work/pc-laptop') | Out-Host }
$local=(Git-Step @('rev-parse','HEAD')).Trim()
$remote=(Git-Step @('ls-remote','origin','refs/heads/work/pc-laptop')) -split '\s+'
if ($remote[0] -ne $local) { throw 'Lokal og ekstern versjon er forskjellige. Be Codex forene arbeidet.' }
Write-Host 'Prosjektet er synkronisert med GitHub.' -ForegroundColor Green

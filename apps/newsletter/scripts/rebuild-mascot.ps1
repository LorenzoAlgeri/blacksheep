# rebuild-mascot.ps1 — Re-bake bloom + re-encode animated WebP in un colpo solo.
#
# Usage (dalla root del repo blacksheep):
#   .\apps\newsletter\scripts\rebuild-mascot.ps1
#   .\apps\newsletter\scripts\rebuild-mascot.ps1 -Threshold 2.55 -Amp 14 -Blur 2.5
#
# Param tunabili:
#   -Threshold   (default 2.60) — soglia luminance: alto = più stretto (solo bianchi puri)
#                                                    basso = più permissivo (rischio: maglia)
#   -Amp         (default 12)   — intensità highlight (4-15)
#   -Blur        (default 2.0)  — diametro shine (1.0-3.5)
#   -SrcDir                     — cartella PNG source originali (default: %TEMP%\mascot-src-png\FRAMEVIDEO)
#   -BakedDir                   — cartella temp per i PNG con bloom (default: %TEMP%\mascot-baked-strict-png)
#   -Width  (default 960)       — larghezza output webp
#   -Height (default 540)       — altezza output webp
#   -Quality (default 88)       — qualità webp (1-100)

[CmdletBinding()]
param(
    [double]$Threshold = 2.60,
    [int]$Amp = 12,
    [double]$Blur = 2.0,
    [string]$SrcDir = "$env:TEMP\mascot-src-png\FRAMEVIDEO",
    [string]$BakedDir = "$env:TEMP\mascot-baked-strict-png",
    [int]$Width = 960,
    [int]$Height = 540,
    [int]$Quality = 88
)

$ErrorActionPreference = 'Stop'
$repoRoot = (git rev-parse --show-toplevel) 2>$null
if (-not $repoRoot) { $repoRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent | Split-Path -Parent }
$webpOut = Join-Path $repoRoot "apps\newsletter\public\intro-mascot.webp"

Write-Host "==> Bake bloom (threshold=$Threshold blur=$Blur amp=$Amp)" -ForegroundColor Cyan
node "$repoRoot\apps\newsletter\scripts\bake-bloom.mjs" `
    "$SrcDir" "$BakedDir" `
    --threshold $Threshold --blur $Blur --amp $Amp `
    --srcOffset 0 --count 101
if ($LASTEXITCODE -ne 0) { throw "bake-bloom.mjs failed" }

Write-Host "`n==> Encode animated WebP (${Width}x${Height} q=$Quality 60fps interp)" -ForegroundColor Cyan
$scaleFilter = "scale=${Width}:${Height}:flags=lanczos,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1"
& ffmpeg -y -framerate 30 `
    -i "$BakedDir\m%03d.png" `
    -vf $scaleFilter `
    -vframes 202 -loop 1 `
    -vcodec libwebp_anim -lossless 0 -qscale $Quality -compression_level 6 -preset picture `
    "$webpOut"
if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed" }

$size = [Math]::Round((Get-Item $webpOut).Length / 1MB, 2)
Write-Host "`n==> Done. intro-mascot.webp = ${size} MB" -ForegroundColor Green
Write-Host "Hard reload Ctrl+Shift+R nel browser per vedere il risultato."

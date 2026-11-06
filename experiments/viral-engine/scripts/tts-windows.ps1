# Narração LOCAL com a síntese de voz do Windows (WinRT, vozes OneCore), sem
# serviço pago nem rede. Grava o WAV e os tempos de cada palavra informados
# pelo próprio sintetizador (cues de limite de palavra: início + duração).
#
#   powershell -File scripts/tts-windows.ps1 -TextFile roteiro.txt -Out saida/narracao [-Voice Daniel] [-Rate 1.15] [-Pitch 1.0]
#
# Saídas: <Out>.wav e <Out>.words.json ({ source: "local-tts", words: [{ text, start, end }] }).
param(
  [Parameter(Mandatory = $true)][string]$TextFile,
  [Parameter(Mandatory = $true)][string]$Out,
  [string]$Voice = "Daniel",
  [double]$Rate = 1.15,
  [double]$Pitch = 1.0
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
  })[0]
function Await($op, [Type]$type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait() | Out-Null
  $t.Result
}

$text = [System.IO.File]::ReadAllText((Resolve-Path $TextFile), [System.Text.Encoding]::UTF8).Trim()
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -eq "pt-BR" -and $_.DisplayName -like "*$Voice*" } | Select-Object -First 1
if (-not $v) { throw "Voz pt-BR '$Voice' não encontrada." }
$synth.Voice = $v
$synth.Options.IncludeWordBoundaryMetadata = $true
$synth.Options.SpeakingRate = $Rate
$synth.Options.AudioPitch = $Pitch

$stream = Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])

# Áudio
$size = [uint32]$stream.Size
$reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
$null = Await ($reader.LoadAsync($size)) ([uint32])
$bytes = New-Object byte[] $size
$reader.ReadBytes($bytes)
[System.IO.File]::WriteAllBytes("$Out.wav", $bytes)

# Palavras
$words = @()
foreach ($track in $stream.TimedMetadataTracks) {
  if ($track.Id -ne "SpeechWord") { continue }
  foreach ($cue in $track.Cues) {
    $words += [ordered]@{
      text  = $cue.Text
      start = [math]::Round($cue.StartTime.TotalSeconds, 3)
      end   = [math]::Round(($cue.StartTime + $cue.Duration).TotalSeconds, 3)
    }
  }
}
$json = [ordered]@{ source = "local-tts"; voice = $v.DisplayName; rate = $Rate; words = $words } | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText("$Out.words.json", $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "$($v.DisplayName): $($words.Count) palavras -> $Out.wav"

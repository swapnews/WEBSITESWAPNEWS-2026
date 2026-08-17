param([string]$InputFile, [string]$OutputFile, [int]$BatchSize = 20)
$ErrorActionPreference = "Continue"
$urls = Get-Content $InputFile | Where-Object { $_.Trim() -ne '' }
$total = $urls.Count

$results = New-Object System.Collections.Generic.List[string]
$pending = New-Object 'System.Collections.Generic.List[object]'

foreach ($url in $urls) {
    $captured = $url
    $task = [System.Threading.Tasks.Task[string]]::Factory.StartNew([Func[string]]{
        $u = $captured
        try {
            $handler = New-Object System.Net.Http.HttpClientHandler
            $handler.AllowAutoRedirect = $true
            $cl = New-Object System.Net.Http.HttpClient $handler
            $cl.Timeout = [TimeSpan]::FromSeconds(30)
            $body = $cl.GetStringAsync($u).Result
            $cl.Dispose()
            $m = [regex]::Match($body, '<meta[^>]*property="og:image"[^>]*content="([^"]+)"')
            $img = $m.Groups[1].Value
            if ($img -eq '') { return "NO_OG`t$u" }
            elseif ($img -match 'data:') { return "DATAURI`t$u" }
            elseif (-not $img.StartsWith('https://')) { return "INVALID`t$u`t$img" }
            else { return "OK`t$u`t$img" }
        } catch {
            $msg = $_.Exception.Message
            if ($_.Exception.InnerException) { $msg = $_.Exception.InnerException.Message }
            return "ERROR`t$u`t$msg"
        }
    }.GetNewClosure())
    $pending.Add($task)
    if ($pending.Count -ge $BatchSize) {
        foreach ($t in $pending) { $results.Add($t.Result) }
        $pending.Clear()
        Write-Host "PROGRESS: $($results.Count)/$total"
    }
}
foreach ($t in $pending) { $results.Add($t.Result) }
$results | Set-Content $OutputFile -Encoding utf8
Write-Host "DONE: $($results.Count)"
$ok = @($results | Where-Object { $_ -like "OK*" })
$err = @($results | Where-Object { $_ -like "ERROR*" })
$noo = @($results | Where-Object { $_ -like "NO_OG*" })
$dur = @($results | Where-Object { $_ -like "DATAURI*" })
$inv = @($results | Where-Object { $_ -like "INVALID*" })
Write-Host "OK: $($ok.Count) | ERROR: $($err.Count) | NO_OG: $($noo.Count) | DATAURI: $($dur.Count) | INVALID: $($inv.Count)"

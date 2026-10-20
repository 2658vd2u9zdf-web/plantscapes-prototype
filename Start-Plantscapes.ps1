param(
    [switch]$EnableAI,
    [ValidateRange(1024,65535)][int]$Port = 4182
)
$nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (-not $nodeExecutable) {
    $bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (Test-Path -LiteralPath $bundledNode -PathType Leaf) { $nodeExecutable = $bundledNode }
}
if (-not $nodeExecutable) {
    throw 'Node.js could not be found. Install Node.js LTS, reopen PowerShell, and try again. No API key has been requested.'
}
$previousKey = $env:OPENAI_API_KEY
$previousEnable = $env:PLANTSCAPES_AI_ENABLED
$previousPort = $env:PORT
$previousBudget = $env:PLANTSCAPES_AI_BUDGET_USD
try {
    $env:PORT = [string]$Port
    $env:PLANTSCAPES_AI_BUDGET_USD = '3'
    $env:PLANTSCAPES_AI_ENABLED = '0'
    if ($EnableAI) {
        if (-not $env:OPENAI_API_KEY) {
            $secureKey = Read-Host 'OpenAI API key (hidden; stored only in this process)' -AsSecureString
            $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
            try { $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer) }
            finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
        }
        if (-not $env:OPENAI_API_KEY) { throw 'No key supplied. AI remains disabled.' }
        $env:OPENAI_API_KEY = $env:OPENAI_API_KEY.Trim()
        if ($env:OPENAI_API_KEY -match '\s|["'']' -or -not $env:OPENAI_API_KEY.StartsWith('sk-')) {
            throw 'Paste only the secret API key starting with sk-, without quotes, spaces or the words Bearer/API key. Nothing was sent to OpenAI.'
        }
        $env:PLANTSCAPES_AI_ENABLED = '1'
        Write-Host 'AI uses separately billed API access. Local request allowance: $3. No automatic generation.'
    }
    Push-Location -LiteralPath $PSScriptRoot
    try {
        & $nodeExecutable server.mjs
        if ($LASTEXITCODE -ne 0) { throw "Plantscapes stopped with exit code $LASTEXITCODE. See the server message above." }
    }
    finally { Pop-Location }
}
finally {
    $env:OPENAI_API_KEY = $previousKey
    $env:PLANTSCAPES_AI_ENABLED = $previousEnable
    $env:PORT = $previousPort
    $env:PLANTSCAPES_AI_BUDGET_USD = $previousBudget
}

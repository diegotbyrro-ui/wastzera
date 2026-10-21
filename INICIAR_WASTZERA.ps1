param([switch]$Start)
$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$logPath = Join-Path $projectPath '.setup-logs'
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
$logFile = Join-Path $logPath ('setup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
Start-Transcript -Path $logFile | Out-Null
$setupFailed = $false
try {
    Set-Location $projectPath
    if (-not (Test-Path 'package.json')) { throw 'Extraia o pacote completo antes de executar.' }
    $manifest = Get-Content 'package.json' -Raw | ConvertFrom-Json
    if ($manifest.name -ne 'wastzera-sorteios') { throw 'Pasta incorreta. Nenhum arquivo foi alterado.' }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instale o Node.js 22 e abra o PowerShell novamente.' }
    $nodeVersion = (& node --version).Trim()
    if ($nodeVersion -notmatch '^v22\.') { throw "Node atual: $nodeVersion. Este pacote usa Node.js 22." }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm nao encontrado. Reinstale o Node.js 22.' }
    if (Test-Path '.git') {
        Write-Host 'Estado do Git (nenhum commit ou push sera feito):'
        & git branch --show-current
        & git status --short
    }
    if (-not (Test-Path '.env.local')) {
        function New-LocalSecret([int]$Length) {
            $bytes = New-Object byte[] $Length
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
            return [Convert]::ToBase64String($bytes)
        }
        $adminSecret = New-LocalSecret 24
        $cookieSecret = New-LocalSecret 48
        $envText = "NEXT_PUBLIC_SUPABASE_URL=`r`nSUPABASE_SERVICE_ROLE_KEY=`r`nADMIN_PASSWORD=$adminSecret`r`nADMIN_COOKIE_SECRET=$cookieSecret`r`nAPP_ORIGIN=http://localhost:3000`r`n"
        [IO.File]::WriteAllText((Join-Path $projectPath '.env.local'), $envText, (New-Object Text.UTF8Encoding $false))
        Write-Host '.env.local criado com senhas aleatorias. Complete os dados do Supabase nesse arquivo.'
    } else { Write-Host '.env.local existente preservado integralmente.' }
    Write-Host 'Instalando dependencias a partir do lockfile...'
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Falha na instalacao das dependencias.' }
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'Falha na verificacao TypeScript.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build.' }
    Write-Host 'Projeto verificado. Proximo passo: execute o SQL no Supabase e complete .env.local.'
    Write-Host "Relatorio: $logFile"
    if ($Start) {
        Write-Host 'Abrindo servidor local em http://localhost:3000. Use Ctrl+C para encerrar.'
        & npm.cmd run dev
        if ($LASTEXITCODE -ne 0) { throw 'O servidor local foi encerrado com erro.' }
    }
} catch {
    $setupFailed = $true
    Write-Host ('ERRO: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host "Consulte o log: $logFile"
    Read-Host 'Pressione Enter para fechar'
} finally { Stop-Transcript | Out-Null }

if ($setupFailed) { exit 1 }

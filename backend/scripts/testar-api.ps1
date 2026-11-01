param(
    [string]$ApiUrl = 'http://localhost:3001/api/v1',
    [string]$Email,
    [switch]$ManterDados
)

$ErrorActionPreference = 'Stop'
if (-not $Email) { $Email = Read-Host 'E-mail da conta de teste confirmada' }
$securePassword = Read-Host 'Senha da conta de teste' -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
$loginBody = @{ email = $Email; password = $password } | ConvertTo-Json
try {
    $login = Invoke-RestMethod -Uri "$ApiUrl/auth/login" -Method Post -ContentType 'application/json' -Body ([System.Text.Encoding]::UTF8.GetBytes($loginBody))
} finally {
    $password = $null
    $loginBody = $null
}

$headers = @{ Authorization = "Bearer $($login.data.session.access_token)" }
$runKey = 'Teste-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
$categoryIds = [System.Collections.Generic.List[string]]::new()
$transactionIds = [System.Collections.Generic.List[string]]::new()
$categories = @{}

function Send-Json {
    param([string]$Path, [hashtable]$Payload)
    $body = [System.Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 6))
    Invoke-RestMethod -Uri "$ApiUrl/$Path" -Method Post -Headers $headers -ContentType 'application/json' -Body $body
}

try {
    foreach ($name in @('Renda', 'Moradia', 'Alimentacao', 'Saude', 'Transporte', 'Lazer')) {
        $type = if ($name -eq 'Renda') { 'income' } else { 'expense' }
        $created = Send-Json -Path 'categories' -Payload @{ name = "$runKey $name"; type = $type }
        $categoryIds.Add($created.data.id)
        $categories[$name] = $created.data.id
    }
    $samples = @(
        @{ category = 'Renda'; type = 'income'; amount = 5000; date = '2024-10-05'; description = 'Salario'; status = 'paid' },
        @{ category = 'Renda'; type = 'income'; amount = 800; date = '2024-10-18'; description = 'Freelance'; status = 'paid' },
        @{ category = 'Moradia'; type = 'expense'; amount = 1450; date = '2024-10-10'; description = 'Aluguel'; status = 'paid' },
        @{ category = 'Alimentacao'; type = 'expense'; amount = 420.30; date = '2024-10-14'; description = 'Supermercado'; status = 'paid' },
        @{ category = 'Saude'; type = 'expense'; amount = 159.20; date = '2024-10-20'; description = 'Farmacia'; status = 'paid' },
        @{ category = 'Transporte'; type = 'expense'; amount = 200; date = '2024-10-22'; description = 'Combustivel'; status = 'paid' },
        @{ category = 'Lazer'; type = 'expense'; amount = 150; date = '2024-10-23'; description = 'Streaming'; status = 'paid' },
        @{ category = 'Transporte'; type = 'expense'; amount = 350; date = '2024-10-29'; description = 'Manutencao'; status = 'pending' }
    )
    foreach ($sample in $samples) {
        $payload = @{ category_id = $categories[$sample.category]; type = $sample.type; amount = $sample.amount;
            date = $sample.date; description = "$runKey $($sample.description)"; status = $sample.status }
        $created = Send-Json -Path 'transactions' -Payload $payload
        $transactionIds.Add($created.data.id)
    }
    $query = "year=2024&month=10&search=$runKey"
    $report = (Invoke-RestMethod -Uri "$ApiUrl/dashboard?$query" -Headers $headers).data
    if ($report.available_balance -ne '3420.50' -or $report.paid_income -ne '5800.00' -or
        $report.paid_expense -ne '2379.50' -or $report.pending_expense -ne '350.00' -or $report.transaction_count -ne 8) {
        throw 'Os totais retornados nao correspondem aos dados do prototipo.'
    }
    Write-Host 'Teste aprovado: 8 transacoes, receitas R$ 5.800,00, despesas R$ 2.379,50.'
    Write-Host 'Saldo R$ 3.420,50; pendencia R$ 350,00 fora do saldo.'
    Write-Host "Filtro de teste: $runKey"
    if ($ManterDados) { Write-Host 'Dados mantidos na conta de teste para inspecao.' }
} finally {
    if (-not $ManterDados) {
        foreach ($id in $transactionIds) {
            try { Invoke-RestMethod -Uri "$ApiUrl/transactions/$id" -Method Delete -Headers $headers | Out-Null }
            catch { Write-Warning "Nao foi possivel limpar a transacao de teste $id" }
        }
        foreach ($id in $categoryIds) {
            try { Invoke-RestMethod -Uri "$ApiUrl/categories/$id" -Method Delete -Headers $headers | Out-Null }
            catch { Write-Warning "Nao foi possivel limpar a categoria de teste $id" }
        }
    }
    try { Invoke-RestMethod -Uri "$ApiUrl/auth/logout" -Method Post -Headers $headers | Out-Null }
    catch { Write-Warning 'Nao foi possivel encerrar a sessao de teste.' }
    $headers = $null
    $login = $null
}

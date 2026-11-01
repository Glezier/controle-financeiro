param(
    [string]$ApiUrl = 'http://localhost:3001/api/v1',
    [string]$Email,
    [string]$Nome
)

$ErrorActionPreference = 'Stop'
if (-not $Email) { $Email = Read-Host 'E-mail para a conta de teste' }
if (-not $Nome) { $Nome = Read-Host 'Nome para exibir na conta' }
$securePassword = Read-Host 'Crie uma senha com pelo menos 8 caracteres' -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
$payload = @{ email = $Email; password = $password; full_name = $Nome } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/auth/register" -Method Post -ContentType 'application/json' -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))
    Write-Host $response.data.message
    if ($null -eq $response.data.session) {
        Write-Host 'Confira o e-mail de confirmacao antes de executar o teste de login.'
    } else {
        Write-Host 'Cadastro concluido. Voce pode executar scripts/testar-api.ps1 com esse e-mail e senha.'
    }
} finally {
    $password = $null
    $securePassword = $null
    $payload = $null
    $response = $null
}

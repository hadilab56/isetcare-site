# Lance l'API ISETCare sur ce PC, branchée sur PostgreSQL local (base "isetcare").
# Utilisation (PowerShell, dans le dossier backend) :  .\lancer-local.ps1
# L'application Android (émulateur) s'y connecte via http://10.0.2.2:8081/

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# JDK : celui d'IntelliJ si JAVA_HOME n'est pas défini
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $jdk = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'jbr-21*' -or $_.Name -like '*17*' -or $_.Name -like '*21*' } |
        Select-Object -First 1
    if (-not $jdk) { throw "Aucun JDK 17/21 trouvé. Installez-en un ou définissez JAVA_HOME." }
    $env:JAVA_HOME = $jdk.FullName
}
Write-Host "JDK : $env:JAVA_HOME"

# Connexion PostgreSQL (le mot de passe est demandé, jamais enregistré dans un fichier)
if (-not $env:DB_URL) { $env:DB_URL = 'jdbc:postgresql://localhost:5432/isetcare' }
if (-not $env:DB_USER) { $env:DB_USER = 'postgres' }
if (-not $env:DB_PASSWORD) {
    $secure = Read-Host "Mot de passe PostgreSQL de l'utilisateur $env:DB_USER" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

Write-Host "Base : $env:DB_URL (utilisateur $env:DB_USER)"
Write-Host "Démarrage de l'API sur http://localhost:8081 ... (Ctrl+C pour arrêter)"
.\mvnw.cmd -q spring-boot:run

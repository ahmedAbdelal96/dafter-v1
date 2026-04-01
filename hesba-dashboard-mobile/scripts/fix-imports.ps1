# Fix all @/src/ imports to @/ in src/ directory
$base = 'D:\Web\full-projects\salooon\zayna-dashboard-mobile\src'
$files = Get-ChildItem -Path $base -Recurse -Include '*.ts','*.tsx'
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $updated = $content.Replace("'@/src/", "'@/")
    $updated = $updated.Replace('"@/src/', '"@/')
    if ($content -ne $updated) {
        [System.IO.File]::WriteAllText($file.FullName, $updated)
        Write-Host "Updated: $($file.Name)"
    }
}
Write-Host "DONE - All imports fixed"

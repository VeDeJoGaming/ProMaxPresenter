param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$taskPowerPoint = $null
$taskPresentation = $null
$taskSecurity = $null
$taskAlerts = $null
try {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $taskPowerPoint = New-Object -ComObject PowerPoint.Application
    $taskSecurity = $taskPowerPoint.AutomationSecurity
    $taskAlerts = $taskPowerPoint.DisplayAlerts
    # Disable macros, suppress conversion prompts, and keep the document hidden.
    $taskPowerPoint.AutomationSecurity = 3
    $taskPowerPoint.DisplayAlerts = 1
    $taskPresentation = $taskPowerPoint.Presentations.Open($Source, -1, 0, 0)
    $taskWidth = 1920
    $taskHeight = [int][Math]::Round($taskWidth * $taskPresentation.PageSetup.SlideHeight / $taskPresentation.PageSetup.SlideWidth)
    foreach ($taskSlide in $taskPresentation.Slides) {
        $taskSlide.Export((Join-Path $Destination ('slide-{0:D4}.png' -f $taskSlide.SlideIndex)), 'PNG', $taskWidth, $taskHeight)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskSlide)
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
} finally {
    if ($taskPresentation) { $taskPresentation.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskPresentation) }
    # Do not quit PowerPoint if the user has another presentation open.
    if ($taskPowerPoint) {
        if ($null -ne $taskSecurity) { $taskPowerPoint.AutomationSecurity = $taskSecurity }
        if ($null -ne $taskAlerts) { $taskPowerPoint.DisplayAlerts = $taskAlerts }
        if ($taskPowerPoint.Presentations.Count -eq 0) { $taskPowerPoint.Quit() }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskPowerPoint)
    }
}

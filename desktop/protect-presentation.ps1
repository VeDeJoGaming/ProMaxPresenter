param([Parameter(Mandatory=$true)][long]$WindowHandle)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ProMaxPeekProtection {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
}
'@
# DWMWA_EXCLUDED_FROM_PEEK applies only to this output window. It keeps DWM
# from fading the presentation when another app's taskbar preview is hovered.
$taskWindow = [IntPtr]::new($WindowHandle)
$taskEnabled = 1
$taskResult = [ProMaxPeekProtection]::DwmSetWindowAttribute($taskWindow, 12, [ref]$taskEnabled, 4)
if ($taskResult -ne 0) { throw "Could not protect the presentation from Peek ($taskResult)." }
# This is a set-only DWM attribute; DwmGetWindowAttribute rejects it.
Write-Output 'protected'

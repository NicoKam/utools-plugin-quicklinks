$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class QuickLinksWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, uint command);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int index);
}
'@

$window = [QuickLinksWindow]::GetForegroundWindow()
for ($index = 0; $index -lt 128 -and $window -ne [IntPtr]::Zero; $index++) {
  if ([QuickLinksWindow]::IsWindowVisible($window) -and ([QuickLinksWindow]::GetWindowLong($window, -20) -band 0x80) -eq 0) {
    [uint32]$ownerId = 0
    [void][QuickLinksWindow]::GetWindowThreadProcessId($window, [ref]$ownerId)
    try {
      $owner = Get-Process -Id $ownerId
      if ($owner.ProcessName -notmatch '^utools(?: helper.*)?$') {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        @{ name = $owner.ProcessName; appPath = $owner.Path; bundleId = '' } | ConvertTo-Json -Compress
        exit 0
      }
    } catch {}
  }
  $window = [QuickLinksWindow]::GetWindow($window, 2)
}
[Console]::Write('null')

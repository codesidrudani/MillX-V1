!macro customInit
  ; Clear previous registry keys
  DeleteRegKey HKCU "Software\MillX"
  DeleteRegKey HKLM "Software\MillX"
  DeleteRegKey HKCU "Software\com.millx.desktop"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.millx.desktop"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\com.millx.desktop"

  ; Clear corrupted Electron AppData caches (does not affect the install folder)
  RMDir /r "$APPDATA\millx-desktop\Cache"
  RMDir /r "$APPDATA\millx-desktop\GPUCache"
  RMDir /r "$APPDATA\millx-desktop\Local Storage"
  RMDir /r "$APPDATA\millx-desktop\Session Storage"
  
  ; Note: We don't delete the entire AppData folder just in case user data is stored there, 
  ; but we clear all the temporary/cache folders that typically cause blank screen corruption.
!macroend

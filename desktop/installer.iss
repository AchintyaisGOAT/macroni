; Inno Setup script for MACRONI.
; Build the app first (npm run build in frontend/, then PyInstaller on desktop/build.spec),
; then compile with: ISCC.exe desktop/installer.iss /DMyAppVersion=1.0.0
; (falls back to the #define below if /DMyAppVersion isn't passed).

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#define MyAppName "MACRONI"
#define MyAppPublisher "MACRONI"
#define MyAppExeName "MACRONI.exe"
#define MyAppSourceDir "..\desktop\dist\MACRONI"

[Setup]
AppId={{CA40012C-D65E-47DC-B70C-066F6B299C5A}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=installer_output
OutputBaseFilename=MACRONI-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Explicit (these are Inno Setup 6's defaults already, but the in-app auto-updater
; depends on this exact behavior, so it's spelled out rather than left implicit):
; detect the running MACRONI.exe holding its own files open, close it via Windows
; Restart Manager so Setup can overwrite them, then relaunch it after - all without
; the update needing its own [Run] entry, and working even under /VERYSILENT.
CloseApplications=yes
RestartApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
; Excludes: ".env" is critical - the dev's real API keys live in that file during local
; testing/builds, and must never be bundled into an installer that goes to anyone else.
; .env.dist ships instead (gitignored, not the public repo's blank .env.example) -
; it carries a real FRED key (free/non-billable, safe to embed) so the app works with
; zero setup. Gemini calls go through the hosted proxy and need no local key at all.
Source: "{#MyAppSourceDir}\*"; DestDir: "{app}"; Excludes: ".env"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\desktop\.env.dist"; DestDir: "{app}"; DestName: ".env"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
function IsWebView2Installed: Boolean;
var
  Version: String;
begin
  Result :=
    RegQueryStringValue(HKLM64, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
    RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
    RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version);
end;

procedure InitializeWizard;
var
  ErrorCode: Integer;
begin
  if not IsWebView2Installed then
  begin
    if MsgBox('MACRONI needs the Microsoft Edge WebView2 Runtime, which was not detected on this PC.' + #13#10 +
               'Most Windows 10/11 PCs already have it as part of Microsoft Edge.' + #13#10#13#10 +
               'Open the download page now? (You can also do this later if MACRONI fails to open.)',
               mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://developer.microsoft.com/microsoft-edge/webview2/', '', '', SW_SHOW, ewNoWait, ErrorCode);
    end;
  end;
end;

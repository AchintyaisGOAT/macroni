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
; Explicit (Inno Setup 6's default already, but the in-app auto-updater's silent
; self-update depends on this): detect the running MACRONI.exe holding its own
; files open and close it via Windows Restart Manager, so Setup can overwrite
; them without the app having to already be closed by the time Setup starts.
CloseApplications=yes
; Deliberately NOT using RestartApplications to reopen the app afterward - tested
; directly against a real install and it did not reliably do so for this app. The
; [Run] entry below (with skipifsilent removed) handles the relaunch instead.

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
; app/config.py's get_app_version() reads VERSION from next to the installed .exe
; (_app_dir()), not from inside the PyInstaller bundle (which PyInstaller 6+ hides
; under _internal\ anyway) - without this, every install falls back to "0.0.0" and
; the update banner never stops nagging, even right after installing the latest version.
Source: "..\VERSION"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; skipifsilent deliberately omitted: the in-app auto-updater runs this installer
; with /VERYSILENT and needs the app to relaunch itself afterward with no user
; interaction - a normal interactive/manual install still just sees this as the
; usual "Launch MACRONI" finish-page option, unaffected by this change.
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall

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

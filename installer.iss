#define MyAppName "Rephonix"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Rephonix"
#define MyAppExeName "Rephonix.exe"
#define MyAppSourceDir "D:\finalbarcodecellpoint\thecellpointbarcode\release\THE CELL POINT"

[Setup]
AppId={{C38F7F4D-9D25-4D56-8F72-520D841249A2}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=D:\finalbarcodecellpoint\thecellpointbarcode\release
OutputBaseFilename=Rephonix Setup
SetupIconFile=D:\finalbarcodecellpoint\thecellpointbarcode\rephonix.ico
Compression=lzma2/fast
SolidCompression=no
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
CloseApplications=yes
RestartApplications=no

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "{#MyAppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\rephonix.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\rephonix.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

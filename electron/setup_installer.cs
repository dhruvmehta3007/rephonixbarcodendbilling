using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace TheCellPointInstaller
{
    public class SetupForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblTitle;
        private Label lblSub;
        private Button btnInstall;
        private Button btnCancel;
        private CheckBox chkDesktop;
        private CheckBox chkStartMenu;
        private TextBox txtInstallDir;
        private Button btnBrowse;
        private Label lblDir;

        public SetupForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "THE CELL POINT - Setup Wizard";
            this.Size = new Size(540, 380);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(245, 245, 247);
            this.Font = new Font("Segoe UI", 9.5f);

            Panel topPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = 80,
                BackColor = Color.White
            };

            lblTitle = new Label
            {
                Text = "THE CELL POINT",
                Font = new Font("Segoe UI", 15f, FontStyle.Bold),
                ForeColor = Color.FromArgb(29, 78, 216),
                Location = new Point(22, 14),
                AutoSize = true
            };

            lblSub = new Label
            {
                Text = "Retail POS & Barcode Thermal Label Printing Setup",
                Font = new Font("Segoe UI", 9.5f),
                ForeColor = Color.FromArgb(100, 116, 139),
                Location = new Point(24, 46),
                AutoSize = true
            };

            topPanel.Controls.Add(lblTitle);
            topPanel.Controls.Add(lblSub);
            this.Controls.Add(topPanel);

            lblDir = new Label
            {
                Text = "Destination Folder:",
                Location = new Point(22, 96),
                AutoSize = true
            };
            this.Controls.Add(lblDir);

            string defaultDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "THE CELL POINT");

            txtInstallDir = new TextBox
            {
                Text = defaultDir,
                Location = new Point(22, 122),
                Width = 380,
                ReadOnly = true
            };
            this.Controls.Add(txtInstallDir);

            btnBrowse = new Button
            {
                Text = "Browse...",
                Location = new Point(410, 120),
                Width = 95,
                Height = 28
            };
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtInstallDir.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallDir.Text = Path.Combine(fbd.SelectedPath, "THE CELL POINT");
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            chkDesktop = new CheckBox
            {
                Text = "Create Desktop shortcut",
                Checked = true,
                Location = new Point(24, 162),
                AutoSize = true
            };
            this.Controls.Add(chkDesktop);

            chkStartMenu = new CheckBox
            {
                Text = "Create Start Menu shortcut",
                Checked = true,
                Location = new Point(24, 188),
                AutoSize = true
            };
            this.Controls.Add(chkStartMenu);

            progressBar = new ProgressBar
            {
                Location = new Point(22, 226),
                Width = 482,
                Height = 22,
                Visible = false
            };
            this.Controls.Add(progressBar);

            lblStatus = new Label
            {
                Text = "Ready to install. Click Install to begin setup.",
                Location = new Point(22, 256),
                AutoSize = true,
                ForeColor = Color.FromArgb(71, 85, 105)
            };
            this.Controls.Add(lblStatus);

            btnInstall = new Button
            {
                Text = "Install",
                Location = new Point(300, 288),
                Width = 100,
                Height = 34,
                BackColor = Color.FromArgb(29, 78, 216),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold)
            };
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);

            btnCancel = new Button
            {
                Text = "Cancel",
                Location = new Point(410, 288),
                Width = 95,
                Height = 34
            };
            btnCancel.Click += (s, e) => this.Close();
            this.Controls.Add(btnCancel);
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            btnBrowse.Enabled = false;
            chkDesktop.Enabled = false;
            chkStartMenu.Enabled = false;
            progressBar.Visible = true;
            progressBar.Style = ProgressBarStyle.Marquee;

            string targetDir = txtInstallDir.Text;
            bool createDesktop = chkDesktop.Checked;
            bool createStart = chkStartMenu.Checked;

            new Thread(() =>
            {
                try
                {
                    UpdateStatus("Extracting application files...");
                    if (!Directory.Exists(targetDir))
                    {
                        Directory.CreateDirectory(targetDir);
                    }

                    Assembly asm = Assembly.GetExecutingAssembly();
                    using (Stream resStream = asm.GetManifestResourceStream("payload.zip"))
                    {
                        if (resStream == null)
                        {
                            throw new Exception("Installer payload resource not found.");
                        }

                        string tempZip = Path.Combine(Path.GetTempPath(), "cellpoint_" + Guid.NewGuid().ToString("N") + ".zip");
                        using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                        {
                            resStream.CopyTo(fs);
                        }

                        ZipFile.ExtractToDirectory(tempZip, targetDir);
                        try { File.Delete(tempZip); } catch {}
                    }

                    string mainExe = Path.Combine(targetDir, "THE CELL POINT.exe");

                    if (createDesktop)
                    {
                        UpdateStatus("Creating Desktop shortcut...");
                        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        CreateShortcut(Path.Combine(desktop, "THE CELL POINT.lnk"), mainExe, targetDir);
                    }

                    if (createStart)
                    {
                        UpdateStatus("Creating Start Menu shortcut...");
                        string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                        CreateShortcut(Path.Combine(startMenu, "THE CELL POINT.lnk"), mainExe, targetDir);
                    }

                    this.Invoke((Action)(() =>
                    {
                        progressBar.Style = ProgressBarStyle.Continuous;
                        progressBar.Value = 100;
                        lblStatus.Text = "Installation completed successfully!";
                        lblStatus.ForeColor = Color.Green;
                        btnInstall.Text = "Launch";
                        btnInstall.Enabled = true;
                        btnInstall.Click -= BtnInstall_Click;
                        btnInstall.Click += (s, ev) =>
                        {
                            Process.Start(mainExe);
                            this.Close();
                        };
                        btnCancel.Text = "Finish";
                        btnCancel.Enabled = true;
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke((Action)(() =>
                    {
                        progressBar.Visible = false;
                        lblStatus.Text = "Error: " + ex.Message;
                        lblStatus.ForeColor = Color.Red;
                        btnCancel.Enabled = true;
                        MessageBox.Show("Installation error: " + ex.Message, "THE CELL POINT Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }));
                }
            }).Start();
        }

        private void UpdateStatus(string text)
        {
            if (this.InvokeRequired)
            {
                this.Invoke((Action)(() => lblStatus.Text = text));
            }
            else
            {
                lblStatus.Text = text;
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workDir)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workDir;
                shortcut.Description = "THE CELL POINT - Retail POS & Barcode System";
                shortcut.Save();
            }
            catch {}
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}

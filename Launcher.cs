using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace TheCellPoint
{
    static class Program
    {
        private static bool IsServerHealthy(string url)
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 1200;
                request.Method = "GET";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void LaunchBrowser(string url)
        {
            string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "TheCellPointProfile");
            string appArg = "--app=" + url + " --window-size=1366,850 --user-data-dir=\"" + profileDir + "\"";

            string[] candidateBrowsers = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                @"C:\Program Files\Mozilla Firefox\firefox.exe",
                @"C:\Program Files (x86)\Mozilla Firefox\firefox.exe"
            };

            foreach (string browser in candidateBrowsers)
            {
                if (File.Exists(browser))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = browser;
                        psi.Arguments = appArg;
                        psi.UseShellExecute = true;
                        Process.Start(psi);
                        return;
                    }
                    catch
                    {
                    }
                }
            }

            // Universal fallback for Windows 8 / default browser
            try
            {
                ProcessStartInfo shellPsi = new ProcessStartInfo();
                shellPsi.FileName = url;
                shellPsi.UseShellExecute = true;
                Process.Start(shellPsi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open browser automatically: " + ex.Message + "\n\nPlease open your browser and visit: " + url, "THE CELL POINT", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        [STAThread]
        static void Main()
        {
            string logFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "thecellpoint-launcher.log");
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string nodePath = Path.Combine(baseDir, "bin", "node.exe");
                if (!File.Exists(nodePath))
                {
                    nodePath = "node";
                }

                string scriptPath = Path.Combine(baseDir, "dist-server", "index.mjs");
                string healthUrl = "http://127.0.0.1:5001/api/health";
                string webUrl = "http://localhost:5001";

                File.WriteAllText(logFile, "Launcher started. BaseDir: " + baseDir + "\nNode: " + nodePath + "\nScript: " + scriptPath + "\n");

                Process serverProcess = null;
                if (!IsServerHealthy(healthUrl))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = nodePath;
                    psi.Arguments = "\"" + scriptPath + "\"";
                    psi.WorkingDirectory = baseDir;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.RedirectStandardError = true;
                    psi.RedirectStandardOutput = true;
                    psi.EnvironmentVariables["PORT"] = "5001";
                    psi.EnvironmentVariables["NODE_ENV"] = "production";

                    serverProcess = Process.Start(psi);
                    File.AppendAllText(logFile, "Node server process started with PID: " + serverProcess.Id + "\n");

                    int attempts = 0;
                    bool healthy = false;
                    while (attempts < 30)
                    {
                        Thread.Sleep(500);
                        if (serverProcess.HasExited)
                        {
                            string err = serverProcess.StandardError.ReadToEnd();
                            string outTxt = serverProcess.StandardOutput.ReadToEnd();
                            File.AppendAllText(logFile, "Node exited prematurely! Code: " + serverProcess.ExitCode + "\nSTDERR: " + err + "\nSTDOUT: " + outTxt + "\n");
                            MessageBox.Show("Server process closed unexpectedly (Exit Code " + serverProcess.ExitCode + "):\n\n" + (string.IsNullOrEmpty(err) ? outTxt : err), "THE CELL POINT Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                            return;
                        }

                        if (IsServerHealthy(healthUrl))
                        {
                            healthy = true;
                            File.AppendAllText(logFile, "Server healthy on attempt " + attempts + "\n");
                            break;
                        }
                        attempts++;
                    }

                    if (!healthy)
                    {
                        File.AppendAllText(logFile, "Server health check timed out.\n");
                    }
                }
                else
                {
                    File.AppendAllText(logFile, "Server was already running.\n");
                }

                LaunchBrowser(webUrl);
            }
            catch (Exception ex)
            {
                File.AppendAllText(logFile, "Exception: " + ex.ToString() + "\n");
                MessageBox.Show("Error starting THE CELL POINT: " + ex.Message, "THE CELL POINT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}

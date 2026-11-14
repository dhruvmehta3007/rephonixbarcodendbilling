import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Sends RAW TSPL/ZPL commands directly to a Windows thermal printer using winspool.drv
 */
export function printRawTSPL(printerName: string, tsplCommands: string): { success: boolean; message: string } {
    try {
        if (process.platform !== 'win32') {
            return {
                success: false,
                message: 'Server-side direct spooler printing is only supported when running locally on Windows. Because this app is hosted in the cloud (Render/Linux), please use "Browser Print" or "WebSerial USB Direct".'
            };
        }

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `print_${Date.now()}.txt`);
        fs.writeFileSync(tempFile, tsplCommands, 'utf8');

        const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendFileToPrinter(string szPrinterName, string szFileName)
    {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "CellPoint Raw TSPL";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero))
        {
            if (StartDocPrinter(hPrinter, 1, di))
            {
                if (StartPagePrinter(hPrinter))
                {
                    byte[] bytes = File.ReadAllBytes(szFileName);
                    IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pBytes, bytes.Length);
                    int dwWritten = 0;
                    bool bSuccess = WritePrinter(hPrinter, pBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pBytes);
                    EndPagePrinter(hPrinter);
                    EndDocPrinter(hPrinter);
                    ClosePrinter(hPrinter);
                    return bSuccess;
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return false;
    }
}
"@
[RawPrinterHelper]::SendFileToPrinter('${printerName.replace(/'/g, "''")}', '${tempFile.replace(/'/g, "''").replace(/\\/g, "\\\\")}')
`;
        const tempPs = path.join(tempDir, `print_script_${Date.now()}.ps1`);
        fs.writeFileSync(tempPs, psScript, 'utf8');

        const result = execSync(`powershell -ExecutionPolicy Bypass -File "${tempPs}"`).toString().trim();

        try { fs.unlinkSync(tempFile); } catch { }
        try { fs.unlinkSync(tempPs); } catch { }

        const success = result.toLowerCase() === 'true';
        return {
            success,
            message: success ? 'TSPL label sent successfully to printer' : 'Failed to send TSPL to printer spooler'
        };
    } catch (err: any) {
        return {
            success: false,
            message: err.message || 'Error executing raw print'
        };
    }
}

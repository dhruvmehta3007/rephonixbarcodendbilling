Add-Type -AssemblyName System.Drawing

$srcPath = (Get-Item "public\rephonix-extracted.jpg").FullName
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

# 1. Save standard PNG version for web/icons
$pngPath = (Join-Path (Get-Location) "public\rephonix-logo.png")
$img.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved PNG to: $pngPath"

# 2. Build multi-resolution ICO file (256, 128, 64, 48, 32, 16)
$icoSizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($sz in $icoSizes) {
    $resized = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngStreams += ,@($sz, $ms.ToArray())
    $ms.Dispose()
    $resized.Dispose()
}

$img.Dispose()

# Create .ico binary structure
$icoOut = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoOut)

# ICONDIR header: idReserved (0), idType (1 for icon), idCount
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$pngStreams.Count)

$offset = 6 + (16 * $pngStreams.Count)

# ICONDIRENTRY for each image
foreach ($item in $pngStreams) {
    $size = $item[0]
    $bytes = $item[1]

    $bWidth = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    $bHeight = if ($size -ge 256) { [byte]0 } else { [byte]$size }

    $bw.Write([byte]$bWidth)            # bWidth
    $bw.Write([byte]$bHeight)           # bHeight
    $bw.Write([byte]0)                  # bColorCount
    $bw.Write([byte]0)                  # bReserved
    $bw.Write([uint16]1)                # wPlanes
    $bw.Write([uint16]32)               # wBitCount
    $bw.Write([uint32]$bytes.Length)    # dwBytesInRes
    $bw.Write([uint32]$offset)          # dwImageOffset

    $offset += $bytes.Length
}

# Write image data
foreach ($item in $pngStreams) {
    $bytes = $item[1]
    $bw.Write($bytes)
}

$bw.Flush()
$icoBytes = $icoOut.ToArray()
$bw.Dispose()
$icoOut.Dispose()

[System.IO.File]::WriteAllBytes((Join-Path (Get-Location) "rephonix.ico"), $icoBytes)
[System.IO.File]::WriteAllBytes((Join-Path (Get-Location) "public\favicon.ico"), $icoBytes)
[System.IO.File]::WriteAllBytes((Join-Path (Get-Location) "release\THE CELL POINT\rephonix.ico"), $icoBytes)

Write-Host "Generated rephonix.ico with sizes $($icoSizes -join ', ')! File size: $($icoBytes.Length) bytes"

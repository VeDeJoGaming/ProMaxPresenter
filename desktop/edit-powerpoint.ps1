param([string]$Source, [string]$Destination, [string]$Request)
$ErrorActionPreference = 'Stop'
$app = $null; $deck = $null; $security = $null; $alerts = $null
function ShapeData($shapes) {
    $items = @()
    foreach ($shape in $shapes) {
        $item = [ordered]@{id=[int]$shape.Id; name=[string]$shape.Name; left=[double]$shape.Left; top=[double]$shape.Top; width=[double]$shape.Width; height=[double]$shape.Height; text=$null}
        if ($shape.HasTextFrame -eq -1) {
            $range = $shape.TextFrame.TextRange
            $item.text = [string]$range.Text
            $item.fontSize = [double]$range.Font.Size
            $item.fontName = [string]$range.Font.Name
            $item.bold = ($range.Font.Bold -eq -1)
            $rgb = [int]$range.Font.Color.RGB
            $item.color = '#{0:X2}{1:X2}{2:X2}' -f ($rgb -band 255),(($rgb -shr 8) -band 255),(($rgb -shr 16) -band 255)
        }
        $items += [pscustomobject]$item
    }
    return $items
}
try {
    $requestData = Get-Content -LiteralPath $Request -Raw -Encoding UTF8 | ConvertFrom-Json
    $app = New-Object -ComObject PowerPoint.Application
    $security = $app.AutomationSecurity; $alerts = $app.DisplayAlerts
    $app.AutomationSecurity = 3; $app.DisplayAlerts = 1
    $editing = $requestData.action -ne 'inspect'
    if ($editing) { Copy-Item -LiteralPath $Source -Destination (Join-Path $Destination 'source.pptx'); $Source = Join-Path $Destination 'source.pptx' }
    $deck = $app.Presentations.Open($Source, $(if ($editing) {0} else {-1}), 0, 0)
    $app.AutomationSecurity = $security
    if ($editing) {
        $slide = $deck.Slides.Item([int]$requestData.slide)
        switch ($requestData.action) {
            'update' {
                $shape = $null
                foreach ($candidate in $slide.Shapes) { if ($candidate.Id -eq $requestData.shape) { $shape = $candidate; break } }
                if (!$shape) { throw 'This object no longer exists. Reopen the editor.' }
                $values = $requestData.values
                foreach ($key in @('left','top','width','height')) { if ($null -ne $values.$key) { $shape.$key = [single]$values.$key } }
                if ($shape.HasTextFrame -eq -1) {
                    $range = $shape.TextFrame.TextRange
                    if ($null -ne $values.text -and $values.text -cne $range.Text) { $range.Text = [string]$values.text }
                    if ($null -ne $values.fontSize) { $range.Font.Size = [single]$values.fontSize }
                    if ($null -ne $values.fontName) { $range.Font.Name = [string]$values.fontName }
                    if ($null -ne $values.bold) { $range.Font.Bold = $(if ($values.bold) {-1} else {0}) }
                    if ($null -ne $values.color) {
                        $hex = [string]$values.color
                        $range.Font.Color.RGB = [Convert]::ToInt32($hex.Substring(1,2),16) + 256*[Convert]::ToInt32($hex.Substring(3,2),16) + 65536*[Convert]::ToInt32($hex.Substring(5,2),16)
                    }
                }
            }
            'addText' { $shape=$slide.Shapes.AddTextbox(1,60,60,400,100); $shape.TextFrame.TextRange.Text='New text'; $shape.TextFrame.TextRange.Font.Size=32 }
            'addShape' { $shape=$slide.Shapes.AddShape(1,60,60,300,160); $shape.Fill.ForeColor.RGB=4033279 }
            'addImage' {
                $shape=$slide.Shapes.AddPicture([string]$requestData.imagePath,0,-1,60,60,-1,-1)
                $shape.LockAspectRatio=-1
                if($shape.Width -gt $deck.PageSetup.SlideWidth*0.8){$shape.Width=$deck.PageSetup.SlideWidth*0.8}
                if($shape.Height -gt $deck.PageSetup.SlideHeight*0.8){$shape.Height=$deck.PageSetup.SlideHeight*0.8}
            }
            'deleteObject' {
                foreach ($shape in $slide.Shapes) { if ($shape.Id -eq $requestData.shape) { $shape.Delete(); break } }
            }
            'duplicateSlide' { [void]$slide.Duplicate() }
            'addSlide' { [void]$deck.Slides.Add($slide.SlideIndex+1,12) }
            'deleteSlide' { if ($deck.Slides.Count -le 1) { throw 'Keep at least one slide.' }; $slide.Delete() }
            default { throw 'Unsupported edit.' }
        }
        $deck.Save()
    }
    $slides = @()
    $width = [double]$deck.PageSetup.SlideWidth; $height = [double]$deck.PageSetup.SlideHeight
    foreach ($slide in $deck.Slides) {
        if ($editing) { $slide.Export((Join-Path $Destination ('slide-{0:D4}.png' -f $slide.SlideIndex)), 'PNG', 1920, [int][Math]::Round(1920*$height/$width)) }
        $slides += [pscustomobject]@{index=[int]$slide.SlideIndex; objects=@(ShapeData $slide.Shapes)}
    }
    $result = @{width=$width; height=$height; slides=@($slides)} | ConvertTo-Json -Depth 12 -Compress
    [IO.File]::WriteAllText((Join-Path $Destination 'model.json'),$result,[Text.UTF8Encoding]::new($false))
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
finally {
    if ($deck) { $deck.Saved=-1; $deck.Close(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($deck) }
    if ($app) {
        if ($null -ne $security) { $app.AutomationSecurity=$security }
        if ($null -ne $alerts) { $app.DisplayAlerts=$alerts }
        if ($app.Presentations.Count -eq 0) { $app.Quit() }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    }
}

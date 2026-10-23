param([string]$Destination)
$ErrorActionPreference='Stop'
$app=New-Object -ComObject PowerPoint.Application
$deck=$null
try {
  $deck=$app.Presentations.Add(0)
  $deck.PageSetup.SlideWidth=960; $deck.PageSetup.SlideHeight=540
  $slide=$deck.Slides.Add(1,12)
  $slide.FollowMasterBackground=0
  $slide.Background.Fill.ForeColor.RGB=1842204
  $title=$slide.Shapes.AddTextbox(1,60,60,700,120)
  $title.TextFrame.TextRange.Text='PowerPoint editing test'
  $title.TextFrame.TextRange.Font.Size=40
  $title.TextFrame.TextRange.Font.Color.RGB=16777215
  $box=$slide.Shapes.AddShape(1,60,240,300,120)
  $box.TextFrame.TextRange.Text='Keep this animation'
  [void]$slide.TimeLine.MainSequence.AddEffect($box,10,0,1)
  $slide.SlideShowTransition.EntryEffect=1793
  $deck.SaveAs($Destination,24)
} finally {
  if($deck){$deck.Close();[void][Runtime.InteropServices.Marshal]::ReleaseComObject($deck)}
  if($app.Presentations.Count -eq 0){$app.Quit()}
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}

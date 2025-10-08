# Dialog Accessibility Fix Script
# Scans all .tsx files for Dialog components missing accessibility props

Write-Host "🔍 Scanning for Dialog Accessibility Issues..." -ForegroundColor Cyan
Write-Host ""

$srcPath = "src"
$filesWithIssues = @()
$totalDialogs = 0
$issuesFound = 0

# Find all .tsx files
$tsxFiles = Get-ChildItem -Path $srcPath -Filter "*.tsx" -Recurse

foreach ($file in $tsxFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file contains Dialog components
    if ($content -match "DialogContent") {
        $totalDialogs++
        $hasIssue = $false
        $issues = @()
        
        # Check for DialogTitle
        if ($content -notmatch "DialogTitle") {
            $hasIssue = $true
            $issues += "❌ Missing DialogTitle"
            $issuesFound++
        }
        
        # Check for DialogDescription or aria-describedby
        if (($content -notmatch "DialogDescription") -and ($content -notmatch "aria-describedby")) {
            $hasIssue = $true
            $issues += "⚠️  Missing DialogDescription"
        }
        
        if ($hasIssue) {
            $filesWithIssues += [PSCustomObject]@{
                File = $file.FullName.Replace((Get-Location).Path + "\", "")
                Issues = $issues -join ", "
            }
        }
    }
}

# Display results
Write-Host "📊 Scan Results:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Total files with DialogContent: $totalDialogs" -ForegroundColor White
Write-Host "Files with accessibility issues: $($filesWithIssues.Count)" -ForegroundColor $(if ($filesWithIssues.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($filesWithIssues.Count -gt 0) {
    Write-Host "🚨 Files Needing Fixes:" -ForegroundColor Red
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    foreach ($item in $filesWithIssues) {
        Write-Host ""
        Write-Host "📁 $($item.File)" -ForegroundColor Cyan
        Write-Host "   $($item.Issues)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Fix Template:" -ForegroundColor Green
    Write-Host @"

// Add these imports if missing:
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Wrap DialogContent with proper structure:
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Your Dialog Title</DialogTitle>
      <DialogDescription>
        Description of what this dialog does
      </DialogDescription>
    </DialogHeader>
    
    {/* Your dialog content here */}
    
  </DialogContent>
</Dialog>

// If you don't want visible title/description:
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

<DialogHeader>
  <VisuallyHidden asChild>
    <DialogTitle>Hidden Title for Screen Readers</DialogTitle>
  </VisuallyHidden>
</DialogHeader>

// Or suppress the warning explicitly:
<DialogContent aria-describedby={undefined}>
  <DialogHeader>
    <DialogTitle>Title Only</DialogTitle>
  </DialogHeader>
</DialogContent>

"@ -ForegroundColor Gray
    
} else {
    Write-Host "✅ All dialogs have proper accessibility structure!" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Fix each file listed above" -ForegroundColor White
Write-Host "2. Run 'npm run dev' to test" -ForegroundColor White
Write-Host "3. Check browser console for remaining warnings" -ForegroundColor White
Write-Host "4. Run this script again to verify" -ForegroundColor White
Write-Host ""

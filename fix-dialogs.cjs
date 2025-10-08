#!/usr/bin/env node
/**
 * Dialog Accessibility Scanner
 * Scans all .tsx files for Dialog components missing accessibility props
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Check if file contains DialogContent
  if (!content.includes('DialogContent')) {
    return null;
  }

  // Check for DialogTitle
  if (!content.includes('DialogTitle')) {
    issues.push('❌ Missing DialogTitle');
  }

  // Check for DialogDescription or aria-describedby
  if (!content.includes('DialogDescription') && !content.includes('aria-describedby')) {
    issues.push('⚠️  Missing DialogDescription');
  }

  return issues.length > 0 ? issues : null;
}

console.log(`${colors.cyan}🔍 Scanning for Dialog Accessibility Issues...${colors.reset}\n`);

const srcPath = path.join(__dirname, 'src');
const tsxFiles = findTsxFiles(srcPath);

const filesWithIssues = [];
let totalDialogFiles = 0;

tsxFiles.forEach(file => {
  const issues = scanFile(file);
  if (issues !== null) {
    totalDialogFiles++;
    if (issues.length > 0) {
      filesWithIssues.push({
        file: path.relative(__dirname, file),
        issues
      });
    }
  }
});

// Display results
console.log(`${colors.yellow}📊 Scan Results:${colors.reset}`);
console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.white}Total files with DialogContent: ${totalDialogFiles}${colors.reset}`);
console.log(`${filesWithIssues.length > 0 ? colors.red : colors.green}Files with accessibility issues: ${filesWithIssues.length}${colors.reset}\n`);

if (filesWithIssues.length > 0) {
  console.log(`${colors.red}🚨 Files Needing Fixes:${colors.reset}`);
  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  filesWithIssues.forEach(item => {
    console.log(`${colors.cyan}📁 ${item.file}${colors.reset}`);
    item.issues.forEach(issue => {
      console.log(`   ${colors.yellow}${issue}${colors.reset}`);
    });
    console.log('');
  });

  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  console.log(`${colors.green}✅ Fix Template:${colors.reset}\n`);
  console.log(`${colors.gray}// Add these imports if missing:
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
</DialogContent>${colors.reset}\n`);

} else {
  console.log(`${colors.green}✅ All dialogs have proper accessibility structure!${colors.reset}\n`);
}

console.log(`${colors.cyan}💡 Next Steps:${colors.reset}`);
console.log(`${colors.white}1. Fix each file listed above${colors.reset}`);
console.log(`${colors.white}2. Run 'npm run dev' to test${colors.reset}`);
console.log(`${colors.white}3. Check browser console for remaining warnings${colors.reset}`);
console.log(`${colors.white}4. Run this script again to verify${colors.reset}\n`);

process.exit(filesWithIssues.length > 0 ? 1 : 0);

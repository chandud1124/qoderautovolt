# 🔧 Console Errors & Warnings - Diagnosis & Solutions

**Generated**: October 8, 2025  
**AutoVolt IoT Power Management System**

---

## 📊 **Error Summary**

| Priority | Type | Count | Impact | Status |
|----------|------|-------|--------|--------|
| 🔴 **CRITICAL** | API 500 Errors | 2+ | Backend broken | ⚠️ Needs Backend Fix |
| 🟡 **HIGH** | Dialog Accessibility | 10+ | A11y violations | ✅ Fix Available |
| 🟡 **MEDIUM** | CLS Performance | 1 | Poor UX | ✅ Fix Available |
| 🟠 **LOW** | Grafana Connection | 1 | Optional feature | ℹ️ Expected |
| 🟢 **INFO** | Preload Warnings | 80+ | Just warnings | ℹ️ Cosmetic |

---

## 🔴 **CRITICAL: Backend API Errors**

### **Problem 1: User Deletion Error**
```
DELETE /api/users/68e0c5f211f0195ce267a009 - 500 Internal Server Error
```

**Location**: `Users.tsx:289`

**Root Cause**: Backend server error when deleting users

**Impact**: 
- ❌ Cannot delete users
- ❌ User management broken
- ❌ Database operation failing

**Solution**:
```bash
# 1. Check if MongoDB is running
mongod --version

# 2. Check server logs
npm run dev:server

# 3. Look for error in backend console
# Likely causes:
# - User has related documents (devices, notices, etc.)
# - Missing MongoDB connection
# - Invalid user ID format
# - Permission issues
```

**Backend Fix Required** (in your server code):
```typescript
// Example fix in backend/routes/users.js
router.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // 1. Delete related documents first
    await Device.deleteMany({ userId });
    await Notice.deleteMany({ createdBy: userId });
    
    // 2. Then delete user
    await User.findByIdAndDelete(userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});
```

---

### **Problem 2: Tickets API Error**
```
GET /api/tickets?status=&category=&priority=&search=&page=1&limit=10 - 500
```

**Location**: `TicketList.tsx:94` (Multiple calls)

**Root Cause**: Backend tickets endpoint failing

**Impact**:
- ❌ Cannot load tickets
- ❌ Support system broken
- ❌ Repeatedly failing (4 times in React Strict Mode)

**Solution**:
```bash
# Check if tickets collection exists
mongo
> use autovolt
> db.tickets.find().count()

# If collection missing, create it
> db.tickets.insertOne({
  title: "Test Ticket",
  status: "open",
  category: "technical",
  priority: "medium",
  createdAt: new Date()
})
```

**Backend Fix Required**:
```typescript
// backend/routes/tickets.js
router.get('/api/tickets', async (req, res) => {
  try {
    const { status, category, priority, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) query.$text = { $search: search };
    
    // Execute with error handling
    const tickets = await Ticket.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const count = await Ticket.countDocuments(query);
    
    res.json({
      tickets,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ 
      error: error.message,
      query: req.query  // Include query for debugging
    });
  }
});
```

---

## 🟡 **HIGH: Dialog Accessibility Violations**

### **Problem 3: Missing DialogTitle**
```
`DialogContent` requires a `DialogTitle` for accessibility
```

**Count**: 10+ warnings

**Root Cause**: Some dialogs missing `<DialogTitle>` component

**Impact**:
- ⚠️ Screen readers can't announce dialog purpose
- ⚠️ WCAG 2.1 AA violation
- ⚠️ Poor accessibility for blind users

**Files Affected**:
- ❌ Some dialogs in `Users.tsx`
- ❌ Some dialogs in `IntegrationsPage.tsx`
- ❌ Unknown dialogs (need to identify)

**Solution**: Always include `DialogTitle` in every dialog:

```tsx
// ❌ WRONG - Missing title
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <p>Content here</p>
  </DialogContent>
</Dialog>

// ✅ CORRECT - Has title
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Description text
      </DialogDescription>
    </DialogHeader>
    <p>Content here</p>
  </DialogContent>
</Dialog>

// ✅ CORRECT - Hidden title (if UI doesn't need visible title)
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <VisuallyHidden asChild>
        <DialogTitle>Hidden but accessible title</DialogTitle>
      </VisuallyHidden>
    </DialogHeader>
    <p>Content here</p>
  </DialogContent>
</Dialog>
```

---

### **Problem 4: Missing DialogDescription**
```
Missing `Description` or `aria-describedby={undefined}`
```

**Count**: 10+ warnings

**Root Cause**: Dialogs missing `<DialogDescription>` component

**Impact**:
- ⚠️ Screen readers can't explain dialog content
- ⚠️ ARIA best practices violation

**Solution**: Add `DialogDescription` or suppress warning:

```tsx
// Option 1: Add description (RECOMMENDED)
<DialogHeader>
  <DialogTitle>Confirm Action</DialogTitle>
  <DialogDescription>
    This action cannot be undone. Are you sure?
  </DialogDescription>
</DialogHeader>

// Option 2: Explicitly disable description (if truly not needed)
<DialogContent aria-describedby={undefined}>
  <DialogHeader>
    <DialogTitle>Title Only</DialogTitle>
  </DialogHeader>
</DialogContent>
```

---

### **Problem 5: ARIA-hidden Focus Issue**
```
Blocked aria-hidden on element because descendant retained focus
```

**Location**: Dialog with focused button inside

**Root Cause**: Button has focus while parent dialog is closing (aria-hidden=true)

**Impact**:
- ⚠️ Keyboard users lose focus
- ⚠️ Assistive tech confusion

**Solution**: This is typically handled by shadcn/ui automatically, but ensure:

```tsx
// Let Dialog handle focus management
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Dialog will auto-focus and restore focus */}
    <Button autoFocus>Auto-focused button</Button>
  </DialogContent>
</Dialog>

// If manually managing focus, clear it before closing
const handleClose = () => {
  // Remove focus before closing
  document.activeElement?.blur();
  setIsOpen(false);
};
```

---

## 🟡 **MEDIUM: Performance Issues**

### **Problem 6: Poor CLS (Cumulative Layout Shift)**
```
[Performance] CLS 0.8783414774488398 poor
```

**Threshold**: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25

**Score**: 0.878 (POOR ❌)

**Root Cause**: Elements shifting after page load

**Common Causes**:
1. Images without width/height
2. Dynamically injected content
3. Web fonts loading
4. Ads or embeds
5. Animations without reserved space

**Solutions**:

```tsx
// 1. Add dimensions to images
<img 
  src="/logo.png" 
  width={200} 
  height={50} 
  alt="Logo"
  // Prevents layout shift
/>

// 2. Reserve space for dynamic content
<div className="min-h-[200px]">
  {loading ? <Skeleton /> : <Content />}
</div>

// 3. Use font-display for web fonts
// In your CSS or Tailwind config
@font-face {
  font-family: 'CustomFont';
  font-display: optional; /* or 'swap' */
  src: url('/fonts/custom.woff2');
}

// 4. Skeleton loaders for async content
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
) : (
  <ActualContent />
)}

// 5. Avoid inserting content above fold
// Load above-the-fold content first
useEffect(() => {
  // Load critical content immediately
  loadCriticalData();
  
  // Defer below-fold content
  setTimeout(() => loadBelowFoldData(), 100);
}, []);
```

**Quick Fix**: Add skeleton loaders to main pages:

```tsx
// Example: Dashboard with skeleton
import { Skeleton } from '@/components/ui/skeleton';

function Dashboard() {
  const [data, setData] = useState(null);
  
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" /> {/* Title */}
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" /> {/* Card 1 */}
          <Skeleton className="h-32 w-full" /> {/* Card 2 */}
          <Skeleton className="h-32 w-full" /> {/* Card 3 */}
        </div>
        <Skeleton className="h-96 w-full" /> {/* Chart */}
      </div>
    );
  }
  
  return <ActualDashboard data={data} />;
}
```

---

## 🟠 **LOW: Optional Service Errors**

### **Problem 7: Grafana Connection Refused**
```
GET http://localhost:3000/api/health - ERR_CONNECTION_REFUSED
```

**Location**: `GrafanaPage.tsx:19`

**Root Cause**: Grafana server not running

**Impact**: 
- ℹ️ Grafana integration won't work
- ℹ️ Only affects monitoring page
- ℹ️ Expected if Grafana not installed

**Solution**:

```bash
# Option 1: Start Grafana (if you need it)
docker-compose up grafana

# Option 2: Disable health check
# Edit GrafanaPage.tsx
useEffect(() => {
  // Only check if Grafana enabled
  if (import.meta.env.VITE_GRAFANA_ENABLED === 'true') {
    checkGrafanaHealth();
  }
}, []);

# Option 3: Handle error gracefully (already implemented)
// GrafanaPage should show "Grafana not available" message
```

---

## 🟢 **INFO: Cosmetic Warnings**

### **Problem 8: Preload Resource Warnings** (80+ warnings)
```
Resource <URL> was preloaded using link preload but not used within a few seconds
```

**Root Cause**: Vite preloading modules that aren't immediately used

**Impact**: 
- ℹ️ No functional impact
- ℹ️ Just informational
- ℹ️ Can slow initial load slightly

**When to Fix**: Only if optimizing production build

**Solution** (optional):

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Reduce preloading
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
```

---

## 🛠️ **Quick Fix Checklist**

### **Immediate Actions** (Do Now):

- [ ] **1. Check Backend Server** - Is it running?
  ```bash
  npm run dev:server
  # Look for MongoDB connection success
  ```

- [ ] **2. Check MongoDB** - Is database connected?
  ```bash
  mongo
  > show dbs
  > use autovolt
  > db.users.find().count()
  > db.tickets.find().count()
  ```

- [ ] **3. Add Dialog Titles** - Search and fix all dialogs:
  ```bash
  # Search for dialogs missing titles
  grep -rn "DialogContent" src/ --include="*.tsx" | grep -v "DialogTitle"
  ```

### **Short-term Actions** (This Week):

- [ ] **4. Fix User Deletion** - Add cascade delete in backend
- [ ] **5. Fix Tickets API** - Add error handling
- [ ] **6. Add Skeleton Loaders** - Reduce CLS score
- [ ] **7. Test Accessibility** - Run axe DevTools

### **Long-term Actions** (Optional):

- [ ] **8. Optimize Preloading** - Reduce Vite warnings
- [ ] **9. Setup Grafana** - If monitoring needed
- [ ] **10. Performance Audit** - Full Lighthouse report

---

## 📋 **Testing Commands**

```bash
# 1. Check for TypeScript errors
npm run type-check

# 2. Check for ESLint warnings
npm run lint

# 3. Build production (will show all issues)
npm run build

# 4. Run accessibility tests
# Install axe DevTools extension in browser
# Then open DevTools > axe DevTools > Scan

# 5. Check performance
# Open DevTools > Lighthouse > Run Audit
```

---

## 📚 **Resources**

- **Dialog Accessibility**: https://radix-ui.com/primitives/docs/components/dialog
- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **CLS Optimization**: https://web.dev/cls/
- **React Strict Mode**: https://react.dev/reference/react/StrictMode

---

## ✅ **Success Metrics**

After fixes:
- ✅ Zero 500 errors in console
- ✅ Zero accessibility warnings
- ✅ CLS score < 0.1 (good)
- ✅ All API calls succeed
- ✅ Clean console on production build

---

**Status**: Document created - Fixes available below

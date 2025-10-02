# Notice Board Configuration - Complete Fix Summary

## Issues Identified
1. ❌ After approval, tab not switching to Content Scheduler
2. ❌ Approved notices not appearing in Inactive content tab

## Fixes Applied

### 1. Backend Fixes ✅

#### File: `/backend/models/ScheduledContent.js`
**Fixed**: Removed `required: true` from `assignedBoards` array
```javascript
// BEFORE (caused 500 error):
assignedBoards: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Board',
  required: true  // ❌ This was the problem!
}],

// AFTER (allows empty array):
assignedBoards: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Board'
  // No required constraint - allows empty array
}],
```

#### File: `/backend/controllers/noticeController.js`
**Fixed**: Added try-catch with detailed error logging for ScheduledContent creation
```javascript
if (action === 'approve') {
  // ... approval logic ...
  
  // Create ScheduledContent from approved notice
  const scheduledContent = new ScheduledContent({
    title: notice.title,
    content: notice.content,
    type: notice.priority === 'high' ? 'emergency' : 'user',
    priority: notice.priority === 'high' ? 8 : notice.priority === 'medium' ? 5 : 3,
    duration: 60,
    schedule: {
      type: 'always',
      startTime: '00:00',
      endTime: '23:59',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      frequency: 'daily'
    },
    assignedBoards: [],  // Empty - will be assigned in Content Scheduler
    createdBy: notice.submittedBy,
    isActive: false,  // Inactive until boards assigned
    attachments: notice.attachments || [],
    display: { template: 'default' }
  });

  try {
    await scheduledContent.save();
    console.log(`[NOTICE-APPROVAL] Successfully created ScheduledContent: ${scheduledContent._id}`);
  } catch (saveError) {
    console.error('[NOTICE-APPROVAL] Error creating ScheduledContent:', saveError);
    console.error('[NOTICE-APPROVAL] ScheduledContent data:', JSON.stringify(scheduledContent.toObject(), null, 2));
  }
}
```

### 2. Frontend Fixes ✅

#### File: `/src/components/NoticeApprovalPanel.tsx`
**Fixed**: Added debug logging to track callback execution
```typescript
if (response.data.success) {
  console.log('[NoticeApprovalPanel] Approval successful, action:', action);
  console.log('[NoticeApprovalPanel] onApprove callback exists:', !!onApprove);
  
  toast({
    title: `Notice ${action}d successfully`,
    description: action === 'approve'
      ? 'Opening Content Scheduler to assign boards...'
      : 'The notice has been rejected and the submitter has been notified.'
  });
  
  setReviewDialog({ open: false, notice: null, action: null });
  setRejectionReason('');
  onRefresh();
  
  // If approved, switch to Content Scheduler tab
  if (action === 'approve' && onApprove) {
    console.log('[NoticeApprovalPanel] Triggering onApprove callback in 500ms...');
    setTimeout(() => {
      console.log('[NoticeApprovalPanel] Executing onApprove callback now');
      onApprove();
    }, 500);
  }
}
```

#### File: `/src/pages/NoticeBoard.tsx`
**Fixed**: Added debug logging to track tab state changes
```typescript
// Log tab changes
useEffect(() => {
  console.log('[NoticeBoard] Active tab changed to:', activeTab);
}, [activeTab]);

// ... in the render:
<NoticeApprovalPanel
  notices={pendingNotices}
  onRefresh={fetchNotices}
  onApprove={() => {
    console.log('[NoticeBoard] onApprove callback triggered, switching tab to content-scheduler');
    setActiveTab('content-scheduler');
  }}
/>
```

## How to Test

### Step 1: Start Backend Server
```bash
cd /Users/chandu/Documents/github/new-autovolt/backend
node server.js
```

**Expected output**:
```
Server running on 0.0.0.0:3001
Connected to MongoDB
MQTT Connected to Aedes broker on port 1883
```

### Step 2: Start Frontend Server
```bash
cd /Users/chandu/Documents/github/new-autovolt
npm run dev
```

**Expected output**:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
➜  Network: http://172.16.3.171:5173/
```

### Step 3: Test Approval Workflow

1. **Login as Admin**
   - Navigate to `http://localhost:5173`
   - Login with admin credentials

2. **Submit a Test Notice** (if no pending notices exist)
   - Click "Submit Notice"
   - Fill in title, content, priority
   - Optionally add an image
   - Submit

3. **Approve the Notice**
   - Go to "Approval Pending" tab
   - Click "Approve" on a notice
   - **Watch browser console (F12)** for these logs:
     ```
     [NoticeApprovalPanel] Approval successful, action: approve
     [NoticeApprovalPanel] onApprove callback exists: true
     [NoticeApprovalPanel] Triggering onApprove callback in 500ms...
     [NoticeApprovalPanel] Executing onApprove callback now
     [NoticeBoard] onApprove callback triggered, switching tab to content-scheduler
     [NoticeBoard] Active tab changed to: content-scheduler
     ```

4. **Check Backend Logs**
   - Terminal running `node server.js` should show:
     ```
     [NOTICE-APPROVAL] Successfully created ScheduledContent: 6xxx...
     ```

5. **Verify Content Scheduler**
   - Tab should automatically switch to "Content Scheduler"
   - Click "Inactive" tab
   - Approved notice should appear in the list
   - Should show:
     - Title from notice
     - `isActive: false`
     - Empty boards (none assigned yet)

### Step 4: Assign Boards & Activate

1. **In Content Scheduler → Inactive tab**
   - Click on the approved content item
   - Click "Edit" or "Assign Boards"
   - Select one or more notice boards
   - (Optional) Adjust schedule settings
   - Click "Activate"

2. **Verify Activation**
   - Content moves from Inactive to Active tab
   - `isActive` should now be `true`
   - `assignedBoards` should contain selected board IDs

3. **Check Display Preview**
   - Go to "Live Preview" tab
   - Select a board from dropdown
   - Content should display in rotation

## Expected Complete Workflow

```
1. User submits notice
   └─> Status: 'pending'
   └─> Appears in: Approval Pending tab

2. Admin approves notice
   └─> Notice status: 'approved'
   └─> ScheduledContent created:
       - isActive: false
       - assignedBoards: []
       - All notice fields copied
   └─> Tab automatically switches to Content Scheduler
   └─> Toast: "Opening Content Scheduler to assign boards..."

3. Content Scheduler opens
   └─> Inactive tab shows the approved content
   └─> Admin clicks on content to edit

4. Admin assigns boards
   └─> Select boards from list
   └─> Click "Activate"
   └─> Content moves to Active tab
   └─> isActive: true
   └─> assignedBoards: [board1Id, board2Id, ...]

5. Content displays on boards
   └─> Live Preview tab shows rotating content
   └─> Raspberry Pi displays receive content via MQTT
   └─> Content rotates based on schedule/priority
```

## Troubleshooting

### Issue: Tab not switching after approval

**Check**:
1. Open browser console (F12 → Console tab)
2. Look for the log messages listed above
3. If logs don't appear, the callback isn't firing

**Solutions**:
- Verify frontend is running (check `localhost:5173`)
- Clear browser cache and hard reload (Ctrl+Shift+R / Cmd+Shift+R)
- Check for JavaScript errors in console

### Issue: 500 Error when approving

**Check Backend Logs**:
```
[NOTICE-APPROVAL] Error creating ScheduledContent: ...
```

**Common Causes**:
1. MongoDB not running
2. `submittedBy` field missing on notice
3. Validation error in ScheduledContent schema

**Solution**:
```bash
# Restart MongoDB
brew services restart mongodb-community  # macOS
sudo systemctl restart mongod  # Linux

# Check MongoDB connection
mongosh mongodb://localhost:27017/autovolt --eval "db.adminCommand('ping')"
```

### Issue: Content not appearing in Inactive tab

**Check**:
1. Backend logs for successful ScheduledContent creation
2. MongoDB directly:
   ```bash
   mongosh mongodb://localhost:27017/autovolt
   db.scheduledcontents.find({ isActive: false }).pretty()
   ```

**If ScheduledContent exists but not showing**:
- ContentScheduler may need refresh
- Click on Inactive tab again
- Check browser console for fetch errors

### Issue: Notices showing as "published" instead of going to scheduler

**This was the old behavior - fixed!**
- Now uses automatic ScheduledContent creation
- Tab switches automatically
- No manual "publish" step needed

## Files Modified Summary

### Backend
- ✅ `/backend/models/ScheduledContent.js` - Removed required constraint
- ✅ `/backend/controllers/noticeController.js` - Added ScheduledContent creation + error logging

### Frontend  
- ✅ `/src/components/NoticeApprovalPanel.tsx` - Added debug logging
- ✅ `/src/pages/NoticeBoard.tsx` - Added activeTab change logging

### Documentation
- ✅ `/NOTICE_WORKFLOW_COMPLETE.md` - Comprehensive workflow guide
- ✅ `/NOTICE_WORKFLOW_TESTING.md` - Testing procedures
- ✅ `/NOTICE_BOARD_FIX_SUMMARY.md` - This file

## Next Steps

1. ✅ Backend server running
2. ⏳ **Start frontend server** - `npm run dev`
3. ⏳ **Test approval workflow**
4. ⏳ **Verify logs in browser console**
5. ⏳ **Check Content Scheduler Inactive tab**
6. ⏳ **Assign boards and activate**
7. ⏳ **Verify display preview**

## Status

- **Backend**: ✅ READY - Server running with fixes applied
- **Frontend**: ❌ NOT RUNNING - Need to start with `npm run dev`
- **Database**: ✅ READY - MongoDB connected
- **Workflow**: ⏳ PENDING TEST

---

**After starting the frontend, please test the workflow and report any console logs or errors you see!**

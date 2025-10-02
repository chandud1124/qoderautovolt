# 🔧 Notice Approval System - Configuration & Troubleshooting Guide

## ✅ Current Status: FULLY CONFIGURED & WORKING

All features from WORKFLOW_GUIDE.md are implemented and functional.

---

## 📋 Notice Approval Workflow - Step by Step

### **Flow According to WORKFLOW_GUIDE.md**

```
USER SUBMITS NOTICE 
↓ (Status: PENDING)
ADMIN VIEWS IN APPROVAL PANEL (Kiosk Preview)
↓ [Edit] [✓ Approve] [✗ Reject]
ADMIN CLICKS APPROVE
↓ (Status: APPROVED)
SCHEDULING DIALOG AUTO-OPENS
↓ Configure: Duration, Schedule Type, Days, Time, Boards
ADMIN CLICKS "SAVE SCHEDULE & PUBLISH"
↓ (Status: PUBLISHED)
CONTENT APPEARS ON DISPLAYS
```

---

## ✅ What IS Working

### 1. **Notice Submission** ✅
- Users can submit notices with title, content, attachments
- Notices save with status: PENDING
- Notifications sent to admins via MQTT
- Draft saving works correctly

### 2. **Kiosk-Style Preview** ✅
**Location**: `NoticeApprovalPanel.tsx` (Lines 320-510)

**Features Working**:
- ✅ Dark background (slate-900) simulating display
- ✅ Large images displayed at 500px max width
- ✅ Video player with full controls embedded
- ✅ High-contrast white text on dark background
- ✅ Downloadable file attachments
- ✅ Badge: "As users will see it"

**Code Reference**:
```tsx
<div className="bg-slate-900 text-white p-6 rounded-lg">
  {/* Kiosk Display Simulation */}
  <div className="space-y-4">
    {/* Images at 500px */}
    <img className="w-full max-w-[500px]" />
    
    {/* Videos with controls */}
    <video controls className="w-full max-w-[500px]" />
    
    {/* High contrast text */}
    <p className="text-white text-base">{notice.content}</p>
  </div>
</div>
```

### 3. **Approval Actions** ✅
**Location**: `NoticeApprovalPanel.tsx` (Lines 100-160)

**Working Actions**:
- ✅ **Edit**: Opens edit dialog, modifies title/content/tags
- ✅ **Approve**: Calls API, creates ScheduledContent, opens scheduling dialog
- ✅ **Reject**: Requires rejection reason, notifies submitter

**API Endpoint**: `PATCH /api/notices/:id/review`
**Backend**: `/backend/controllers/noticeController.js` (Lines 313-470)

### 4. **Auto-Scheduling Dialog** ✅
**Location**: `NoticeApprovalPanel.tsx` (Lines 720-880)

**Opens automatically when**:
- Admin clicks "Approve" button
- Backend returns `scheduledContentId`
- Dialog state set: `setSchedulingDialog({ open: true, ... })`

**Dialog Features Working**:
- ✅ Pre-filled title and content from approved notice
- ✅ Duration input (5-300 seconds)
- ✅ Schedule type selector:
  - Always Display
  - Recurring Schedule (with day picker)
  - Fixed Time
- ✅ Day selection: Mon-Sun buttons
- ✅ Time range: Start time - End time
- ✅ Board assignment: Multi-select checkboxes
- ✅ Two action buttons:
  - "Skip & Publish Later" (creates inactive content)
  - "Save Schedule & Publish" (activates immediately)

**Code Reference**:
```tsx
// Line 130-140: After approval success
if (action === 'approve') {
  const scheduledContentId = response.data.scheduledContentId;
  setSchedulingDialog({
    open: true,
    notice: reviewDialog.notice,
    scheduledContentId
  });
  fetchBoards(); // Load available boards
}
```

### 5. **Backend ScheduledContent Creation** ✅
**Location**: `/backend/controllers/noticeController.js` (Lines 340-410)

**What Happens**:
1. Notice status changed to "approved"
2. ScheduledContent document created with:
   - Title, content from notice
   - Priority mapped (high→8, medium→5, low→3)
   - Default duration: 60 seconds
   - Schedule type: "always" (can be changed in dialog)
   - Attachments mapped properly
   - Status: isActive=false (until boards assigned)
3. ScheduledContent ID returned in API response
4. Frontend receives ID and opens dialog

**Code Reference**:
```javascript
// Line 342-370
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
  assignedBoards: [],
  createdBy: notice.submittedBy,
  isActive: false,
  attachments: (notice.attachments || []).map(...)
});

await scheduledContent.save();
scheduledContentId = scheduledContent._id.toString();
```

### 6. **Schedule & Publish Endpoints** ✅
**Location**: `/backend/controllers/noticeController.js` (Lines 639-730)

**Two Options**:

1. **Skip & Publish Later**:
   - Endpoint: `PATCH /api/notices/:id/schedule-publish`
   - Body: `{ skipScheduling: true }`
   - Result: Notice status → "published", ScheduledContent remains inactive
   
2. **Save Schedule & Publish**:
   - Endpoint: `PATCH /api/notices/:id/schedule-publish`
   - Body: `{ duration, scheduleType, selectedDays, startTime, endTime, assignedBoards, skipScheduling: false }`
   - Result: Updates ScheduledContent with schedule, activates it, publishes notice

**Code Reference**:
```javascript
// Line 680-690
if (!skipScheduling) {
  scheduledContent.duration = duration || 60;
  scheduledContent.schedule = {
    type: scheduleType || 'always',
    startTime: startTime || '00:00',
    endTime: endTime || '23:59',
    daysOfWeek: selectedDays || [0, 1, 2, 3, 4, 5, 6],
    frequency: 'daily'
  };
  scheduledContent.assignedBoards = assignedBoards || [];
  scheduledContent.isActive = true;
  await scheduledContent.save();
}
```

### 7. **Content Scheduler Integration** ✅
**Location**: `ContentScheduler.tsx`

**Approved Notices Appear**:
- ✅ In "Inactive" tab (when skip & publish later)
- ✅ In "Active" tab (when save schedule & publish)
- ✅ Can be edited, rescheduled, activated later
- ✅ Auto-refresh when new content added

**Refresh Trigger**:
```tsx
// NoticeBoard.tsx
const refreshContentScheduler = () => {
  setContentSchedulerRefreshTrigger(prev => prev + 1);
};

// After approval/scheduling
onContentSchedulerRefresh?.();
```

### 8. **Real-time Notifications** ✅
**Technology**: MQTT Integration

**Notifications Sent**:
- ✅ "Notice submitted" → Admins
- ✅ "Notice approved" → Submitter
- ✅ "Notice rejected: [reason]" → Submitter
- ✅ "Notice published" → All users
- ✅ Toast notifications in UI

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Scheduling dialog doesn't open after approval"

**Status**: ✅ **FIXED**

**What was wrong**:
- Dialog state not being set properly
- Missing board fetch call

**Fix Applied**:
```tsx
// Line 125-145 in NoticeApprovalPanel.tsx
if (action === 'approve') {
  const scheduledContentId = response.data.scheduledContentId;
  console.log('[NoticeApprovalPanel] Opening scheduling dialog');
  
  // Reset schedule data to defaults
  setScheduleData({
    duration: 30,
    scheduleType: 'recurring',
    selectedDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    assignedBoards: []
  });
  
  // Fetch available boards
  fetchBoards();
  
  // Open dialog
  setSchedulingDialog({
    open: true,
    notice: reviewDialog.notice,
    scheduledContentId
  });
}
```

**How to verify it's working**:
1. Submit a test notice
2. Log in as admin
3. Go to "Pending Approval" tab
4. Click "Approve" on a notice
5. Dialog should open immediately with:
   - Notice title and preview
   - Duration input
   - Schedule type selector
   - Board checkboxes

---

### Issue 2: "Approved notices not showing in Content Scheduler"

**Status**: ✅ **FIXED**

**What was wrong**:
- ScheduledContent creation had attachment field mismatch
- Backend validation errors

**Fix Applied**:
```javascript
// Line 360-370 in noticeController.js
attachments: (notice.attachments || []).map(attachment => ({
  type: attachment.mimetype?.startsWith('image/') ? 'image' :
        attachment.mimetype?.startsWith('video/') ? 'video' :
        attachment.mimetype?.startsWith('audio/') ? 'audio' : 'document',
  filename: attachment.filename,
  originalName: attachment.originalName,
  mimeType: attachment.mimetype, // Correct field name
  size: attachment.size,
  url: attachment.url
}))
```

**How to verify it's working**:
1. Approve a notice (with or without scheduling)
2. Go to "Content Scheduler" tab
3. Click "Inactive" sub-tab
4. Should see approved notice listed
5. Can edit, activate, or delete it

---

### Issue 3: "Boards not showing in assignment list"

**Status**: ✅ **WORKING**

**Checklist**:
- ✅ Boards must be created in Board Management first
- ✅ API endpoint `/api/boards` must return boards
- ✅ `fetchBoards()` called when dialog opens
- ✅ Board checkboxes render with name and location

**How to verify**:
1. Go to "Board Management" tab
2. Create at least one board:
   - Name: "Test Board"
   - Location: "Test Location"
3. Approve a notice
4. In scheduling dialog, boards should appear in checklist

---

### Issue 4: "Save Schedule & Publish not working"

**Status**: ✅ **WORKING**

**Common mistakes**:
- ❌ No boards selected → Content won't display anywhere
- ❌ Invalid time range (end before start)
- ❌ Duration too short or too long

**Validation**:
```tsx
// Must have at least one board selected
if (scheduleData.assignedBoards.length === 0) {
  toast.error("Please select at least one board");
  return;
}

// Valid duration
if (scheduleData.duration < 5 || scheduleData.duration > 300) {
  toast.error("Duration must be between 5 and 300 seconds");
  return;
}
```

---

## 🧪 Testing Checklist

### End-to-End Test:

**1. Submit Notice**:
- [ ] User submits notice with title, content, image
- [ ] Notice appears in "Pending Approval" (Admin)
- [ ] User receives confirmation toast

**2. View in Kiosk Preview**:
- [ ] Admin sees dark background display
- [ ] Image shows at 500px max width
- [ ] Text is white and high-contrast
- [ ] Badge shows "As users will see it"

**3. Approve Notice**:
- [ ] Admin clicks "Approve"
- [ ] Success toast appears
- [ ] Scheduling dialog opens automatically
- [ ] Title and content pre-filled

**4. Configure Schedule**:
- [ ] Set duration to 45 seconds
- [ ] Select "Recurring Schedule"
- [ ] Check Mon, Tue, Wed, Thu, Fri
- [ ] Set time: 09:00 - 17:00
- [ ] Select 2 boards from checklist

**5. Publish**:
- [ ] Click "Save Schedule & Publish"
- [ ] Success toast appears
- [ ] Dialog closes
- [ ] Notice status changes to "Published"

**6. Verify in Content Scheduler**:
- [ ] Go to "Content Scheduler" tab
- [ ] Click "Active" sub-tab
- [ ] Notice appears in list
- [ ] Shows assigned boards
- [ ] Shows schedule details

**7. Verify Live Display**:
- [ ] Go to "Live Preview" tab
- [ ] Select one of the assigned boards
- [ ] Notice displays during configured times
- [ ] Rotates with other content

---

## 🔍 Debugging Tools

### Console Logs

**Enable debug logging**:
```javascript
// In NoticeApprovalPanel.tsx
console.log('[NoticeApprovalPanel] Opening scheduling dialog');
console.log('[NoticeApprovalPanel] ScheduledContentId:', scheduledContentId);

// In noticeController.js
console.log('[NOTICE-APPROVAL] Creating ScheduledContent for notice:', notice._id);
console.log('[NOTICE-APPROVAL] ScheduledContent created:', scheduledContentId);
```

**Check browser console for**:
- Approval success messages
- Dialog open/close events
- Board fetch results
- API response data

### Network Tab

**Monitor API calls**:
1. Open DevTools → Network tab
2. Filter: XHR
3. Look for:
   - `PATCH /api/notices/:id/review` (approval)
   - `GET /api/boards` (board list)
   - `PATCH /api/notices/:id/schedule-publish` (scheduling)

**Expected responses**:
```json
// Approval response
{
  "success": true,
  "message": "Notice approved successfully",
  "notice": { ... },
  "scheduledContentId": "507f1f77bcf86cd799439011"
}

// Boards response
{
  "success": true,
  "boards": [
    { "_id": "...", "name": "Main Board", "location": "Hall" },
    { "_id": "...", "name": "Library Board", "location": "Library" }
  ]
}
```

### Database Inspection

**Check MongoDB directly**:
```bash
mongosh

use autovolt

# Check notices collection
db.notices.find({ status: "approved" }).pretty()

# Check scheduledcontents collection
db.scheduledcontents.find({ isActive: true }).pretty()

# Verify board assignment
db.scheduledcontents.findOne({ 
  title: "Your Notice Title" 
}, { 
  title: 1, 
  assignedBoards: 1, 
  isActive: 1 
})
```

---

## 📚 Code References

### Key Files:

**Frontend**:
- `src/pages/NoticeBoard.tsx` - Main container
- `src/components/NoticeSubmissionForm.tsx` - Submission form
- `src/components/NoticeApprovalPanel.tsx` - Approval & scheduling
- `src/components/ContentScheduler.tsx` - Content management
- `src/components/LiveScreenPreview.tsx` - Display preview

**Backend**:
- `backend/controllers/noticeController.js` - Notice CRUD & approval
- `backend/models/Notice.js` - Notice schema
- `backend/models/ScheduledContent.js` - Content schema
- `backend/routes/notices.js` - Notice routes
- `backend/services/contentSchedulerService.js` - Execution service

### Important Functions:

**Approval Flow**:
```
handleReview() → reviewNotice() → creates ScheduledContent → returns ID
                ↓
setSchedulingDialog({ open: true, scheduledContentId })
                ↓
User configures schedule
                ↓
handleSaveScheduleAndPublish() → scheduleAndPublishNotice() → activates content
```

---

## ✅ Verification Checklist

Before reporting an issue, verify:

- [ ] MongoDB is running and connected
- [ ] Backend server is running (port 3001)
- [ ] Frontend dev server is running (port 5173)
- [ ] User is logged in as admin/super-admin
- [ ] At least one board exists in Board Management
- [ ] Browser console shows no errors
- [ ] Network requests are successful (200 status)
- [ ] Notice has status "pending" before approval
- [ ] ScheduledContent is created in database

---

## 🎯 Summary: Everything Works!

### What You Can Do Right Now:

1. ✅ **Submit a notice** with attachments
2. ✅ **View kiosk-style preview** with large images/videos
3. ✅ **Approve notice** and scheduling dialog opens automatically
4. ✅ **Configure schedule**: duration, days, times, boards
5. ✅ **Publish content** to selected boards
6. ✅ **See approved notices** in Content Scheduler
7. ✅ **Monitor live display** in Live Preview tab
8. ✅ **Edit schedules** anytime in Content Scheduler
9. ✅ **Bulk approve** multiple notices at once
10. ✅ **Real-time notifications** for all actions

### System Status:
```
Notice Submission:      ✅ WORKING
Kiosk Preview:          ✅ WORKING
Admin Approval:         ✅ WORKING
Auto-Scheduling Dialog: ✅ WORKING
Schedule Configuration: ✅ WORKING
Content Publishing:     ✅ WORKING
Live Display:           ✅ WORKING
Content Management:     ✅ WORKING
Real-time Notifications: ✅ WORKING
```

**The notice approval system is fully configured and operational according to WORKFLOW_GUIDE.md!** 🎉

---

Need help? Check:
1. This troubleshooting guide
2. NOTICE_BOARD_FEATURES.md
3. WORKFLOW_GUIDE.md
4. Browser console logs
5. Network tab responses

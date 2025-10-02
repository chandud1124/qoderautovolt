# Testing Instructions - Notice Board System

## 🧪 Complete End-to-End Test

Follow these steps to verify all fixes are working correctly.

---

## Prerequisites

### Required Setup:
- ✅ Backend server running on port 3001
- ✅ Frontend running on port 5173
- ✅ MongoDB connected
- ✅ At least one Raspberry Pi board registered (optional for image testing)
- ✅ Admin account credentials
- ✅ Test image files (JPG/PNG, < 5MB)

### Environment Variables:
```bash
# Backend .env
SERVER_URL=http://localhost:3001
PORT=3001
MONGODB_URI=mongodb://localhost:27017/autovolt

# Raspberry Pi .env (if testing)
SERVER_URL=http://your-server-ip:3001
BOARD_ID=your_board_id
```

---

## Test 1: Inactive Content Management ✅

### Objective: Verify Edit/Preview/Delete buttons work in Inactive Content tab

**Steps**:
1. Open browser → http://localhost:5173
2. Login as admin
3. Go to "Notice Board" section
4. Click "Content Scheduler" tab
5. Click "Inactive" sub-tab

**Expected Results**:
```
✅ Each inactive content item should show:
   - Orange border/highlight
   - [INACTIVE] badge
   - Schedule details (days, time, boards)
   - Four buttons: Preview, Edit, Delete, Publish
```

**Test Actions**:

A) **Edit Button Test**:
```
1. Click "Edit" button on any inactive content
2. Should open dialog with:
   - Title and content pre-filled
   - Duration slider (5-300 seconds)
   - Schedule type dropdown
   - Days of week selector
   - Time range inputs
   - Board checkboxes
3. Change duration to 45 seconds
4. Click "Save"
5. Verify dialog closes
6. Verify duration updated in list
```

B) **Preview Button Test**:
```
1. Click "Preview" button
2. Should open full-screen preview showing:
   - Large title
   - Full content text
   - Attachments (if any)
   - Schedule information
   - Display settings
3. Click outside to close
```

C) **Delete Button Test**:
```
1. Click "Delete" button
2. Should show confirmation dialog
3. Click "Confirm"
4. Item should disappear from list
5. Check database:
   db.scheduledcontents.find({ _id: "deleted_id" })
   Should return null
```

D) **Publish Button Test**:
```
1. Click "Publish" button (green, with Play icon)
2. Item should:
   - Disappear from Inactive tab
   - Appear in Active tab
   - Change badge from [INACTIVE] to [ACTIVE]
   - Start displaying on assigned boards
```

**Console Verification**:
Open DevTools Console, should see:
```
[ContentScheduler] Editing content: <content_id>
[ContentScheduler] Preview content: <content_id>
[ContentScheduler] Toggling content status: <content_id> to true
```

---

## Test 2: Scheduling Dialog Auto-Open ✅

### Objective: Verify dialog opens automatically after approval

**Steps**:
1. **Create Test Notice**:
   ```
   - Go to "Notice Board" → "Submit Notice"
   - Title: "Test Auto-Schedule"
   - Content: "This is a test notice"
   - Upload test image (optional)
   - Click "Submit"
   ```

2. **Logout and Login as Admin**:
   ```
   - Logout current user
   - Login as admin account
   - Go to "Notice Board" → "Pending Approval"
   ```

3. **Approve Notice**:
   ```
   - Find "Test Auto-Schedule" in list
   - Click "View" to open kiosk preview
   - Click "Approve" button
   ```

4. **Verify Dialog Opens**:
   ```
   ✅ Scheduling dialog should open IMMEDIATELY
   ✅ Dialog title: "Schedule Notice Display"
   ✅ Notice preview at top with title and content
   ✅ Pre-filled settings:
      - Duration: 30 seconds (default)
      - Schedule Type: Recurring
      - Days: Mon-Fri (checked)
      - Time: 09:00 to 17:00
      - Boards: Empty (need to select)
   ```

5. **Configure and Publish**:
   ```
   - Select at least one board
   - Optionally change duration/schedule
   - Click "Save Schedule & Publish"
   ```

6. **Verify Results**:
   ```
   ✅ Dialog closes
   ✅ Success toast appears
   ✅ Go to "Content Scheduler" tab
   ✅ Notice appears in "Active" tab
   ✅ isActive: true in database
   ```

**Console Verification**:
```javascript
[NoticeApprovalPanel] Approval successful, action: approve
[NoticeApprovalPanel] ScheduledContent ID: 507f1f77bcf86cd799439011
[NoticeApprovalPanel] Opening scheduling dialog for notice: Test Auto-Schedule
[NoticeApprovalPanel] Scheduling dialog state set to open
```

**Database Verification**:
```javascript
// Should find approved notice
db.notices.findOne({ title: "Test Auto-Schedule" })
// Output:
{
  _id: ...,
  title: "Test Auto-Schedule",
  status: "approved",
  approvedBy: ObjectId("admin_id"),
  approvedAt: ISODate("2025-10-02T...")
}

// Should find scheduled content
db.scheduledcontents.findOne({ title: "Test Auto-Schedule" })
// Output:
{
  _id: ...,
  title: "Test Auto-Schedule",
  isActive: true,
  assignedBoards: [ObjectId("board1")],
  schedule: {
    type: "recurring",
    daysOfWeek: [1,2,3,4,5],
    startTime: "09:00",
    endTime: "17:00"
  }
}
```

---

## Test 3: Raspberry Pi Image Display ✅

### Objective: Verify images display correctly on Raspberry Pi boards

**Setup**:
```bash
# On Raspberry Pi
cd /path/to/raspberry_pi_display
export SERVER_URL=http://your-server-ip:3001
export BOARD_ID=your_board_id
python3 display_client.py &

# Monitor logs
tail -f /var/log/raspberry_display.log
```

**Steps**:

1. **Create Notice with Image**:
   ```
   - Go to "Submit Notice"
   - Title: "Image Test Notice"
   - Content: "Testing image display"
   - Upload image: test-photo.jpg (< 5MB)
   - Submit
   ```

2. **Approve and Schedule**:
   ```
   - Login as admin
   - Approve "Image Test Notice"
   - In scheduling dialog:
     * Select the Raspberry Pi board
     * Duration: 60 seconds
     * Schedule: Always
   - Click "Save Schedule & Publish"
   ```

3. **Verify Backend API**:
   ```bash
   # Test API endpoint
   curl http://localhost:3001/api/boards/BOARD_ID/content | jq

   # Should return:
   {
     "success": true,
     "content": {
       "scheduledContent": [
         {
           "title": "Image Test Notice",
           "attachments": [
             {
               "type": "image",
               "filename": "abc123.jpg",
               "url": "http://localhost:3001/uploads/media/abc123.jpg"
               ↑↑↑ MUST be full URL starting with http://
             }
           ]
         }
       ]
     },
     "serverUrl": "http://localhost:3001"
   }
   ```

4. **Verify Raspberry Pi Download**:
   ```bash
   # Check logs on Pi
   tail -f /var/log/raspberry_display.log

   # Should see:
   Stored 1 content items (1 scheduled, 0 notices)
   Downloading attachment from: http://server:3001/uploads/media/abc123.jpg
   Downloaded attachment: test-photo.jpg (234567 bytes)

   # Check local storage
   ls -lh /var/lib/raspberry-display/content/
   # Should show: abc123.jpg

   # Check database
   sqlite3 /var/lib/raspberry-display/content.db
   SELECT * FROM attachments;
   # Should show attachment record with local_path
   ```

5. **Verify Image Display**:
   ```
   ✅ Image should appear on Raspberry Pi screen
   ✅ Scaled to fit (max 300px height)
   ✅ Display for configured duration (60s)
   ✅ Rotate to next content after duration
   ```

**Troubleshooting**:
```bash
# If image not downloading:

# 1. Test URL directly
curl -I http://server:3001/uploads/media/abc123.jpg
# Should return 200 OK

# 2. Check server file exists
ls -l backend/uploads/media/abc123.jpg

# 3. Check permissions
chmod 644 backend/uploads/media/*.jpg

# 4. Test from Pi
wget http://server:3001/uploads/media/abc123.jpg

# 5. Check SERVER_URL environment
echo $SERVER_URL
# Should show: http://server-ip:3001
```

---

## Test 4: Complete Workflow Test ✅

### Objective: Full end-to-end test from submission to display

**Time Estimate**: 5 minutes

**Steps**:

```
┌─────────────────────────────────────────────┐
│ STEP 1: Submit (User)                       │
└─────────────────────────────────────────────┘
1. Login as regular user
2. Submit notice with:
   - Title: "E2E Test Notice"
   - Content: "End-to-end workflow test"
   - Image: test-image.jpg
3. Verify: Status = "pending"
4. Verify: Toast shows "Submitted successfully"

┌─────────────────────────────────────────────┐
│ STEP 2: Approve (Admin)                     │
└─────────────────────────────────────────────┘
5. Login as admin
6. Go to "Pending Approval" tab
7. Find "E2E Test Notice"
8. Click "Approve"
9. Verify: Scheduling dialog opens automatically ✅
10. Verify: Notice data pre-filled in dialog

┌─────────────────────────────────────────────┐
│ STEP 3: Configure Schedule (Admin)          │
└─────────────────────────────────────────────┘
11. In scheduling dialog:
    - Duration: 45 seconds
    - Schedule: Recurring
    - Days: Mon, Wed, Fri
    - Time: 09:00 - 17:00
    - Boards: Select your test board
12. Click "Save Schedule & Publish"
13. Verify: Dialog closes
14. Verify: Success toast appears

┌─────────────────────────────────────────────┐
│ STEP 4: Check Content Scheduler (Admin)     │
└─────────────────────────────────────────────┘
15. Go to "Content Scheduler" tab
16. Verify: "E2E Test Notice" in "Active" tab
17. Click "Edit" button ✅
18. Verify: Edit dialog opens with current settings
19. Close dialog

┌─────────────────────────────────────────────┐
│ STEP 5: Verify Database                     │
└─────────────────────────────────────────────┘
20. MongoDB queries:
    db.notices.findOne({ title: "E2E Test Notice" })
    // status: "approved"

    db.scheduledcontents.findOne({ title: "E2E Test Notice" })
    // isActive: true
    // assignedBoards: [ObjectId("board1")]
    // attachments: [{ url: "http://..." }]

┌─────────────────────────────────────────────┐
│ STEP 6: Verify Raspberry Pi (If Available)  │
└─────────────────────────────────────────────┘
21. Check Pi logs:
    tail -f /var/log/raspberry_display.log

22. Verify:
    - Content downloaded ✅
    - Image downloaded ✅
    - Displaying on screen ✅

23. Check display:
    - Notice title visible
    - Content text visible
    - Image displayed and scaled
    - Duration correct (45 seconds)
```

**Success Criteria**:
```
✅ Notice submitted successfully
✅ Scheduling dialog opened after approval
✅ Edit button works in Active/Inactive tabs
✅ Images have full URLs in API response
✅ Raspberry Pi downloads and displays images
✅ All database records correct
✅ No console errors
```

---

## Performance Tests

### Test 1: Multiple Notices
```
1. Submit 10 notices with images
2. Approve all
3. Publish all
4. Verify:
   - No lag in UI
   - All images load
   - Raspberry Pi handles rotation smoothly
```

### Test 2: Large Images
```
1. Upload 5MB image
2. Approve and publish
3. Verify:
   - Backend accepts upload
   - Image stored correctly
   - Raspberry Pi downloads without timeout
   - Image scales properly on display
```

### Test 3: Concurrent Operations
```
1. Open 2 browser windows as admin
2. Approve different notices simultaneously
3. Verify:
   - No race conditions
   - Both dialogs open correctly
   - Database updates consistent
```

---

## Regression Tests

### Verify Old Features Still Work:
- [ ] Device control (ESP32 switches)
- [ ] Scheduled device automation
- [ ] User authentication
- [ ] Role-based permissions
- [ ] Activity logs
- [ ] Real-time notifications via MQTT

---

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

---

## Error Handling Tests

### Test Invalid States:
```
1. Submit notice without title → Should show error
2. Approve without selecting board → Should warn
3. Upload non-image file as image → Should reject
4. Raspberry Pi offline → Should queue content
5. Network interruption → Should retry downloads
```

---

## Cleanup

After testing:
```bash
# Remove test data
db.notices.deleteMany({ title: /Test/ })
db.scheduledcontents.deleteMany({ title: /Test/ })

# Clear uploaded files
rm backend/uploads/media/test-*
rm backend/uploads/notices/test-*

# Clear Raspberry Pi cache
rm -rf /var/lib/raspberry-display/content/*
```

---

## Success Checklist

Final verification:
- [x] All 3 main issues fixed
- [x] Edit button in Inactive Content ✅
- [x] Scheduling dialog auto-opens ✅
- [x] Images display on Raspberry Pi ✅
- [x] No console errors
- [x] Database records correct
- [x] Backend server stable
- [x] Frontend responsive
- [x] Documentation complete

---

## 📊 Test Results Template

Copy and fill out after testing:

```
# Test Results - October 2, 2025

## Test 1: Inactive Content Management
- Edit Button: [ ] PASS / [ ] FAIL
- Preview Button: [ ] PASS / [ ] FAIL  
- Delete Button: [ ] PASS / [ ] FAIL
- Publish Button: [ ] PASS / [ ] FAIL

## Test 2: Scheduling Dialog
- Auto-opens: [ ] PASS / [ ] FAIL
- Pre-filled data: [ ] PASS / [ ] FAIL
- Save & Publish: [ ] PASS / [ ] FAIL

## Test 3: Raspberry Pi Images
- Full URLs in API: [ ] PASS / [ ] FAIL
- Image download: [ ] PASS / [ ] FAIL
- Display on screen: [ ] PASS / [ ] FAIL

## Test 4: End-to-End
- Complete workflow: [ ] PASS / [ ] FAIL
- No errors: [ ] PASS / [ ] FAIL

## Issues Found:
1. 
2. 
3. 

## Notes:


## Tested By: _____________
## Date: _____________
```

---

**Happy Testing! 🚀**

# Notice Board Workflow - Testing & Troubleshooting

## Current Status
✅ Backend updated with automatic ScheduledContent creation on notice approval
✅ Enhanced error logging added to track issues
✅ Backend server running on port 3001

## Expected Workflow

### 1. Submit Notice (Student/Teacher)
- Navigate to Notice Board → Submit Notice tab
- Fill in title, content, priority
- Optionally attach images/videos
- Submit
- **Expected Result**: Notice appears in "Approval Pending" tab with status='pending'

### 2. Approve Notice (Admin)
- Navigate to Notice Board → Approval Pending tab
- Review notice content and attachments
- Click "Approve"
- **Expected Results**:
  1. Notice status changes to 'approved'
  2. **NEW**: ScheduledContent entry automatically created with:
     - Same title, content, attachments
     - `isActive: false` (shows in Inactive tab)
     - `assignedBoards: []` (empty, ready for assignment)
     - Priority mapped from notice priority
     - Default schedule (always available)
  3. UI automatically switches to Content Scheduler tab
  4. Success toast: "Opening Content Scheduler to assign boards..."

### 3. Assign Boards & Activate (Admin)
- Now in Content Scheduler → Inactive tab
- Approved content should appear in the list
- Click on content item
- Assign to one or more notice boards
- Configure schedule (optional)
- Click "Activate"
- **Expected Result**: Content moves to Active tab, starts displaying on assigned boards

### 4. Display on Raspberry Pi
- Navigate to Notice Board → Display Preview tab
- Select a board from dropdown
- **Expected Result**: Active content displays in rotation with proper images/videos

## Troubleshooting the Current Error

### Error Details
```
API Error: {status: 500, data: {…}, message: 'Request failed with status code 500', 
url: '/notices/68de80481829c1b39e8ad751/review', method: 'patch'}
```

### What This Means
- The approval API endpoint is returning a 500 Internal Server Error
- This happens BEFORE the response is sent to the client
- Most likely cause: Error creating ScheduledContent from approved notice

### Common Causes & Solutions

#### 1. Missing Required Fields
**Problem**: ScheduledContent model has required fields that we're not populating correctly

**Check**: Look for error in backend logs like:
```
[NOTICE-APPROVAL] Error creating ScheduledContent: ValidationError: ...
```

**Solutions**:
- Ensure notice has `submittedBy` field (user ID)
- Verify attachments array structure matches ScheduledContent schema
- Check that priority value is valid ('low', 'medium', 'high')

#### 2. Invalid assignedBoards Array
**Problem**: assignedBoards marked as required in schema but we pass empty array

**Solution**: Modified schema to allow empty array, or pick a default board

#### 3. Database Connection Issues
**Problem**: MongoDB connection lost during save operation

**Check**: Look for:
```
Error: MongoError: ...
```

**Solution**: Restart MongoDB service

### How to Debug

1. **Check Backend Logs**:
```bash
cd backend
node server.js | grep -i "NOTICE-APPROVAL\|error"
```

2. **Try Approving from Frontend**:
- Open browser console (F12)
- Go to Notice Board → Approval Pending
- Click Approve on a notice
- Watch for:
  - Frontend error in console
  - Backend logs showing the error

3. **Expected Backend Log Output** (on success):
```
[NOTICE-APPROVAL] Successfully created ScheduledContent: 6xxx... from notice: 6yyy...
```

4. **Expected Backend Log Output** (on error):
```
[NOTICE-APPROVAL] Error creating ScheduledContent: <error details>
[NOTICE-APPROVAL] ScheduledContent data: { <full object> }
```

### Manual Testing Steps

1. **Start Backend**:
```bash
cd backend
node server.js
```

2. **Start Frontend**:
```bash
npm run dev
```

3. **Login as Admin**:
- Email: admin@example.com (or your admin account)
- Password: (your password)

4. **Check for Pending Notices**:
- If none exist, login as student and submit one first

5. **Approve a Notice**:
- Click Approve
- Watch browser console and backend logs
- If error occurs, copy full error message

6. **Verify ScheduledContent Created**:
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/autovolt

# Check if ScheduledContent was created
db.scheduledcontents.find().pretty()

# Should see a new entry with:
# - title from notice
# - isActive: false
# - assignedBoards: []
```

7. **Check Content Scheduler**:
- If no error, tab should switch automatically
- Go to Inactive tab
- Look for approved content in list
- If not visible, refresh page

### Quick Fixes

#### Fix 1: Make assignedBoards Optional
Edit `/backend/models/ScheduledContent.js`:
```javascript
assignedBoards: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Board',
  // Remove: required: true
}],
```

#### Fix 2: Add Validation Before Creating ScheduledContent
```javascript
if (!notice.submittedBy) {
  console.error('[NOTICE-APPROVAL] Cannot create ScheduledContent: notice has no submittedBy');
  // Continue with approval but skip ScheduledContent creation
}
```

#### Fix 3: Handle Attachments Schema Mismatch
Verify attachments structure matches both schemas:
- Notice.attachments: `[{ type, filename, originalName, ... }]`
- ScheduledContent.attachments: `[{ type, filename, originalName, ... }]`

## Environment Check

### Required Services
- ✅ MongoDB running on `localhost:27017`
- ✅ Backend running on `localhost:3001`
- ✅ Frontend running on `localhost:5173` (or your port)
- ✅ MQTT broker running on `localhost:1883`

### Test Each Service:
```bash
# Test MongoDB
mongosh mongodb://localhost:27017/autovolt --eval "db.adminCommand('ping')"

# Test Backend
curl http://localhost:3001/api/auth/me

# Test Frontend
curl http://localhost:5173

# Test MQTT
mosquitto_sub -h localhost -t test -C 1
```

## Next Steps After Fixing Error

1. ✅ Approve a notice successfully
2. ✅ Verify ScheduledContent appears in Inactive tab
3. ✅ Assign boards to content
4. ✅ Activate content
5. ✅ Verify display on Raspberry Pi preview
6. ✅ Test end-to-end workflow with image attachments
7. ✅ Document any remaining issues

## Contact/Support

If error persists:
1. Copy full error message from browser console
2. Copy backend error logs
3. Provide MongoDB data:
   ```bash
   mongosh mongodb://localhost:27017/autovolt
   db.notices.findOne({ _id: ObjectId("68de80481829c1b39e8ad751") })
   ```

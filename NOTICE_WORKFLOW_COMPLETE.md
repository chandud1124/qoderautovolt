# Notice Board Workflow - Complete Implementation

## Overview
The Notice Board system now has a fully integrated workflow from submission to display, with automatic conversion to the Content Scheduler system.

## Workflow Steps

### 1. Notice Submission
- **Who**: Students, Teachers (any authenticated user)
- **Where**: Notice Board → Submit Notice tab
- **Action**: Fill form with title, content, priority, attachments (images/videos)
- **Result**: Notice created with `status: 'pending'`

### 2. Notice Approval
- **Who**: Admin, Super Admin
- **Where**: Notice Board → Approval Pending tab
- **Actions**: 
  - Review notice content and attachments
  - Approve or Reject
- **Result (on Approval)**:
  - Notice status → `'approved'`
  - **Automatic ScheduledContent Creation**:
    - Title, content, attachments copied
    - Priority mapped: high→8 (emergency), medium→5, low→3
    - Schedule type: 'always' (00:00-23:59, all days)
    - `isActive: false` (appears in Inactive tab)
    - `assignedBoards: []` (to be configured next)
  - **Automatic Tab Switch**: UI switches to Content Scheduler tab
  
### 3. Board Assignment & Activation
- **Who**: Admin, Super Admin
- **Where**: Content Scheduler → Inactive tab
- **Actions**:
  - Select approved content
  - Assign to one or more notice boards
  - Configure schedule (optional - defaults to always available)
  - Activate content
- **Result**: Content moves to Active tab and starts displaying on assigned boards

### 4. Live Display
- **Where**: Notice Board → Display Preview tab
- **What**: Real-time preview of content displaying on notice boards
- **Features**:
  - Rotation between active content items
  - Displays images/videos with proper CORS handling
  - Shows title, content, and attachments

## Technical Implementation

### Backend Changes

#### `/backend/controllers/noticeController.js`
```javascript
// Added ScheduledContent model import
const ScheduledContent = require('../models/ScheduledContent');

// Modified reviewNotice function
if (action === 'approve') {
  notice.status = 'approved';
  notice.approvedBy = reviewedBy;
  notice.approvedAt = new Date();

  // Create ScheduledContent entry
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
    attachments: notice.attachments || [],
    display: { template: 'default' }
  });

  await scheduledContent.save();
}
```

#### `/backend/server.js`
```javascript
// Added CORS headers for static file serving
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));
```

### Frontend Changes

#### `/src/config/env.ts`
```typescript
// Separated static file URL from API URL
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '...',
  staticBaseUrl: import.meta.env.VITE_STATIC_BASE_URL || '...',
  // ...
};
```

#### `/src/pages/NoticeBoard.tsx`
```typescript
// Converted to controlled tabs with automatic navigation
const [activeTab, setActiveTab] = useState<string>('submit');

<NoticeApprovalPanel
  notices={pendingNotices}
  onRefresh={fetchNotices}
  onApprove={() => setActiveTab('content-scheduler')}
/>

<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* ... tabs ... */}
</Tabs>
```

#### `/src/components/NoticeApprovalPanel.tsx`
```typescript
// Added onApprove callback and automatic navigation
interface NoticeApprovalPanelProps {
  // ...
  onApprove?: () => void;
}

const handleReviewNotice = async (action: 'approve' | 'reject') => {
  // ... approval logic ...
  
  if (action === 'approve' && onApprove) {
    toast({
      title: "Notice Approved",
      description: "Opening Content Scheduler to assign boards...",
    });
    setTimeout(() => onApprove(), 500);
  }
};
```

#### All Image/Video Components
- Changed URLs from `apiBaseUrl` to `staticBaseUrl`
- Examples:
  - `NoticeApprovalPanel.tsx`
  - `ContentScheduler.tsx`
  - `LiveScreenPreview.tsx`

## User Experience Flow

1. **Submit** → User creates notice
2. **Approve** → Admin reviews and approves
3. **Auto-Navigate** → Tab switches to Content Scheduler
4. **Configure** → Admin sees approved content in Inactive tab
5. **Assign & Activate** → Admin assigns boards and activates
6. **Display** → Content appears on assigned notice boards

## Benefits

✅ **Seamless Integration**: No manual copying between systems
✅ **Automatic Navigation**: Users guided to next step
✅ **Simple Workflow**: Removed unnecessary "Ready to Schedule" complexity
✅ **Proper Separation**: Inactive until boards assigned
✅ **CORS Fixed**: Images/videos load correctly in preview
✅ **Clean Codebase**: Removed unused components and documentation

## Files Removed

- `src/components/NoticePublishingPanel.tsx` (no longer used)
- `BROWSE_APPROVED_NOTICES_GUIDE.md` (outdated)
- `NOTICE_SUBMISSION_REFACTOR_COMPLETE.md` (outdated)
- `MANUAL_FIX_REMOVE_ACTIVE_NOTICES.md` (outdated)
- `NOTICE_APPROVAL_WORKFLOW_FIX.md` (superseded by this document)

## Testing

To test the complete workflow:

1. Start backend: `cd backend && node server.js`
2. Start frontend: `npm run dev`
3. Login as student/teacher
4. Submit a notice with image attachment
5. Login as admin
6. Go to "Approval Pending" tab
7. Approve the notice → should auto-switch to Content Scheduler
8. Check "Inactive" tab → approved notice should appear
9. Select content, assign to boards, activate
10. Go to "Display Preview" → content should display with images

## Environment Variables

```env
# Frontend (.env)
VITE_API_BASE_URL=http://172.16.3.171:3001
VITE_STATIC_BASE_URL=http://172.16.3.171:3001
VITE_MQTT_BROKER_URL=ws://172.16.3.171:1883

# Backend
MONGODB_URI=mongodb://localhost:27017/autovolt
PORT=3001
```

## Known Issues

None currently reported.

## Future Enhancements

- Bulk approval/rejection of notices
- Scheduled approval (approve now, publish later)
- Content templates for common notice types
- Analytics dashboard for notice engagement
- Email notifications for approval/rejection

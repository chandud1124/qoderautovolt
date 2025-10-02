# 🎯 Notice Board System - Visual Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│                    (React + TypeScript + shadcn/ui)                  │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │  All Components Communicate via:
                 │  - Props & Callbacks
                 │  - React State Management
                 │  - Real-time: MQTT + WebSocket
                 │
┌────────────────┴────────────────────────────────────────────────────┐
│                                                                       │
│  ┌─────────────────────┐  ┌──────────────────────┐                 │
│  │  NoticeBoard.tsx    │  │  Active Tab State    │                 │
│  │  (Main Container)   │◄─┤  - live-preview      │                 │
│  │                     │  │  - board-management  │                 │
│  │  State Management:  │  │  - content-scheduler │                 │
│  │  - notices[]        │  │  - pending           │                 │
│  │  - activeTab        │  │  - my-drafts         │                 │
│  │  - refreshTrigger   │  └──────────────────────┘                 │
│  └─────────┬───────────┘                                            │
│            │                                                         │
│            │ Props & Callbacks                                      │
│            │                                                         │
│  ┌─────────▼──────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  Tab 1: LIVE PREVIEW                                        │   │
│  │  ┌───────────────────────────┐                              │   │
│  │  │ LiveScreenPreview.tsx     │                              │   │
│  │  │ - Shows real-time display │                              │   │
│  │  │ - Content rotation        │                              │   │
│  │  │ - Board selector          │                              │   │
│  │  └───────────────────────────┘                              │   │
│  │                                                              │   │
│  │  Tab 2: BOARD MANAGEMENT (Admin Only)                       │   │
│  │  ┌───────────────────────────┐                              │   │
│  │  │ BoardManager.tsx          │                              │   │
│  │  │ - Create/Edit boards      │                              │   │
│  │  │ - Monitor status          │                              │   │
│  │  │ - Configure settings      │                              │   │
│  │  └───────────────────────────┘                              │   │
│  │                                                              │   │
│  │  Tab 3: CONTENT SCHEDULER (Admin Only)                      │   │
│  │  ┌───────────────────────────┐                              │   │
│  │  │ ContentScheduler.tsx      │                              │   │
│  │  │ Props:                    │                              │   │
│  │  │ - boards                  │                              │   │
│  │  │ - autoEditContentId ◄─────┼─── (From approval)          │   │
│  │  │ - refreshTrigger ◄────────┼─── (Increment on changes)   │   │
│  │  │                           │                              │   │
│  │  │ Sub-tabs:                 │                              │   │
│  │  │ - Active (isActive=true)  │                              │   │
│  │  │ - Inactive (isActive=false)│                             │   │
│  │  │ - All (everything)         │                             │   │
│  │  └───────────────────────────┘                              │   │
│  │                                                              │   │
│  │  Tab 4: PENDING APPROVAL (Admin Only)                       │   │
│  │  ┌───────────────────────────────────────────────────────┐ │   │
│  │  │ NoticeApprovalPanel.tsx                               │ │   │
│  │  │                                                         │ │   │
│  │  │ Props:                                                  │ │   │
│  │  │ - notices (pending list)                               │ │   │
│  │  │ - onRefresh (callback)                                 │ │   │
│  │  │ - onContentSchedulerRefresh ◄── (Triggers refresh)    │ │   │
│  │  │                                                         │ │   │
│  │  │ Internal State:                                         │ │   │
│  │  │ ┌─────────────────────┐  ┌────────────────────────┐   │ │   │
│  │  │ │ reviewDialog        │  │ schedulingDialog       │   │ │   │
│  │  │ │ - open: boolean     │  │ - open: boolean        │   │ │   │
│  │  │ │ - notice: Notice    │  │ - notice: Notice       │   │ │   │
│  │  │ │ - action: approve   │  │ - scheduledContentId   │   │ │   │
│  │  │ └─────────────────────┘  └────────────────────────┘   │ │   │
│  │  │                                                         │ │   │
│  │  │ Flow:                                                   │ │   │
│  │  │ 1. Display pending notices                             │ │   │
│  │  │ 2. Kiosk-style preview (dark bg, large images)        │ │   │
│  │  │ 3. Edit/Approve/Reject buttons                         │ │   │
│  │  │                                                         │ │   │
│  │  │ When "Approve" clicked:                                │ │   │
│  │  │ ┌─────────────────────────────────────────────┐       │ │   │
│  │  │ │ handleReview('approve')                     │       │ │   │
│  │  │ │   ↓                                          │       │ │   │
│  │  │ │ API: PATCH /api/notices/:id/review         │       │ │   │
│  │  │ │   ↓                                          │       │ │   │
│  │  │ │ Backend creates ScheduledContent            │       │ │   │
│  │  │ │   ↓                                          │       │ │   │
│  │  │ │ Returns scheduledContentId                  │       │ │   │
│  │  │ │   ↓                                          │       │ │   │
│  │  │ │ setSchedulingDialog({ open: true })         │       │ │   │
│  │  │ └─────────────────────────────────────────────┘       │ │   │
│  │  │                                                         │ │   │
│  │  │ Scheduling Dialog (Auto-opens):                        │ │   │
│  │  │ ┌─────────────────────────────────────────────┐       │ │   │
│  │  │ │ Dialog: Configure Schedule                  │       │ │   │
│  │  │ │                                              │       │ │   │
│  │  │ │ Pre-filled:                                  │       │ │   │
│  │  │ │ - Title (from notice)                        │       │ │   │
│  │  │ │ - Content (from notice)                      │       │ │   │
│  │  │ │                                              │       │ │   │
│  │  │ │ User configures:                             │       │ │   │
│  │  │ │ - Duration (5-300 seconds)                   │       │ │   │
│  │  │ │ - Schedule Type:                             │       │ │   │
│  │  │ │   • Always Display                           │       │ │   │
│  │  │ │   • Recurring (M-S selector)                 │       │ │   │
│  │  │ │   • Fixed Time                               │       │ │   │
│  │  │ │ - Start Time / End Time                      │       │ │   │
│  │  │ │ - Days (if recurring)                        │       │ │   │
│  │  │ │ - Assigned Boards (checkboxes)               │       │ │   │
│  │  │ │                                              │       │ │   │
│  │  │ │ Actions:                                     │       │ │   │
│  │  │ │ [Skip & Publish Later] [Save & Publish]     │       │ │   │
│  │  │ └─────────────────────────────────────────────┘       │ │   │
│  │  │                                                         │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  Tab 5: MY DRAFTS                                           │   │
│  │  ┌───────────────────────────┐                              │   │
│  │  │ Draft Management          │                              │   │
│  │  │ - View saved drafts       │                              │   │
│  │  │ - Edit/Delete/Publish     │                              │   │
│  │  └───────────────────────────┘                              │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND API                                  │
│                    (Express.js + MongoDB)                            │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │  API Endpoints:
                 │
┌────────────────┴────────────────────────────────────────────────────┐
│                                                                       │
│  Notice Controller (noticeController.js)                             │
│                                                                       │
│  Key Functions:                                                      │
│                                                                       │
│  1. createNotice()                                                   │
│     POST /api/notices                                                │
│     - Creates notice with status: 'pending'                          │
│     - Handles file uploads                                           │
│     - Sends MQTT notification to admins                              │
│                                                                       │
│  2. reviewNotice() ◄─── MAIN APPROVAL FUNCTION                      │
│     PATCH /api/notices/:id/review                                    │
│     Body: { action: 'approve' | 'reject', rejectionReason? }        │
│                                                                       │
│     When action === 'approve':                                       │
│     ┌────────────────────────────────────────────────┐              │
│     │ 1. Update notice status to 'approved'          │              │
│     │ 2. Create ScheduledContent document:           │              │
│     │    {                                            │              │
│     │      title: notice.title,                      │              │
│     │      content: notice.content,                  │              │
│     │      type: 'user' | 'emergency',               │              │
│     │      priority: 1-10 (mapped from notice),      │              │
│     │      duration: 60 (default),                   │              │
│     │      schedule: {                               │              │
│     │        type: 'always',                         │              │
│     │        startTime: '00:00',                     │              │
│     │        endTime: '23:59',                       │              │
│     │        daysOfWeek: [0-6],                      │              │
│     │        frequency: 'daily'                      │              │
│     │      },                                        │              │
│     │      assignedBoards: [],                       │              │
│     │      isActive: false,                          │              │
│     │      attachments: [...mapped from notice]      │              │
│     │    }                                            │              │
│     │ 3. Save ScheduledContent to database           │              │
│     │ 4. Return scheduledContentId in response       │              │
│     └────────────────────────────────────────────────┘              │
│                                                                       │
│     Response:                                                         │
│     {                                                                 │
│       success: true,                                                 │
│       message: "Notice approved successfully",                       │
│       notice: { ... },                                               │
│       scheduledContentId: "507f1f77bcf86cd799439011" ◄── Important! │
│     }                                                                 │
│                                                                       │
│  3. scheduleAndPublishNotice()                                       │
│     PATCH /api/notices/:id/schedule-publish                          │
│     Body: {                                                           │
│       duration: 45,                                                  │
│       scheduleType: 'recurring',                                     │
│       selectedDays: [1,2,3,4,5],                                     │
│       startTime: '09:00',                                            │
│       endTime: '17:00',                                              │
│       assignedBoards: ['board1', 'board2'],                          │
│       skipScheduling: false                                          │
│     }                                                                 │
│                                                                       │
│     Function:                                                         │
│     - Finds ScheduledContent by notice title + submitter             │
│     - Updates schedule configuration                                 │
│     - Sets isActive = true                                           │
│     - Changes notice status to 'published'                           │
│     - Sends MQTT notification                                        │
│                                                                       │
│  4. getAllNotices()                                                  │
│     GET /api/notices                                                 │
│     Query params: status, priority, category, page, limit            │
│                                                                       │
│  5. getPendingNotices()                                              │
│     GET /api/notices/pending                                         │
│     Returns: notices with status === 'pending'                       │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE MODELS                              │
│                         (MongoDB/Mongoose)                           │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │  Two Main Collections:
                 │
┌────────────────┴────────────────────────────────────────────────────┐
│                                                                       │
│  Collection 1: notices                                               │
│  Model: Notice.js                                                    │
│                                                                       │
│  Schema:                                                             │
│  {                                                                    │
│    _id: ObjectId,                                                    │
│    title: String,                                                    │
│    content: String,                                                  │
│    status: 'pending' | 'approved' | 'published' | 'rejected',       │
│    priority: 'urgent' | 'high' | 'medium' | 'low',                  │
│    category: String,                                                 │
│    submittedBy: ObjectId (User),                                     │
│    approvedBy: ObjectId (User),                                      │
│    approvedAt: Date,                                                 │
│    publishedAt: Date,                                                │
│    rejectionReason: String,                                          │
│    attachments: [{                                                   │
│      filename: String,                                               │
│      originalName: String,                                           │
│      mimetype: String,                                               │
│      size: Number,                                                   │
│      url: String                                                     │
│    }],                                                               │
│    tags: [String],                                                   │
│    targetAudience: Object,                                           │
│    contentType: String,                                              │
│    driveLink: String,                                                │
│    createdAt: Date,                                                  │
│    updatedAt: Date                                                   │
│  }                                                                    │
│                                                                       │
│  Status Flow:                                                        │
│  'pending' → (approve) → 'approved' → (schedule) → 'published'      │
│           ↘ (reject) → 'rejected'                                    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  Collection 2: scheduledcontents                                     │
│  Model: ScheduledContent.js                                          │
│                                                                       │
│  Schema:                                                             │
│  {                                                                    │
│    _id: ObjectId,                                                    │
│    title: String,                                                    │
│    content: String,                                                  │
│    type: 'default' | 'user' | 'emergency',                          │
│    priority: Number (1-10),                                          │
│    duration: Number (seconds),                                       │
│    schedule: {                                                       │
│      type: 'fixed' | 'recurring' | 'always',                        │
│      startTime: String ('HH:MM'),                                    │
│      endTime: String ('HH:MM'),                                      │
│      daysOfWeek: [Number] (0-6),                                     │
│      frequency: 'daily' | 'weekly' | 'monthly',                     │
│      startDate: Date,                                                │
│      endDate: Date,                                                  │
│      exceptions: [Date],                                             │
│      timeSlots: [{ start: String, end: String }],                   │
│      playlist: [String]                                              │
│    },                                                                 │
│    assignedBoards: [ObjectId (Board)],                              │
│    createdBy: ObjectId (User),                                       │
│    isActive: Boolean, ◄── Key field: true = displaying, false = inactive │
│    lastPlayed: Date,                                                 │
│    playCount: Number,                                                │
│    attachments: [{                                                   │
│      type: 'image' | 'video' | 'document' | 'audio',                │
│      filename: String,                                               │
│      originalName: String,                                           │
│      url: String,                                                    │
│      thumbnail: String,                                              │
│      mimeType: String,                                               │
│      size: Number                                                    │
│    }],                                                               │
│    display: {                                                        │
│      template: String,                                               │
│      backgroundColor: String,                                        │
│      textColor: String                                               │
│    },                                                                 │
│    createdAt: Date,                                                  │
│    updatedAt: Date                                                   │
│  }                                                                    │
│                                                                       │
│  Lifecycle:                                                          │
│  1. Created when notice approved (isActive: false)                   │
│  2. Appears in ContentScheduler "Inactive" tab                       │
│  3. Admin configures schedule and boards                             │
│  4. Click "Save & Publish" → isActive: true                         │
│  5. Moves to "Active" tab                                            │
│  6. ContentSchedulerService executes at scheduled times              │
│  7. Displays on assigned boards                                      │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME COMMUNICATION                         │
│                         (MQTT + WebSocket)                           │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │  Events & Topics:
                 │
┌────────────────┴────────────────────────────────────────────────────┐
│                                                                       │
│  MQTT Topics:                                                        │
│                                                                       │
│  1. notices/submitted                                                │
│     Payload: { notice, submitter, timestamp }                        │
│     Subscribers: All admins                                          │
│     Trigger: User submits new notice                                 │
│                                                                       │
│  2. notices/reviewed                                                 │
│     Payload: { notice, action: 'approve'|'reject', reviewer }        │
│     Subscribers: All admins, submitter                               │
│     Trigger: Admin approves/rejects notice                           │
│                                                                       │
│  3. notices/published                                                │
│     Payload: { notice, publishedAt, boards }                         │
│     Subscribers: All users                                           │
│     Trigger: Notice status changes to 'published'                    │
│                                                                       │
│  4. notices/user/:userId                                             │
│     Payload: { type, message, noticeId }                             │
│     Subscribers: Specific user                                       │
│     Trigger: Personal notifications                                  │
│                                                                       │
│  5. scheduled_content_executed                                       │
│     Payload: { contentId, title, executedAt }                        │
│     Subscribers: Admins                                              │
│     Trigger: ContentSchedulerService executes content                │
│                                                                       │
│  WebSocket Events (Socket.IO):                                       │
│                                                                       │
│  - 'device_state_changed': Board status updates                      │
│  - 'bulk_switch_intent': Bulk operations                             │
│  - 'switch_result': Switch operation results                         │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    CONTENT EXECUTION SERVICE                         │
│                  (contentSchedulerService.js)                        │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │  Automated Execution:
                 │
┌────────────────┴────────────────────────────────────────────────────┐
│                                                                       │
│  Cron Jobs (node-cron):                                              │
│                                                                       │
│  Every minute:                                                       │
│  ┌────────────────────────────────────────────────┐                 │
│  │ checkAndExecuteContent(scheduledContent)       │                 │
│  │   ↓                                             │                 │
│  │ Query: ScheduledContent.find({ isActive: true })│                │
│  │   ↓                                             │                 │
│  │ For each content:                               │                 │
│  │   - Check current time vs schedule              │                 │
│  │   - Check current day vs daysOfWeek             │                 │
│  │   - Check exceptions (holidays)                 │                 │
│  │   ↓                                             │                 │
│  │ If shouldExecute():                             │                 │
│  │   - Send MQTT commands to assigned boards       │                 │
│  │   - Update lastPlayed timestamp                 │                 │
│  │   - Increment playCount                         │                 │
│  │   - Emit 'scheduled_content_executed' event     │                 │
│  │   - Log to ActivityLog                          │                 │
│  └────────────────────────────────────────────────┘                 │
│                                                                       │
│  Schedule Type Logic:                                                │
│                                                                       │
│  - 'always': Execute every cycle (every minute)                      │
│  - 'recurring': Check daysOfWeek + time range                        │
│  - 'fixed': Execute once on specific date/time                       │
│                                                                       │
│  Example:                                                            │
│  Content with schedule:                                              │
│  {                                                                    │
│    type: 'recurring',                                                │
│    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri                           │
│    startTime: '09:00',                                               │
│    endTime: '17:00',                                                 │
│    assignedBoards: ['board1', 'board2']                              │
│  }                                                                    │
│                                                                       │
│  Executes:                                                           │
│  - Every minute between 9 AM - 5 PM                                  │
│  - Only on weekdays (Monday to Friday)                               │
│  - Sends display command to board1 and board2                        │
│  - Content rotates based on duration (e.g., 60 seconds)              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

### **Complete Approval → Display Flow**:

```
1. USER ACTION
   User submits notice
   ↓
2. DATABASE
   Notice created (status: 'pending')
   ↓
3. MQTT NOTIFICATION
   'notices/submitted' → Admins notified
   ↓
4. ADMIN ACTION
   Admin views in kiosk preview
   Clicks "Approve"
   ↓
5. BACKEND PROCESSING
   reviewNotice() function:
   - Changes status to 'approved'
   - Creates ScheduledContent (isActive: false)
   - Returns scheduledContentId
   ↓
6. FRONTEND RESPONSE
   Scheduling dialog opens automatically
   Pre-filled with notice data
   ↓
7. ADMIN CONFIGURATION
   Sets: duration, days, times, boards
   Clicks "Save Schedule & Publish"
   ↓
8. BACKEND UPDATE
   scheduleAndPublishNotice() function:
   - Updates ScheduledContent schedule
   - Sets isActive: true
   - Assigns boards
   - Changes notice status to 'published'
   ↓
9. CONTENT SCHEDULER SERVICE
   Cron job runs every minute:
   - Checks if current time matches schedule
   - If yes, sends MQTT to assigned boards
   ↓
10. BOARDS RECEIVE & DISPLAY
    Raspberry Pi boards receive MQTT message
    Display content for configured duration
    Rotate with other content
    ↓
11. MONITORING
    - lastPlayed updated
    - playCount incremented
    - Visible in Live Preview tab
    - Analytics tracked
```

---

## Key Integration Points

### **Frontend ↔ Backend**:
- REST API calls (axios)
- MQTT subscriptions
- WebSocket connections

### **Backend ↔ Database**:
- Mongoose ODM
- Two-way data flow
- Real-time queries

### **Backend ↔ Boards**:
- MQTT pub/sub
- Command execution
- Status monitoring

### **Service ↔ Content**:
- Cron-based execution
- Schedule evaluation
- Automated display

---

This architecture ensures:
✅ Real-time updates across all components  
✅ Seamless approval-to-display flow  
✅ Flexible scheduling system  
✅ Robust error handling  
✅ Scalable design  

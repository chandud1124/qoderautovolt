# Ticket System - Complete Process Flow After Ticket Creation

## 📋 Overview
This document explains the complete process that happens after a user creates a ticket with @mentions in the system.

---

## 🔄 Complete Process Flow

### **Step 1: User Creates Ticket with Mentions**

**User Action:**
```
1. User clicks "Create Ticket" button
2. Fills in form:
   - Title: "Network Issue in Room 101"
   - Description: "WiFi not working since morning"
   - Category: "Network Issue"
   - Priority: "High"
   - Department: "IT"
   - Location: "Room 101"
3. Types @ in "Mention Users" field
4. Searches for "John" - selects John (IT Admin)
5. Searches for "Jane" - selects Jane (Network Admin)
6. Clicks "Create Ticket"
```

**Data Sent to Backend:**
```json
POST /api/tickets
{
  "title": "Network Issue in Room 101",
  "description": "WiFi not working since morning",
  "category": "network_issue",
  "priority": "high",
  "department": "IT",
  "location": "Room 101",
  "mentionedUsers": ["USER_ID_JOHN", "USER_ID_JANE"]
}
```

---

### **Step 2: Backend Processes Ticket Creation**

**What Happens in `ticketController.createTicket()`:**

#### 2.1 Validate Request
```javascript
✓ Check title, description, category are provided
✓ Validate category is in allowed list
✓ Get authenticated user from req.user
```

#### 2.2 Create Ticket Document
```javascript
const ticket = new Ticket({
  title: "Network Issue in Room 101",
  description: "WiFi not working since morning",
  category: "network_issue",
  priority: "high",
  department: "IT",
  location: "Room 101",
  mentionedUsers: ["USER_ID_JOHN", "USER_ID_JANE"],  // ← Mentioned users stored
  createdBy: "USER_ID_CREATOR",
  ticketId: "TKT-2025-0123",  // Auto-generated
  status: "open",
  comments: [{
    author: "USER_ID_CREATOR",
    authorName: "Creator Name",
    message: "Ticket created"
  }]
});

await ticket.save();  // ✓ Saved to MongoDB
```

#### 2.3 Populate References
```javascript
await ticket.populate('createdBy', 'name email role');
await ticket.populate('assignedTo', 'name email role');
await ticket.populate('deviceId', 'name location');
await ticket.populate('mentionedUsers', 'name email role');  // ← Populate mentioned users
```

**Result:**
```javascript
ticket.mentionedUsers = [
  { _id: "USER_ID_JOHN", name: "John Smith", email: "john@company.com", role: "admin" },
  { _id: "USER_ID_JANE", name: "Jane Doe", email: "jane@company.com", role: "admin" }
]
```

---

### **Step 3: Create Notifications for Mentioned Users**

**For Each Mentioned User:**

#### 3.1 Create Notification Document (John)
```javascript
const notification = new Notification({
  recipient: "USER_ID_JOHN",
  type: "ticket_mention",
  title: "You were mentioned in a ticket",
  message: "Creator Name mentioned you in ticket \"Network Issue in Room 101\"",
  priority: "high",  // ← Based on ticket priority
  relatedEntity: {
    model: "Ticket",
    id: ticket._id
  },
  metadata: {
    ticketId: "TKT-2025-0123",
    category: "network_issue",
    priority: "high"
  },
  actions: [{
    label: "View Ticket",
    action: "view_ticket",
    url: "/support"
  }],
  isRead: false,
  createdAt: new Date()
});

await notification.save();  // ✓ Saved to MongoDB
```

#### 3.2 Send Real-Time Notification (John)
```javascript
// Emit Socket.IO event to John's room
io.to("USER_ID_JOHN").emit('notification', {
  type: 'ticket_mention',
  notification: notification
});
```

**John's Browser Receives:**
```javascript
// Socket.IO listener in frontend
socket.on('notification', (data) => {
  // Show notification badge
  setUnreadCount(prev => prev + 1);
  
  // Show toast notification
  toast({
    title: "You were mentioned in a ticket",
    description: "Creator Name mentioned you in \"Network Issue in Room 101\"",
  });
  
  // Update notification list
  notifications.unshift(data.notification);
});
```

#### 3.3 Repeat for Jane
Same process repeats for Jane - notification created and Socket.IO event emitted.

---

### **Step 4: Frontend Receives Success Response**

**Response to CreateTicketDialog:**
```json
{
  "success": true,
  "data": {
    "id": "TICKET_OBJECT_ID",
    "ticketId": "TKT-2025-0123",
    "title": "Network Issue in Room 101",
    "status": "open",
    "priority": "high",
    "createdBy": {
      "name": "Creator Name",
      "email": "creator@company.com"
    },
    "mentionedUsers": [
      { "_id": "USER_ID_JOHN", "name": "John Smith", "email": "john@company.com", "role": "admin" },
      { "_id": "USER_ID_JANE", "name": "Jane Doe", "email": "jane@company.com", "role": "admin" }
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**CreateTicketDialog Actions:**
```javascript
// Show success toast
toast({
  title: "Ticket Created",
  description: "Your support ticket has been submitted successfully. Mentioned users will be notified.",
});

// Close dialog
setOpen(false);

// Reset form
setFormData({
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  mentionedUsers: []
});

// Refresh ticket list
onTicketCreated?.();  // Calls loadTickets() in parent
```

---

### **Step 5: Ticket List Refreshes**

**TicketList Component:**
```javascript
const loadTickets = async () => {
  const response = await ticketAPI.getTickets({
    status: filters.status,
    page: pagination.page,
    limit: pagination.limit
  });
  
  setTickets(response.data.data);  // ✓ New ticket appears in list
};
```

**User Sees:**
```
╔═══════════════════════════════════════════════════════════════╗
║ TKT-2025-0123 | Network Issue in Room 101                     ║
║ Status: [Open] | Priority: [High] | Created: Just now         ║
║ Created By: Creator Name                                       ║
║ Mentioned: @John Smith @Jane Doe                              ║
╚═══════════════════════════════════════════════════════════════╝
```

---

### **Step 6: Mentioned Users See Notifications**

#### John's View:
**Notification Bell:**
```
🔔 [1]  ← Red badge with count
```

**Clicks Bell → Sees:**
```
╔════════════════════════════════════════════════════════════╗
║ 🔔 You were mentioned in a ticket                          ║
║ Creator Name mentioned you in "Network Issue in Room 101"  ║
║ 5 minutes ago                            [View Ticket] →   ║
╚════════════════════════════════════════════════════════════╝
```

**Clicks "View Ticket" → Opens Support Page:**
- Navigates to `/support` page
- Can see the ticket in the list
- Can click to view full details
- Notification marked as read
- Badge count decreases

---

## 🔄 What Happens When Ticket Status Changes

### **Scenario: Admin Updates Ticket Status**

#### User Action:
```
1. Admin opens ticket "TKT-2025-0123"
2. Clicks "Start Processing" button
3. Status changes: Open → In Progress
```

#### Backend Process:
```javascript
PUT /api/tickets/TKT-2025-0123
{
  "status": "in_progress",
  "comment": "Started working on this issue"
}
```

#### updateTicket() Function:

**1. Track Status Change:**
```javascript
const oldStatus = "open";
const newStatus = "in_progress";
const statusChanged = true;
```

**2. Update Ticket:**
```javascript
ticket.status = "in_progress";
ticket.comments.push({
  author: ADMIN_ID,
  authorName: "Admin Name",
  message: "Status changed to In Progress - Started working on this issue"
});
await ticket.save();
```

**3. Build Notification Recipient List:**
```javascript
const usersToNotify = new Set();

// Add ticket creator
usersToNotify.add("USER_ID_CREATOR");

// Add assignee (if exists)
if (ticket.assignedTo) {
  usersToNotify.add("USER_ID_ASSIGNEE");
}

// Add all mentioned users
usersToNotify.add("USER_ID_JOHN");
usersToNotify.add("USER_ID_JANE");

// Remove admin who made the change (don't notify yourself)
usersToNotify.delete(ADMIN_ID);

// Result: [USER_ID_CREATOR, USER_ID_JOHN, USER_ID_JANE]
```

**4. Create Notifications for Each User:**
```javascript
for each userId in usersToNotify:
  
  const notification = new Notification({
    recipient: userId,
    type: "ticket_status_change",
    title: "Ticket status updated to In Progress",
    message: "Admin Name changed the status of ticket \"Network Issue in Room 101\" from Open to In Progress",
    priority: "medium",
    relatedEntity: { model: "Ticket", id: ticket._id },
    metadata: {
      ticketId: "TKT-2025-0123",
      oldStatus: "open",
      newStatus: "in_progress",
      updatedBy: "Admin Name"
    },
    actions: [{
      label: "View Ticket",
      action: "view_ticket",
      url: "/support"
    }]
  });
  
  await notification.save();
  
  // Emit real-time notification
  io.to(userId).emit('notification', {
    type: 'ticket_status_change',
    notification: notification
  });
```

**5. All Users Receive Notification:**
- **Creator**: Sees "Status changed from Open to In Progress"
- **John**: Sees "Status changed from Open to In Progress"
- **Jane**: Sees "Status changed from Open to In Progress"
- **Admin**: Does NOT receive notification (made the change)

---

## 📊 Complete Timeline Example

### Real-World Scenario:

```
10:00 AM - Creator creates ticket, mentions John & Jane
          ↓
          ├─ Ticket TKT-2025-0123 created in database
          ├─ Notification created for John
          ├─ Notification created for Jane
          ├─ Socket.IO event sent to John
          └─ Socket.IO event sent to Jane

10:00 AM - John & Jane see notification bell light up [1]

10:05 AM - John clicks notification, views ticket

10:10 AM - Admin sees ticket, changes status to "In Progress"
          ↓
          ├─ Ticket status updated in database
          ├─ Notification created for Creator
          ├─ Notification created for John
          ├─ Notification created for Jane
          ├─ Socket.IO events sent to all 3
          └─ Admin does NOT get notified

10:10 AM - Creator, John, Jane see new notification [2]

11:30 AM - Admin resolves ticket, changes status to "Resolved"
          ↓
          ├─ Ticket status updated
          ├─ resolvedAt timestamp set
          └─ Notifications sent to all involved users

11:30 AM - All users notified: "Ticket resolved"

12:00 PM - Admin closes ticket, changes status to "Closed"
          ↓
          ├─ Ticket status updated
          ├─ closedAt timestamp set
          └─ Final notifications sent

12:00 PM - All users receive final notification: "Ticket closed"
```

---

## 🎯 Key Process Points

### **Automatic Notifications Sent On:**
1. ✅ **Ticket Created** → All mentioned users notified
2. ✅ **Status Changed** → Creator + Assignee + Mentioned users notified
3. ✅ **Ticket Assigned** → Newly assigned user notified
4. ✅ **Comment Added** → (Future: Can notify mentioned users in comments)

### **Who Gets Notified:**
| Event | Creator | Assignee | Mentioned Users | Admin Who Made Change |
|-------|---------|----------|-----------------|----------------------|
| Ticket Created | ✗ | ✗ | ✅ | ✗ |
| Status Changed | ✅ | ✅ | ✅ | ✗ (excluded) |
| Ticket Assigned | ✗ | ✅ (new assignee) | ✗ | ✗ |

### **Notification Methods:**
1. **Real-Time:** Socket.IO events (instant)
2. **Persistent:** Saved in database (for offline users)
3. **Future:** Email notifications (can be added)

---

## 🔍 Database State After Ticket Creation

### Tickets Collection:
```javascript
{
  _id: ObjectId("..."),
  ticketId: "TKT-2025-0123",
  title: "Network Issue in Room 101",
  description: "WiFi not working since morning",
  category: "network_issue",
  priority: "high",
  status: "open",
  createdBy: ObjectId("USER_ID_CREATOR"),
  assignedTo: null,
  mentionedUsers: [
    ObjectId("USER_ID_JOHN"),
    ObjectId("USER_ID_JANE")
  ],
  department: "IT",
  location: "Room 101",
  tags: [],
  comments: [
    {
      author: ObjectId("USER_ID_CREATOR"),
      authorName: "Creator Name",
      message: "Ticket created",
      createdAt: ISODate("2025-01-15T10:00:00Z")
    }
  ],
  createdAt: ISODate("2025-01-15T10:00:00Z"),
  updatedAt: ISODate("2025-01-15T10:00:00Z")
}
```

### Notifications Collection:
```javascript
// Notification 1 (for John)
{
  _id: ObjectId("..."),
  recipient: ObjectId("USER_ID_JOHN"),
  type: "ticket_mention",
  title: "You were mentioned in a ticket",
  message: "Creator Name mentioned you in ticket \"Network Issue in Room 101\"",
  priority: "high",
  isRead: false,
  relatedEntity: {
    model: "Ticket",
    id: ObjectId("TICKET_ID")
  },
  metadata: {
    ticketId: "TKT-2025-0123",
    category: "network_issue",
    priority: "high"
  },
  actions: [
    {
      label: "View Ticket",
      action: "view_ticket",
      url: "/support"
    }
  ],
  createdAt: ISODate("2025-01-15T10:00:00Z")
}

// Notification 2 (for Jane) - similar structure
```

---

## 🎨 User Experience Flow

### **For Ticket Creator:**
```
1. Creates ticket → "Ticket Created Successfully" toast
2. Dialog closes → Ticket list refreshes
3. New ticket appears at top of list
4. Can click to view details
5. Status badge shows "Open"
6. Mentioned users visible as badges
```

### **For Mentioned Users (John & Jane):**
```
1. Working on other tasks
2. Notification bell lights up with [1]
3. Toast appears (if enabled): "You were mentioned..."
4. Click bell → See notification
5. Click "View Ticket" → Navigate to support page
6. See ticket details
7. Can add comments, view progress
8. Notification marked as read
9. Receive updates when status changes
```

### **For Admins:**
```
1. See new ticket in list
2. Can assign to technician
3. Can change status
4. Can add internal notes
5. All actions notify relevant users
6. Track ticket progress
```

---

## 🔔 Notification Display

### In Notification Panel:
```
╔═══════════════════════════════════════════════════════════╗
║ 🔔 Notifications (3 Unread)                               ║
╠═══════════════════════════════════════════════════════════╣
║ ● You were mentioned in a ticket                          ║
║   Creator Name mentioned you in "Network Issue..."        ║
║   5 minutes ago                      [View Ticket] →      ║
╟───────────────────────────────────────────────────────────╢
║ ● Ticket status updated to In Progress                    ║
║   Admin changed status from Open to In Progress           ║
║   2 hours ago                        [View Ticket] →      ║
╟───────────────────────────────────────────────────────────╢
║ ○ Ticket status updated to Resolved                       ║
║   Admin marked ticket as resolved                         ║
║   Yesterday                          [View Ticket] →      ║
╚═══════════════════════════════════════════════════════════╝

● = Unread (bold)
○ = Read (gray)
```

---

## 📱 Real-Time vs Offline

### **User Online (Socket.IO Connected):**
```
✅ Instant notification via Socket.IO
✅ Toast notification appears
✅ Notification bell updates immediately
✅ Notification list updates in real-time
```

### **User Offline (Not Connected):**
```
✅ Notification saved in database
✅ Bell shows count when user returns
✅ Notification list populated on login
⏳ Socket.IO reconnects automatically
✅ No notifications lost
```

---

## 🎯 Summary

**After creating a ticket with mentions, here's what happens:**

1. **Immediate** (< 1 second):
   - Ticket saved to database ✓
   - Notifications created for mentioned users ✓
   - Socket.IO events emitted ✓
   - Success toast shown to creator ✓

2. **Within seconds**:
   - Mentioned users see notification bell light up ✓
   - Ticket appears in ticket list ✓
   - Real-time updates propagated ✓

3. **Ongoing**:
   - Status changes trigger new notifications ✓
   - All involved users stay informed ✓
   - Complete audit trail maintained ✓

**Result:** Professional, transparent, real-time ticket management system where everyone stays informed! 🎉

---

For more details, see:
- [TICKET_MENTION_SYSTEM.md](./TICKET_MENTION_SYSTEM.md) - Full documentation
- [TICKET_MENTION_QUICK_REFERENCE.md](./TICKET_MENTION_QUICK_REFERENCE.md) - Quick reference

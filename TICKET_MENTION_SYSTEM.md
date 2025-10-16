# Ticket Mention System - User Tagging & Notifications

## Overview
The ticket system now includes a professional user mention feature that allows users to tag other users using the `@` symbol (similar to social media platforms). Mentioned users receive real-time notifications when they're tagged in tickets and when ticket statuses change.

## Features

### 1. User Mentions with @ Symbol
- Type `@` in the mention field to trigger user search
- Real-time autocomplete dropdown shows matching users
- Search by name or email
- Displays user role and department for context
- Visual badges show mentioned users
- Maximum 10 mentions per ticket

### 2. Smart Notification System
The system automatically sends notifications for:

#### On Ticket Creation with Mentions
- All mentioned users receive a notification
- Notification includes ticket title, priority, and category
- Link to view the ticket

#### On Ticket Status Changes
- Ticket creator receives notification
- Assigned user receives notification
- All mentioned users receive notification
- Shows old status → new status transition
- Includes who made the change

#### On Ticket Assignment
- Newly assigned user receives a notification
- Notification indicates who assigned the ticket
- Includes ticket priority for urgency awareness

### 3. Notification Types
- **ticket_mention**: When tagged in a new ticket
- **ticket_status_change**: When ticket status is updated
- **ticket_assigned**: When ticket is assigned to you

## Implementation Details

### Frontend Components

#### MentionInput Component (`src/components/ui/MentionInput.tsx`)
```typescript
Features:
- @ trigger detection
- Debounced user search (300ms)
- Keyboard navigation (↑↓ arrows, Enter, Escape)
- Click outside to close
- Visual user badges with removal
- Loading states
- Empty states
```

#### CreateTicketDialog Updates
- Replaced tags input with MentionInput
- Extracts user IDs before API submission
- Shows confirmation toast with notification info
- Resets form after successful creation

#### TicketList Updates
- Added `mentionedUsers` to Ticket interface
- Displays mentioned users in ticket details
- Shows user badges with roles
- Maintains tags for backward compatibility

### Backend Implementation

#### Models

**Notification.js** - Added notification types:
```javascript
'ticket_mention',        // User tagged in ticket
'ticket_status_change',  // Ticket status updated
'ticket_assigned'        // Ticket assigned to user
```

**Ticket.js** - Added mentioned users field:
```javascript
mentionedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
}]
```

#### Controllers

**ticketController.js - createTicket()**
- Accepts `mentionedUsers` array
- Validates and filters user IDs
- Creates notifications for each mentioned user
- Populates mentionedUsers in response
- Emits real-time Socket.IO events

**ticketController.js - updateTicket()**
- Tracks status changes
- Builds notification recipient list:
  * Ticket creator
  * Assigned user
  * All mentioned users
- Excludes the user making the change
- Creates notifications for all recipients
- Sends assignment notifications separately
- Emits real-time Socket.IO events

### API Endpoints

**GET /api/users** - Search users for mentions
- Query params: `search`, `limit`, `role`, `department`
- Returns: User list with name, email, role
- Used for mention autocomplete

**POST /api/tickets** - Create ticket with mentions
```json
{
  "title": "Issue title",
  "description": "Issue description",
  "category": "technical_issue",
  "priority": "high",
  "mentionedUsers": ["userId1", "userId2"]
}
```

**PUT /api/tickets/:id** - Update ticket status
- Automatically notifies all relevant users
- Creates notification records
- Sends real-time Socket.IO events

## User Experience

### Creating a Ticket with Mentions

1. Click "Create Ticket" button
2. Fill in ticket details (title, description, category, priority)
3. In the "Mention Users" section:
   - Type `@` or click the @ button
   - Start typing a user's name or email
   - Select from the autocomplete dropdown
   - Or use arrow keys and press Enter
4. Mentioned users appear as badges below
5. Click X on any badge to remove a mention
6. Submit the ticket
7. Mentioned users immediately receive notifications

### Receiving Notifications

When mentioned in a ticket:
- Real-time notification appears in notification bell
- Notification shows ticket title and who mentioned you
- Click "View Ticket" to see details
- Notification marked as read when viewed

When ticket status changes:
- All involved users (creator, assignee, mentioned) get notified
- Shows old status → new status
- Indicates who made the change
- Priority indicator helps with urgency

### Viewing Mentioned Users

In ticket details dialog:
- "Mentioned Users" section appears after tags
- Shows user badges with names
- Displays role in parentheses
- Visual @ icon for clarity

## Technical Architecture

### Data Flow

```
1. User types @ in MentionInput
2. Component calls usersAPI.searchUsersForMention()
3. Backend GET /api/users returns matching users
4. Dropdown displays results
5. User selects from dropdown
6. Component adds to mentionedUsers array
7. On submit, IDs extracted and sent to API
8. Backend creates ticket with mentionedUsers
9. Backend creates notification for each mentioned user
10. Socket.IO emits real-time notification
11. Frontend receives and displays notification
```

### Notification Creation Logic

```javascript
// On Mention
for each mentionedUser:
  Create Notification {
    recipient: userId
    type: 'ticket_mention'
    title: 'You were mentioned in a ticket'
    message: '{userName} mentioned you in "{ticketTitle}"'
    priority: based on ticket priority
    relatedEntity: ticket reference
    actions: [{ label: 'View Ticket', url: '/support' }]
  }
  Emit Socket.IO event to userId

// On Status Change
recipients = Set(createdBy, assignedTo, ...mentionedUsers)
recipients.delete(currentUser) // Don't notify yourself
for each recipient:
  Create Notification {
    recipient: userId
    type: 'ticket_status_change'
    title: 'Ticket status updated to {newStatus}'
    message: '{userName} changed ticket "{title}" from {oldStatus} to {newStatus}'
    priority: based on status (resolved/closed = low, others = medium)
    metadata: { ticketId, oldStatus, newStatus, updatedBy }
    actions: [{ label: 'View Ticket', url: '/support' }]
  }
  Emit Socket.IO event to userId
```

## Database Schema

### Ticket Model
```javascript
{
  mentionedUsers: [{
    type: ObjectId,
    ref: 'User'
  }],
  // ... other fields
}
```

### Notification Model
```javascript
{
  recipient: ObjectId (User),
  type: String (enum: [..., 'ticket_mention', 'ticket_status_change', 'ticket_assigned']),
  title: String,
  message: String,
  priority: String (enum: ['low', 'medium', 'high', 'urgent']),
  isRead: Boolean (default: false),
  relatedEntity: {
    model: String,
    id: ObjectId
  },
  metadata: Mixed,
  actions: [{
    label: String,
    action: String,
    url: String
  }],
  // ... other fields
}
```

## Configuration

### Frontend Configuration
No additional configuration needed. The mention system uses existing:
- User API endpoints
- Notification system
- Socket.IO connection

### Backend Configuration
Ensure Socket.IO is properly configured:
```javascript
// server.js
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

// Store io instance for controllers
app.set('io', io);
```

## Testing

### Manual Testing Checklist

**Mention System:**
- [ ] Type @ to trigger dropdown
- [ ] Search users by name
- [ ] Search users by email  
- [ ] Select user with mouse
- [ ] Select user with keyboard (arrow keys + Enter)
- [ ] Remove mentioned user by clicking X
- [ ] Try to add more than 10 users (should prevent)
- [ ] Submit ticket with mentions
- [ ] Verify mentioned users saved in database

**Notifications - Mention:**
- [ ] Create ticket with mentions
- [ ] Verify mentioned users receive notification
- [ ] Check notification title and message
- [ ] Click "View Ticket" link
- [ ] Mark notification as read

**Notifications - Status Change:**
- [ ] Change ticket status as admin
- [ ] Verify ticket creator receives notification
- [ ] Verify assigned user receives notification
- [ ] Verify mentioned users receive notification
- [ ] Verify user who made change doesn't receive notification
- [ ] Check notification shows old → new status

**Notifications - Assignment:**
- [ ] Assign ticket to user
- [ ] Verify assigned user receives notification
- [ ] Check notification includes priority

**UI/UX:**
- [ ] Mentioned users display in ticket details
- [ ] User badges show names and roles
- [ ] @ icon visible in input
- [ ] Loading state while searching
- [ ] Empty state when no users found
- [ ] Keyboard navigation works smoothly

### API Testing

**Test Mention Creation:**
```bash
POST /api/tickets
{
  "title": "Test Ticket",
  "description": "Testing mentions",
  "category": "technical_issue",
  "priority": "medium",
  "mentionedUsers": ["USER_ID_1", "USER_ID_2"]
}
```

**Verify Response:**
```json
{
  "success": true,
  "data": {
    "ticketId": "TKT-2025-0001",
    "mentionedUsers": [
      { "_id": "USER_ID_1", "name": "John Doe", "email": "john@example.com" },
      { "_id": "USER_ID_2", "name": "Jane Smith", "email": "jane@example.com" }
    ]
  }
}
```

**Test Notification Creation:**
```bash
# Check notifications for mentioned user
GET /api/auth/notifications?unreadOnly=true

# Should return:
{
  "data": [{
    "type": "ticket_mention",
    "title": "You were mentioned in a ticket",
    "message": "User X mentioned you in ticket \"Test Ticket\"",
    "isRead": false
  }]
}
```

## Security Considerations

1. **Authorization:** Only authenticated users can mention others
2. **Validation:** User IDs validated before creating notifications
3. **Privacy:** User search respects role-based access control
4. **Rate Limiting:** Consider implementing rate limits for mention searches
5. **Notification Spam:** Maximum 10 mentions per ticket prevents abuse

## Performance Optimization

1. **Debounced Search:** 300ms delay prevents excessive API calls
2. **Limited Results:** Search returns maximum 20 users
3. **Filtered Results:** Already mentioned users excluded from dropdown
4. **Batch Notifications:** All notifications created in parallel with Promise.all
5. **Indexed Queries:** Database indexes on recipient, isRead, createdAt

## Future Enhancements

### Planned Features
- [ ] Mention users in ticket comments
- [ ] @everyone mention for urgent issues
- [ ] Mention user groups/teams
- [ ] Email notifications for mentions
- [ ] Notification preferences per user
- [ ] Mention history/analytics
- [ ] Rich text editor with inline @ mentions
- [ ] Push notifications for mobile

### Potential Improvements
- Emoji support in mentions
- User avatars in mention dropdown
- Recently mentioned users quick list
- Mention suggestions based on ticket category
- Smart notifications (digest for multiple mentions)

## Troubleshooting

### Common Issues

**Dropdown not appearing:**
- Check browser console for API errors
- Verify GET /api/users endpoint is accessible
- Ensure user has permission to search users

**Notifications not received:**
- Check Socket.IO connection status
- Verify notification created in database
- Check browser notification permissions
- Verify Socket.IO room subscription

**Mentioned users not saved:**
- Check browser console for validation errors
- Verify mentionedUsers field in API request
- Check backend logs for save errors

**Search returns no results:**
- Verify users exist in database
- Check search query parameters
- Review role-based access control rules

## Support

For issues or questions about the mention system:
1. Check this documentation
2. Review browser console for errors
3. Check backend logs for API errors
4. Verify Socket.IO connection
5. Test with curl/Postman to isolate issues

## Changelog

### Version 1.0.0 (January 2025)
- Initial implementation of @ mention system
- User search with autocomplete
- Notification on mention
- Notification on status change
- Notification on assignment
- MentionInput component with keyboard navigation
- Integration with existing notification system
- Support for up to 10 mentions per ticket

## Related Documentation
- [TICKET_SYSTEM_GUIDE.md](./TICKET_SYSTEM_GUIDE.md) - General ticket system documentation
- [TICKET_SYSTEM_ENHANCEMENTS.md](./TICKET_SYSTEM_ENHANCEMENTS.md) - Professional workflow features
- [PERMISSION_SYSTEM_README.md](./PERMISSION_SYSTEM_README.md) - User roles and permissions

---

**Implementation Complete** ✅  
The mention system is fully integrated and ready for testing. All mentioned users will receive notifications when tagged in tickets and when ticket statuses change.

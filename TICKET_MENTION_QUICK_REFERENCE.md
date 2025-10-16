# Ticket Mention System - Quick Reference

## 🚀 Quick Start

### For Users

**Creating a Ticket with Mentions:**
1. Click "Create Ticket" button
2. Fill in title, description, category, priority
3. Scroll to "Mention Users (Optional)" section
4. Type `@` or click the @ button
5. Start typing a name/email → select from dropdown
6. Repeat for more users (max 10)
7. Click "Create Ticket"
8. ✅ Mentioned users receive instant notifications

**Receiving a Notification:**
1. Bell icon shows unread count
2. Click bell to view notifications
3. Click "View Ticket" to see details
4. Notification marked as read

### For Developers

**Frontend Usage:**
```typescript
import { MentionInput } from '@/components/ui/MentionInput';
import { usersAPI } from '@/services/api';

<MentionInput
  mentionedUsers={mentionedUsers}
  onMentionedUsersChange={setMentionedUsers}
  onSearchUsers={async (query) => {
    const response = await usersAPI.searchUsersForMention(query);
    return response.data?.data || [];
  }}
/>
```

**Backend API:**
```javascript
// Create ticket with mentions
POST /api/tickets
{
  "title": "Issue title",
  "mentionedUsers": ["userId1", "userId2"]
}

// Notifications automatically created for:
// - Each mentioned user (ticket_mention)
// - Creator + assignee + mentioned users on status change (ticket_status_change)
```

## 📦 Implementation Checklist

### Files Modified (6)
- [x] `src/components/CreateTicketDialog.tsx` - Mention input integration
- [x] `src/components/TicketList.tsx` - Display mentioned users
- [x] `src/services/api.ts` - User search API
- [x] `backend/models/Notification.js` - Notification types
- [x] `backend/models/Ticket.js` - mentionedUsers field
- [x] `backend/controllers/ticketController.js` - Notification logic

### Files Created (3)
- [x] `src/components/ui/MentionInput.tsx` - Mention component
- [x] `TICKET_MENTION_SYSTEM.md` - Full documentation
- [x] `TICKET_MENTION_IMPLEMENTATION.md` - Implementation summary

## 🔔 Notification Triggers

| Event | Who Gets Notified | Notification Type |
|-------|-------------------|-------------------|
| **Ticket Created with Mentions** | All mentioned users | `ticket_mention` |
| **Ticket Status Changed** | Creator + Assignee + Mentioned users (not the changer) | `ticket_status_change` |
| **Ticket Assigned** | Newly assigned user | `ticket_assigned` |

## 🎨 Component Props

### MentionInput
```typescript
interface MentionInputProps {
  mentionedUsers: User[];              // Current mentioned users
  onMentionedUsersChange: (users: User[]) => void;  // Update callback
  onSearchUsers: (query: string) => Promise<User[]>; // Search function
  placeholder?: string;                 // Input placeholder
  label?: string;                      // Field label
  maxMentions?: number;                // Max mentions (default: 10)
}
```

## 🔧 API Endpoints

### Frontend
```typescript
// Search users for mentions
usersAPI.searchUsersForMention(query: string)
// Returns: User[] with name, email, role

// Get all users (with filters)
usersAPI.getAllUsers(params?: { search, role, department, limit })
```

### Backend
```javascript
// User search (existing endpoint)
GET /api/users?search=query&limit=20

// Create ticket (updated)
POST /api/tickets
Body: { mentionedUsers: string[] }

// Update ticket (unchanged)
PUT /api/tickets/:id
// Automatically sends notifications on status change
```

## 🗄️ Database Schema

### Ticket
```javascript
{
  mentionedUsers: [ObjectId], // References User model
  // ... other fields
}
```

### Notification
```javascript
{
  recipient: ObjectId,
  type: 'ticket_mention' | 'ticket_status_change' | 'ticket_assigned',
  title: String,
  message: String,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  relatedEntity: { model: 'Ticket', id: ObjectId },
  actions: [{ label: String, url: String }]
}
```

## 🧪 Testing Commands

### Test User Search
```bash
curl -X GET 'http://localhost:3001/api/users?search=john&limit=20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Test Ticket Creation
```bash
curl -X POST 'http://localhost:3001/api/tickets' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Ticket",
    "description": "Testing mentions",
    "category": "technical_issue",
    "priority": "medium",
    "mentionedUsers": ["USER_ID_1", "USER_ID_2"]
  }'
```

### Check Notifications
```bash
curl -X GET 'http://localhost:3001/api/auth/notifications?unreadOnly=true' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## 🐛 Troubleshooting

### Dropdown Not Showing
```javascript
// Check:
1. API endpoint accessible: GET /api/users
2. Browser console for errors
3. Network tab for 200 response
4. User has search permissions
```

### Notifications Not Received
```javascript
// Check:
1. Socket.IO connection status
2. Database: Notification documents created
3. Browser console for Socket.IO errors
4. User in correct Socket.IO room
```

### Mentioned Users Not Saved
```javascript
// Check:
1. mentionedUsers in request payload
2. Backend logs for save errors
3. User IDs valid and exist
4. Ticket model has mentionedUsers field
```

## 📊 Performance Tips

### Optimize Search
```javascript
// Already implemented:
- Debounced search (300ms)
- Limited results (20 users)
- Filtered duplicates
- Indexed queries
```

### Optimize Notifications
```javascript
// Already implemented:
- Parallel creation (Promise.all)
- Error handling (no blocking)
- Filtered recipients (no self-notify)
- Efficient Socket.IO rooms
```

## 🎓 Code Examples

### Example 1: Basic Mention
```typescript
const [mentionedUsers, setMentionedUsers] = useState<User[]>([]);

<MentionInput
  mentionedUsers={mentionedUsers}
  onMentionedUsersChange={setMentionedUsers}
  onSearchUsers={async (query) => {
    const res = await usersAPI.searchUsersForMention(query);
    return res.data?.data || [];
  }}
/>
```

### Example 2: Custom Validation
```typescript
const handleSubmit = () => {
  if (mentionedUsers.length === 0) {
    toast({
      title: "No Mentions",
      description: "Consider mentioning relevant team members",
      variant: "default"
    });
  }
  // Continue with submission...
};
```

### Example 3: Display Mentioned Users
```typescript
{ticket.mentionedUsers?.map(user => (
  <Badge key={user._id} variant="secondary">
    <User className="w-3 h-3 mr-1" />
    {user.name}
  </Badge>
))}
```

## 🔐 Security Notes

- ✅ Role-based user search
- ✅ Authenticated endpoints only
- ✅ Validated user IDs
- ✅ Max 10 mentions (spam prevention)
- ✅ Private Socket.IO rooms

## 📈 Monitoring

### Key Metrics to Track
1. **Mention Usage:** % of tickets with mentions
2. **Notification Delivery:** Success rate
3. **Response Time:** Avg time to notification
4. **User Engagement:** Notification click rate

### Health Checks
```bash
# Check Socket.IO connections
io.sockets.sockets.size

# Check pending notifications
db.notifications.countDocuments({ isRead: false })

# Check mention usage
db.tickets.aggregate([
  { $match: { mentionedUsers: { $ne: [] } } },
  { $count: "ticketsWithMentions" }
])
```

## 📞 Quick Support

**Common Issues:**

1. **"@ not showing dropdown"**
   - Solution: Check API connectivity, verify auth token

2. **"Can't find users"**
   - Solution: Verify users exist, check search permissions

3. **"Notifications not appearing"**
   - Solution: Check Socket.IO connection, refresh page

4. **"Can't mention more users"**
   - Solution: 10 user limit by design, remove some to add more

## 📚 Related Docs

- [TICKET_MENTION_SYSTEM.md](./TICKET_MENTION_SYSTEM.md) - Complete documentation
- [TICKET_MENTION_IMPLEMENTATION.md](./TICKET_MENTION_IMPLEMENTATION.md) - Implementation details
- [TICKET_SYSTEM_GUIDE.md](./TICKET_SYSTEM_GUIDE.md) - General ticket system
- [TICKET_SYSTEM_ENHANCEMENTS.md](./TICKET_SYSTEM_ENHANCEMENTS.md) - Workflow features

---

## ✅ Status: PRODUCTION READY

All features implemented and documented. Ready for testing and deployment.

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Author:** Development Team

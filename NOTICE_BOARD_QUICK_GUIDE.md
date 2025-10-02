# Notice Board Quick Reference Guide

## 🎨 Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOTICE BOARD WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────┘

1. SUBMIT NOTICE
   ┌──────────────────────────┐
   │  ✏️ Notice Submission     │
   │  • Title                  │
   │  • Content                │
   │  • Upload Images 📷       │
   │  • Select Category        │
   │  [Submit Button]          │
   └──────────────────────────┘
            ↓
   Status: pending
   MQTT → Admins notified 🔔
            ↓

2. ADMIN REVIEWS (Kiosk Preview)
   ┌──────────────────────────────────────┐
   │  👁️ KIOSK PREVIEW                    │
   │  ┌────────────────────────────────┐  │
   │  │ 📋 Notice Title                │  │
   │  │                                │  │
   │  │ Notice content here...         │  │
   │  │                                │  │
   │  │ [Large Image Display 500px]    │  │
   │  │                                │  │
   │  └────────────────────────────────┘  │
   │                                      │
   │  [✏️ Edit] [✅ Approve] [❌ Reject]  │
   └──────────────────────────────────────┘
            ↓
   Click "Approve" ✅
            ↓

3. SCHEDULING DIALOG (AUTO-OPENS! ⚡)
   ┌────────────────────────────────────────────────┐
   │  ⚙️ Configure Schedule                         │
   │                                                 │
   │  Duration: [60] seconds                        │
   │                                                 │
   │  Schedule Type: [Recurring ▼]                  │
   │                                                 │
   │  Days: [Mon] [Tue] [Wed] [Thu] [Fri] Sat  Sun │
   │                                                 │
   │  Time: [09:00] to [17:00]                      │
   │                                                 │
   │  Assign Boards:                                │
   │  ☑️ Main Entrance Display                      │
   │  ☑️ Cafeteria Screen                           │
   │  ☐ Library Display                             │
   │                                                 │
   │  [Skip & Publish Later] [Save Schedule & Publish] │
   └────────────────────────────────────────────────┘
            ↓
   If "Skip" clicked → Goes to Inactive
   If "Save" clicked → Goes to Active
            ↓

4. CONTENT SCHEDULER TAB

   ┌─────────────────────────────────────────────┐
   │  📋 Content Scheduler                       │
   │  ┌──────────────────────────────────────┐  │
   │  │ [Active] [Inactive] [All]            │  │
   │  └──────────────────────────────────────┘  │
   └─────────────────────────────────────────────┘

   A) INACTIVE CONTENT (NEW! 🎉)
   ┌────────────────────────────────────────────────────────┐
   │ 📋 My Important Notice              [INACTIVE] 🟠      │
   │ Priority: 5  ⏱️ 60s  📅 Mon-Fri 9-5  📺 2 boards      │
   │                                                         │
   │ This is my notice content that needs to be...          │
   │                                                         │
   │ [👁️ Preview] [✏️ Edit] [🗑️ Delete] [▶️ Publish]      │
   └────────────────────────────────────────────────────────┘
   
   • Click "Edit" → Opens schedule configuration dialog
   • Click "Preview" → Shows full content preview
   • Click "Delete" → Removes content
   • Click "Publish" → Activates and displays on boards
            ↓
   Click "Publish" ▶️
            ↓

   B) ACTIVE CONTENT
   ┌────────────────────────────────────────────────────────┐
   │ 📋 My Important Notice              [ACTIVE] 🟢        │
   │ Priority: 5  ⏱️ 60s  📅 Mon-Fri 9-5  Played: 45 times │
   │                                                         │
   │ This is my notice content that needs to be...          │
   │                                                         │
   │ [👁️ Preview] [✏️ Edit] [🗑️ Delete] [⏸️ Pause]        │
   └────────────────────────────────────────────────────────┘
   
   • Now displaying on assigned boards!
   • Play count increases automatically
   • Can pause, edit, or delete anytime
            ↓

5. RASPBERRY PI DISPLAY 🖥️

   Backend API Response:
   ```json
   {
     "scheduledContent": [{
       "title": "My Important Notice",
       "content": "Content here...",
       "duration": 60,
       "attachments": [{
         "url": "http://server:3001/uploads/media/photo.jpg"
                 ↑↑↑ FULL URL! (Fixed! ✅)
       }]
     }]
   }
   ```
            ↓
   Raspberry Pi Downloads Images:
   ┌──────────────────────────────────────┐
   │  🖥️ Raspberry Pi Display            │
   │  ┌────────────────────────────────┐  │
   │  │                                │  │
   │  │  📋 My Important Notice        │  │
   │  │                                │  │
   │  │  This is the notice content... │  │
   │  │                                │  │
   │  │  [Image Displayed 📷]          │  │
   │  │                                │  │
   │  └────────────────────────────────┘  │
   │                                      │
   │  Displaying for 60 seconds...        │
   └──────────────────────────────────────┘
   
   Images stored locally:
   /var/lib/raspberry-display/content/abc123.jpg ✅

```

---

## 🎯 Key Changes Summary

### **BEFORE** ❌
```
Inactive Content Tab:
┌─────────────────────────────┐
│ Notice Title                │
│ Content preview...          │
│                             │
│ [▶️ Play]                   │  ← Only one button!
└─────────────────────────────┘
```

### **AFTER** ✅
```
Inactive Content Tab:
┌───────────────────────────────────────────────┐
│ 📋 Notice Title              [INACTIVE] 🟠    │
│ Priority: 5  ⏱️ 60s  📅 Mon-Fri  📺 2 boards │
│                                               │
│ Content preview text here...                  │
│                                               │
│ [👁️ Preview] [✏️ Edit] [🗑️ Delete] [▶️ Publish] │
└───────────────────────────────────────────────┘
```

---

## 🔍 Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| **Edit Inactive Content** | ❌ Not available | ✅ Full edit dialog |
| **Preview Content** | ❌ No preview | ✅ Kiosk-style preview |
| **Delete Before Publishing** | ❌ Had to activate first | ✅ Direct delete |
| **Schedule Configuration** | ❌ Manual, confusing | ✅ Auto-opens after approval |
| **Visual Distinction** | ❌ Same as active | ✅ Orange highlight + badge |
| **Board Assignment Info** | ❌ Hidden | ✅ Shows count visibly |
| **Image URLs** | ❌ Relative paths | ✅ Full URLs with server |
| **Raspberry Pi Download** | ❌ Failed often | ✅ Smart caching + retry |

---

## 🎮 Button Actions Guide

### **Inactive Content Buttons**:
- **👁️ Preview** - View content in full-screen preview mode
- **✏️ Edit** - Modify schedule, duration, days, boards
- **🗑️ Delete** - Permanently remove content
- **▶️ Publish** - Activate and start displaying (turns green)

### **Active Content Buttons**:
- **👁️ Preview** - View content with playback stats
- **✏️ Edit** - Modify settings (will pause temporarily)
- **🗑️ Delete** - Remove from system
- **⏸️ Pause** - Deactivate (moves to Inactive)

---

## 📱 Mobile/Desktop Responsive

All buttons work on both:
- **Desktop**: Full text labels visible
- **Mobile**: Icon-only buttons for space

---

## 🚦 Status Indicators

| Badge | Meaning | Color |
|-------|---------|-------|
| **ACTIVE** | Currently displaying on boards | 🟢 Green |
| **INACTIVE** | Configured but not yet published | 🟠 Orange |
| **PENDING** | Waiting for admin approval | 🔵 Blue |
| **REJECTED** | Not approved by admin | 🔴 Red |

---

## 💡 Pro Tips

1. **Quick Publish**: Approve → Configure schedule → Save & Publish (all in 30 seconds!)

2. **Edit Anytime**: Even active content can be edited - just click Edit, make changes, save!

3. **Batch Operations**: Select multiple inactive items and publish together (future feature)

4. **Image Best Practices**:
   - Use JPG/PNG formats
   - Max size: 5MB
   - Recommended: 1920x1080 or smaller
   - Raspberry Pi scales to 300px height automatically

5. **Schedule Smart**:
   - Use "Always" for urgent notices
   - Use "Recurring" for weekly announcements
   - Use "Fixed" for event-specific notices

---

## 🎊 Success Indicators

You'll know it's working when:
- ✅ Scheduling dialog opens automatically after approval
- ✅ Edit button works in Inactive Content tab
- ✅ Images display on Raspberry Pi screens
- ✅ Console shows: `[NoticeApprovalPanel] Opening scheduling dialog`
- ✅ Raspberry Pi logs show: `Downloaded attachment: photo.jpg`

---

**Last Updated**: October 2, 2025
**Version**: v2.0 - Enhanced Notice Board System

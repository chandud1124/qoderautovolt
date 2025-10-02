# Notice Board Workflow - Quick Reference

## 📋 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SUBMITS NOTICE                       │
│              (Title, Content, Attachments)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Status: PENDING │
                   └────────┬────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN VIEWS IN APPROVAL PANEL                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          KIOSK-STYLE PREVIEW                       │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  📸 Large Image Preview (500px)          │     │    │
│  │  │  🎥 Video Player with Controls           │     │    │
│  │  │  📝 Text Content (High Contrast)         │     │    │
│  │  │  📎 Downloadable Files                   │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  │                                                    │    │
│  │  [Edit]  [✓ Approve]  [✗ Reject]                 │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    Approve │
                            ▼
                   ┌─────────────────┐
                   │ Status: APPROVED │
                   └────────┬─────────┘
                            │
                 Auto-redirect to
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTENT SCHEDULER (Auto-Opens)                  │
│                                                              │
│  🔔 Alert: "Notice Approved! Set display timing below"      │
│                                                              │
│  📋 Pre-filled Data:                                        │
│     Title: [Auto-filled from approved notice]              │
│     Content: [Auto-filled from approved notice]            │
│                                                              │
│  ⏰ Schedule Type:                                          │
│     ○ Daily Schedule (Mon-Sun selector)                    │
│     ○ Fixed Time (Date picker)                             │
│     ○ Always Playing                                        │
│                                                              │
│  🕐 Time Settings:                                          │
│     Start Time: [09:00] ───── End Time: [17:00]            │
│                                                              │
│  📅 Repeat on Days (if Daily):                             │
│     [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]             │
│                                                              │
│  ⏱️ Duration: [60] seconds                                  │
│                                                              │
│  🎯 Timing:                                                 │
│     ○ Apply Immediately                                     │
│     ● After Current Content                                │
│                                                              │
│  🖥️ Assign to Boards:                                      │
│     ☑ Board 1 (Main Hall)                                  │
│     ☑ Board 2 (Library)                                    │
│     ☐ Board 3 (Cafeteria)                                  │
│                                                              │
│  [Schedule Content] ← Click to Publish                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    Publish │
                            ▼
                   ┌──────────────────┐
                   │ Status: PUBLISHED │
                   └────────┬──────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTENT APPEARS ON DISPLAYS                     │
│                                                              │
│  🖥️ Raspberry Pi Board 1  🖥️ Raspberry Pi Board 2          │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │  [Notice Content]   │  │  [Notice Content]   │          │
│  │  [Images/Videos]    │  │  [Images/Videos]    │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                              │
│  Schedule: Mon-Fri, 9AM-5PM, 60s duration                  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features at Each Step

### 1️⃣ Pending Approval
- **Admin sees**: Kiosk-style full preview
- **Content**: Large images (500px), playable videos, formatted text
- **Actions**: Edit, Approve, Reject

### 2️⃣ Approved Status
- **Auto-redirect**: Scheduler tab opens automatically
- **Pre-filled**: Title and content already populated
- **Status**: Approved but not yet published

### 3️⃣ Scheduling
- **Schedule Types**:
  - **Daily**: Select specific days (Mon-Sun)
  - **Fixed**: One-time display on a date
  - **Always**: Continuous during hours
- **Time Control**: Start/end times
- **Duration**: How long each display lasts
- **Boards**: Multi-select for targeting

### 4️⃣ Published
- **Live**: Content appears on selected boards
- **Scheduled**: Only during specified times/days
- **Managed**: Can be paused/edited/deleted

## ⚡ Quick Actions

| Action | Location | Result |
|--------|----------|--------|
| Submit Notice | Notice Board → Submit | Creates pending notice |
| View Preview | Manage Tab → Pending | Full kiosk preview |
| Approve | Approval Panel → Approve | Opens scheduler |
| Schedule | Scheduler Tab → Schedule Content | Publishes notice |
| View Live | Live Preview Tab | See actual display |

## 🎨 Kiosk Preview Features

```
┌────────────────────────────────────────┐
│  🖥️ Kiosk Display Preview              │
│  ╔══════════════════════════════════╗  │
│  ║  Dark Background (Slate 900)     ║  │
│  ║                                  ║  │
│  ║  📝 Text Content                 ║  │
│  ║  (White, Large, High Contrast)  ║  │
│  ║                                  ║  │
│  ║  ┌──────────────────────────┐   ║  │
│  ║  │  🖼️ Image (500px max)    │   ║  │
│  ║  │  Full width, contained   │   ║  │
│  ║  └──────────────────────────┘   ║  │
│  ║  filename.jpg                   ║  │
│  ║                                  ║  │
│  ║  ┌──────────────────────────┐   ║  │
│  ║  │  ▶️ Video Player          │   ║  │
│  ║  │  [Controls visible]      │   ║  │
│  ║  └──────────────────────────┘   ║  │
│  ║  video.mp4                      ║  │
│  ╚══════════════════════════════════╝  │
│                                        │
│  Badge: "As users will see it" 🏷️     │
└────────────────────────────────────────┘
```

## 📱 Schedule Examples

### Daily Schedule (Recurring)
```
Type: Recurring
Days: Mon, Tue, Wed, Thu, Fri
Time: 09:00 - 17:00
Duration: 60 seconds
Boards: Main Hall, Library
Result: Shows every weekday during work hours
```

### One-Time Announcement (Fixed)
```
Type: Fixed
Date: 2025-10-15
Time: 10:00 - 11:00
Duration: 30 seconds
Boards: All
Result: Shows only on Oct 15, 2025
```

### Emergency Notice (Always)
```
Type: Always Playing
Time: No restrictions
Duration: 120 seconds
Boards: All
Timing: Immediate
Result: Shows continuously, interrupts current
```

## 🔄 Status Progression

```
PENDING ──[Approve]──> APPROVED ──[Schedule]──> PUBLISHED
   │                       │                        │
   │                       │                        ▼
   │                       │                   [Displays]
   │                       │
   └──[Reject]──> REJECTED │
                           │
                      [Edit/Reschedule]
```

## 💡 Tips

1. **Preview Before Approving**: Always check the kiosk preview to see exactly what users will see
2. **Schedule Smart**: Use recurring for regular notices, fixed for events
3. **Test First**: Assign to one board first, then expand if satisfied
4. **Set Duration**: Longer for complex content, shorter for simple text
5. **Use Timing**: "After current" is less disruptive than "immediate"

---

**All features are now live and ready to use!** 🚀

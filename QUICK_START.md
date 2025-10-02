# 🚀 QUICK START GUIDE - Kiosk-Style Notice Board

## For Admins: How to Use New Features

### 📋 Step-by-Step: Publishing a Notice

#### 1. View Pending Notices
```
Navigate to: Notice Board → Manage Tab → Pending Approval
```

You'll now see:
- 🎨 **Dark kiosk-style preview panels**
- 📸 **Large images** (500px) - exactly as they'll appear on displays
- 🎥 **Playable videos** - test them before approving
- 📄 **Full text content** - with proper formatting

#### 2. Review Content
Click on any notice to expand it fully. Check:
- Is the image clear and appropriate?
- Does the video play correctly?
- Is the text readable?
- Are attachments correct?

**Tip:** This preview shows EXACTLY what users will see on Raspberry Pi displays!

#### 3. Approve the Notice
Click the **"✓ Approve"** button

**What happens:**
- ✅ Notice status changes to "approved"
- 🔄 Tab automatically switches to "Schedule"
- 📝 Scheduler opens with notice data pre-filled
- 🔔 Blue alert appears: "Notice Approved! Set display timing..."

#### 4. Set Display Schedule

**Choose Schedule Type:**

##### Option A: Daily Schedule (Recurring)
```
Perfect for: Regular announcements, daily updates
```
1. Select **"Daily Schedule"**
2. Click the days you want: **[Mon] [Tue] [Wed] [Thu] [Fri]**
3. Set **Start Time:** `09:00`
4. Set **End Time:** `17:00`
5. Set **Duration:** `60` seconds

**Result:** Content displays every weekday from 9AM-5PM for 60 seconds each time

##### Option B: Fixed Time (One-Time)
```
Perfect for: Events, special announcements, temporary notices
```
1. Select **"Fixed Time"**
2. Pick a **date** (e.g., Oct 15, 2025)
3. Set **Start Time:** `10:00`
4. Set **End Time:** `14:00`
5. Set **Duration:** `30` seconds

**Result:** Content displays ONLY on that date during those hours

##### Option C: Always Playing
```
Perfect for: Important information, emergency notices
```
1. Select **"Always Playing"**
2. Set **Duration:** `120` seconds
3. Time fields disappear (no restrictions)

**Result:** Content plays continuously whenever displays are active

#### 5. Set Timing Behavior

**Immediate:**
- Interrupts currently playing content
- Starts showing right away
- Use for: Urgent notices

**After Current Content:**
- Waits for current content to finish
- Queued playback
- Use for: Regular notices (recommended)

#### 6. Assign to Boards

Check the boards where you want this content to appear:
```
☑ Board 1 - Main Hall
☑ Board 2 - Library
☐ Board 3 - Cafeteria
```

**Tip:** Start with one board to test, then expand to others

#### 7. Publish

Click **"Schedule Content"** button

**What happens:**
- ✅ Notice status changes to "published"
- 🖥️ Content starts appearing on selected boards according to schedule
- 📊 You can see it in "Live Preview" tab

---

## 🎯 Common Scenarios

### Scenario 1: Weekly Class Schedule
```
Type: Daily Schedule
Days: Mon, Tue, Wed, Thu, Fri
Time: 08:00 - 09:00
Duration: 60 seconds
Boards: Main Hall, Library
Timing: After Current
```

### Scenario 2: Special Event Announcement
```
Type: Fixed Time
Date: December 25, 2025
Time: 10:00 - 16:00
Duration: 45 seconds
Boards: All Boards
Timing: After Current
```

### Scenario 3: Emergency Notice
```
Type: Always Playing
Time: No restrictions
Duration: 120 seconds
Boards: All Boards
Timing: Immediate ⚠️
```

### Scenario 4: Weekend Message
```
Type: Daily Schedule
Days: Sat, Sun
Time: 09:00 - 18:00
Duration: 30 seconds
Boards: Main Hall
Timing: After Current
```

---

## 💡 Pro Tips

### 1. Preview is Your Friend
Always check the kiosk-style preview before approving. It shows:
- Actual image sizes
- Video playback quality
- Text readability
- Overall appearance

### 2. Test Before Expanding
Start with one board, verify it looks good, then assign to more boards.

### 3. Choose Duration Wisely
- **Simple text:** 30-45 seconds
- **Image with text:** 45-60 seconds
- **Video content:** Match video length + 10 seconds
- **Complex information:** 90-120 seconds

### 4. Use "After Current" Most Times
Unless it's an emergency, use "After Current Content" to avoid interrupting ongoing displays.

### 5. Schedule Smart
- **Daily notices:** Use Recurring
- **Event notices:** Use Fixed
- **Critical info:** Use Always Playing

### 6. Time Zones Matter
The time slots use your local time zone. Consider when your audience is actually present.

---

## 🔍 Troubleshooting

### Problem: Preview looks different than expected
**Solution:** The preview IS what users will see. If it looks wrong, edit the notice before approving.

### Problem: Scheduler didn't open after approval
**Solution:** Click on the "Schedule" tab manually. The notice should be pre-filled there.

### Problem: Can't select boards
**Solution:** Ensure at least one board is configured in the Raspberry Pi Board Manager.

### Problem: Content not showing on displays
**Solution:** 
1. Check if the current time falls within your scheduled hours
2. Verify the selected days include today
3. Check if the board is online in Live Preview

### Problem: Video won't play
**Solution:**
1. Ensure video format is supported (MP4 recommended)
2. Check file size (keep under 100MB)
3. Test in the preview before approving

---

## 📊 Quick Reference

### Schedule Types Comparison

| Type | Use When | Examples |
|------|----------|----------|
| **Recurring** | Regular, repeating content | Daily schedules, weekly updates |
| **Fixed** | One-time events | Conferences, special days |
| **Always** | Continuous critical info | Emergency contacts, important rules |

### Duration Guide

| Content Type | Recommended Duration |
|--------------|---------------------|
| Short text (1-2 lines) | 20-30 seconds |
| Medium text (paragraph) | 45-60 seconds |
| Image + text | 60-90 seconds |
| Video | Video length + buffer |
| Complex info/multiple images | 90-120 seconds |

### Timing Behavior

| Option | Effect | Best For |
|--------|--------|----------|
| **Immediate** | Interrupts current | Emergency notices |
| **After Current** | Waits in queue | Regular content |

---

## 🎓 Learning Path

### Day 1: Basics
1. Review pending notices with new kiosk preview
2. Approve one test notice
3. Set up a simple daily schedule
4. Watch it appear in Live Preview

### Day 2: Advanced
1. Try fixed schedule for a future event
2. Experiment with day selection
3. Test different durations
4. Assign to multiple boards

### Day 3: Mastery
1. Set up multiple recurring schedules
2. Use "Always Playing" for critical info
3. Create a content calendar
4. Optimize timing based on usage patterns

---

## 📞 Need Help?

Check these documents:
- **IMPLEMENTATION_COMPLETE.md** - Full feature list
- **WORKFLOW_GUIDE.md** - Visual diagrams
- **KIOSK_WORKFLOW_IMPROVEMENTS.md** - Technical details

Or test in a safe environment first!

---

## ✅ Checklist for First Use

- [ ] Log in as admin
- [ ] Go to Manage tab
- [ ] See the new kiosk-style previews
- [ ] Approve a test notice
- [ ] Watch scheduler open automatically
- [ ] Set a simple recurring schedule (Mon-Fri, 9-5)
- [ ] Assign to one board
- [ ] Click "Schedule Content"
- [ ] Go to Live Preview tab
- [ ] Verify content appears on schedule

---

**Ready to go! Start with the checklist above.** 🚀

**Remember:** The kiosk preview shows EXACTLY what users will see. If it looks good there, it'll look good on displays!

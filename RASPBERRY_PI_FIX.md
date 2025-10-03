# 🔧 RASPBERRY PI "NO CONTENT AVAILABLE" FIX

## Problem Summary
The Raspberry Pi display is showing "No content available" even though:
- ✅ Backend server has 2 active content items  
- ✅ API endpoint returns content correctly
- ✅ Content is assigned to the correct board

## Root Cause
The `display_client.py` on Raspberry Pi has a bug where `is_active` column in SQLite database is not being set explicitly during `INSERT OR REPLACE` operations. This causes content to have `is_active = NULL` or `is_active = 0`, which fails the query filter:

```sql
WHERE is_active = 1
```

## Quick Fix (Run on Raspberry Pi)

### Option 1: Fix the Database (Recommended)

```bash
# 1. Check service status
sudo systemctl status display-client

# 2. View recent logs
sudo journalctl -u display-client -n 50

# 3. Fix the database
sudo sqlite3 /var/lib/raspberry-display/content.db << EOF
UPDATE content SET is_active = 1;
SELECT id, title, is_active FROM content;
.quit
EOF

# 4. Restart the service
sudo systemctl restart display-client

# 5. Monitor logs
sudo journalctl -u display-client -f
```

### Option 2: Use the Fix Script

```bash
# 1. Copy fix_content_database.py to Raspberry Pi
scp raspberry_pi_display/fix_content_database.py pi@<raspberry-pi-ip>:~/

# 2. SSH to Raspberry Pi
ssh pi@<raspberry-pi-ip>

# 3. Run the fix script
sudo python3 ~/fix_content_database.py

# 4. Restart service
sudo systemctl restart display-client
```

### Option 3: Nuclear Option (Clear Everything)

```bash
# 1. Stop service
sudo systemctl stop display-client

# 2. Remove database
sudo rm /var/lib/raspberry-display/content.db

# 3. Start service (will recreate DB and fetch fresh content)
sudo systemctl start display-client

# 4. Monitor logs
sudo journalctl -u display-client -f
```

## Permanent Fix (Update display_client.py)

The bug is in the `store_content` method around line 186 and 1102 (there are duplicates).

Change:
```python
INSERT OR REPLACE INTO content
(id, notice_id, title, content, content_type, priority,
 schedule_type, schedule_start, schedule_end, display_duration, 
 attachments, is_recurring)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

To:
```python
INSERT OR REPLACE INTO content
(id, notice_id, title, content, content_type, priority,
 schedule_type, schedule_start, schedule_end, display_duration, 
 attachments, is_recurring, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

And add `1` to the end of the VALUES tuple:
```python
json.dumps(notice.get('attachments', [])),
1 if is_recurring else 0,
1  # Explicitly set is_active to 1
```

After updating the code:
```bash
sudo systemctl restart display-client
```

## Current Content Status

**Server has 2 content items ready:**

1. **"EAFWFWF"**
   - Content: "TEST 1145478"
   - Priority: 3
   - Schedule: Always (24/7)
   - Attachments: None

2. **"EWFAWEFAW"**
   - Content: "AWE"  
   - Priority: 1
   - Schedule: Always (24/7)
   - Attachments: 1 image (notice-1759470804489-145613387.png)

## Verification Steps

After applying the fix:

1. **Check logs for successful content fetch:**
```bash
sudo journalctl -u display-client -n 20
```

Look for:
- "Stored X content items locally"
- "Loaded X notices from local storage"

2. **Check database directly:**
```bash
sudo sqlite3 /var/lib/raspberry-display/content.db
SELECT id, title, is_active FROM content;
.quit
```

All rows should have `is_active = 1`

3. **Verify display:**
   - Screen should show content within 30 seconds
   - Should rotate between the 2 content items
   - Higher priority (1) displays first

## Troubleshooting

If content still doesn't show after fix:

1. **Network issues:**
```bash
ping <server-ip>
curl http://<server-ip>:3001/api/boards/<board-id>/content
```

2. **Service not running:**
```bash
sudo systemctl status display-client
sudo systemctl start display-client
```

3. **Wrong Board ID:**
```bash
cat /etc/raspberry-display/.env | grep BOARD_ID
```

Should be: `68db7ae19949ee755662473a`

4. **Check Python errors:**
```bash
sudo journalctl -u display-client -p err
```

## Files Affected

- `raspberry_pi_display/display_client.py` - Main client (needs fix)
- `raspberry_pi_display/fix_content_database.py` - Quick fix script (new)
- `/var/lib/raspberry-display/content.db` - SQLite database on Pi

## Backend Status

✅ Backend is working correctly:
- API returns 2 content items
- Content is properly formatted
- Board assignment is correct
- Schedule is set to "always" (24/7)

The issue is purely on the Raspberry Pi side with database storage.

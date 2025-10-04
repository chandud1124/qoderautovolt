# Logging System Fixes - Summary

## Date: October 4, 2025

## Issues Fixed

### 1. **Duplicate Manual Switch Logs**
**Problem:** Manual switch operations were being logged to BOTH `ActivityLog` and `ManualSwitchLog` collections, causing duplicate entries.

**Solution:** 
- Removed the duplicate logging to `ManualSwitchLog` collection in `server.js`
- Now manual switches are only logged once to `ActivityLog` with `triggeredBy: 'manual_switch'`

**Files Modified:**
- `/backend/server.js` (lines 221-233 removed)

### 2. **Manual Switches Missing from Active Logs**
**Problem:** Manual switch operations were excluded from the activities/active logs view because of a filter that explicitly removed them.

**Solution:**
- Removed the exclusion filter: `query.triggeredBy = { $ne: 'manual_switch' }`
- Now manual switches appear in the active logs alongside other activities (schedule, user actions, etc.)

**Files Modified:**
- `/backend/routes/logs.js` (line 43-44 modified)

### 3. **Manual Switches Tab Now Uses ActivityLog**
**Problem:** The manual switches tab was querying the `ManualSwitchLog` collection which was creating confusion with duplicate data sources.

**Solution:**
- Updated the `/api/logs/manual-switches` endpoint to query `ActivityLog` with filter `triggeredBy: 'manual_switch'`
- This ensures consistency - all logs come from the same source

**Files Modified:**
- `/backend/routes/logs.js` (lines 87-150 modified)

## Impact

### Before:
- ❌ Manual switch actions logged twice (ActivityLog + ManualSwitchLog)
- ❌ Manual switches hidden from active logs
- ❌ Two separate database collections for the same data
- ❌ Potential inconsistency between the two log sources

### After:
- ✅ Manual switch actions logged once to ActivityLog
- ✅ Manual switches visible in active logs (like menu logs)
- ✅ Single source of truth: ActivityLog collection
- ✅ Consistent logging across all activity types

## Database Collections

### ActivityLog (Primary)
Contains all activity types:
- `triggeredBy: 'schedule'` - Scheduled actions
- `triggeredBy: 'user'` - User-initiated actions
- `triggeredBy: 'manual_switch'` - Physical switch operations
- `triggeredBy: 'menu'` - Menu-based actions
- etc.

### ManualSwitchLog (Deprecated)
This collection is no longer being written to. Existing data remains but new manual switch events go to ActivityLog only.

## API Endpoints

### GET /api/logs/activities
Returns all activities including manual switches
- No longer excludes `triggeredBy: 'manual_switch'`
- Shows complete activity timeline

### GET /api/logs/manual-switches
Returns only manual switch activities
- Queries ActivityLog with filter: `triggeredBy: 'manual_switch'`
- Provides focused view of physical switch operations

## Testing Recommendations

1. **Test Manual Switch Logging:**
   - Toggle a physical switch on ESP32
   - Verify it appears in BOTH active logs and manual switches tab
   - Verify only ONE entry is created in the database

2. **Test Active Logs View:**
   - Check that manual switches appear alongside schedules and user actions
   - Verify chronological ordering is correct
   - Test filtering and search functionality

3. **Test Manual Switches Tab:**
   - Verify it shows only manual switch operations
   - Confirm no duplicate entries
   - Test date filtering

## Backend Restart Required

After applying these changes, restart the backend:
```bash
cd /Users/chandu/Documents/github/new-autovolt/backend
lsof -ti:3001 | xargs kill -9 2>/dev/null
nohup node server.js > server_realtime.log 2>&1 &
```

## Frontend Impact

No frontend changes required. The existing UI will automatically show:
- Manual switches in the active logs (previously hidden)
- No duplicate entries in manual switches tab
- Consistent data across all views

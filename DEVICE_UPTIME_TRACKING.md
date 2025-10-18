# Device Uptime & Switch Statistics Feature

## Overview
Added comprehensive device uptime/downtime tracking and switch on/off statistics to the Analytics & Monitoring menu in the Devices section.

## Features Added

### 1. Device Uptime/Downtime Tracking
- **ESP32 Online Duration**: Shows how long each ESP32 device was online during the selected date
- **ESP32 Offline Duration**: Shows how long each device was offline/disconnected
- **Last Online/Offline Timestamps**: Displays when the device last came online or went offline
- **Uptime Percentage**: Visual progress bar showing uptime percentage for the day
- **Health Status Badge**: "Healthy" for devices with more uptime, "Issues Detected" for devices with more downtime

### 2. Switch On/Off Statistics (Per Device)
When a specific device is selected, shows detailed statistics for each switch:
- **On Duration**: How long each switch was turned on
- **Off Duration**: How long each switch was turned off
- **Toggle Count**: Number of times the switch was toggled on/off
- **Last ON/OFF Timestamps**: When the switch was last turned on or off
- **On Time Percentage**: Visual bar showing percentage of time switch was on

### 3. Date Selection
- **Date Picker**: Select any date to view historical statistics
- **Max Date**: Can only select dates up to today (no future dates)
- **Default**: Shows today's data by default

### 4. Device Filter
- **All Devices**: View uptime stats for all ESP32 devices
- **Single Device**: Select a specific device to see both uptime stats AND switch statistics
- **Switch stats only shown for single device selection**

## UI Components

### Location
Analytics & Monitoring > Devices Tab > Bottom of page (new section)

### Cards Created
1. **Device Uptime & Switch Statistics** (Header Card)
   - Date picker input
   - Device selector dropdown
   - Refresh button

2. **Device Uptime/Downtime Report** (Main Card)
   - Shows all devices when "All Devices" selected
   - Each device shows:
     - Green box: Online duration with last online timestamp
     - Red box: Offline duration with last offline timestamp
     - Progress bar: Uptime percentage
     - Health badge

3. **Switch On/Off Statistics** (Conditional Card)
   - Only appears when single device selected
   - Shows all switches for that device
   - Each switch shows:
     - Blue box: On duration with last ON timestamp
     - Gray box: Off duration with last OFF timestamp
     - Purple box: Toggle count
     - Progress bar: On time percentage

## Backend API Endpoints

### 1. GET `/api/analytics/device-uptime`
Query parameters:
- `date` (optional): Date in YYYY-MM-DD format (default: today)
- `deviceId` (optional): MongoDB ObjectId of device (default: all devices)

Response:
```json
{
  "uptimeStats": [
    {
      "deviceId": "device_id_here",
      "deviceName": "ESP32 Device Name",
      "onlineDuration": 43200,
      "offlineDuration": 43200,
      "lastOnlineAt": "2025-10-18T14:30:00.000Z",
      "lastOfflineAt": "2025-10-18T02:30:00.000Z",
      "totalUptime": "12h 0m",
      "totalDowntime": "12h 0m"
    }
  ]
}
```

### 2. GET `/api/analytics/switch-stats`
Query parameters:
- `date` (optional): Date in YYYY-MM-DD format (default: today)
- `deviceId` (required): MongoDB ObjectId of device

Response:
```json
{
  "switchStats": [
    {
      "switchId": 1,
      "switchName": "Main Light",
      "onDuration": 28800,
      "offDuration": 57600,
      "toggleCount": 5,
      "lastOnAt": "2025-10-18T18:00:00.000Z",
      "lastOffAt": "2025-10-18T22:00:00.000Z",
      "totalOnTime": "8h 0m",
      "totalOffTime": "16h 0m"
    }
  ]
}
```

## Data Source
Uses existing `ActivityLog` collection with actions:
- **Device status**: `device_online`, `device_offline`, `device_connected`, `device_disconnected`
- **Switch toggles**: `switch_on`, `switch_off`

## Duration Calculation Logic

### Device Uptime
1. Query ActivityLog for device status changes within selected date (00:00 - 23:59)
2. Calculate time between each status change
3. Add duration to online or offline bucket based on previous status
4. Add remaining time from last status change to end of day

### Switch On/Off Time
1. Query ActivityLog for switch toggle events within selected date
2. Filter by specific switch ID in details field
3. Calculate time between each toggle
4. Count total number of toggles
5. Add duration to on or off bucket based on previous state
6. Add remaining time from last toggle to end of day

## Duration Formatting
- Less than 60 seconds: "45s"
- Less than 1 hour: "15m 30s"
- Less than 24 hours: "5h 45m"
- 24+ hours: "2d 12h"

## Color Scheme
- **Green**: Online/Healthy status
- **Red**: Offline/Issues status
- **Blue**: Switch ON state
- **Gray**: Switch OFF state
- **Purple**: Toggle count

## Benefits
1. **Reliability Monitoring**: Track which devices have connectivity issues
2. **Usage Patterns**: See when devices/switches are most active
3. **Troubleshooting**: Identify when a device went offline or switch stopped working
4. **Maintenance Planning**: Find devices with poor uptime for preventive maintenance
5. **Historical Analysis**: Review any past date to investigate issues

## Usage Instructions
1. Navigate to **Analytics & Monitoring** menu
2. Click **Devices** tab
3. Scroll to bottom to find **Device Uptime & Switch Statistics**
4. Select a date using the date picker
5. Choose "All Devices" to see uptime for all ESP32s
6. OR choose a specific device to see both uptime AND switch statistics
7. Click **Refresh** to reload data

## Notes
- No graphs created (as per requirement)
- Real data only (no mock data)
- Responsive design works on mobile and desktop
- Loading states shown while fetching data
- Empty states shown when no data available
- All durations calculated in seconds and formatted for readability
- Timestamps shown in user's local time format

## Files Modified/Created
1. `src/components/DeviceUptimeTracker.tsx` - New component (360 lines)
2. `src/components/AnalyticsPanel.tsx` - Added import and component usage
3. `backend/routes/analytics.js` - Added 2 new endpoints (220 lines)

## Testing
After backend restart:
1. Visit Analytics & Monitoring > Devices
2. Check if uptime tracking section appears at bottom
3. Select today's date and "All Devices" - should show all ESP32 uptime stats
4. Select a device - should show switch statistics
5. Change date to yesterday - should show historical data
6. Check toggle counts match ActivityLog records

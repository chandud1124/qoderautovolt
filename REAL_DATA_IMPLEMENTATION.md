# Real Data Implementation - Energy Calendar

## ✅ Changes Made

### 1. **Removed Mock Data Generation**
**File**: `src/components/EnergyMonitoringDashboard.tsx`

**Before**:
```tsx
catch (error) {
  console.error('Error fetching calendar data:', error);
  // Generate mock calendar data if API fails
  generateMockCalendarData(date);
}
```

**After**:
```tsx
catch (error) {
  console.error('Error fetching calendar data:', error);
  // Set to null if API fails - will show error message to user
  setCalendarData(null);
}
```

**Result**: No more random mock data. Only real data from ActivityLog is displayed.

---

### 2. **Removed Mock Data Function**
Deleted the entire `generateMockCalendarData()` function that was creating random consumption values.

**Result**: Cleaner code, no fallback to fake data.

---

### 3. **Added Error Message for Failed Data Load**
Added a clear error message when calendar data fails to load:

```tsx
{showCalendar && !calendarData && (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="pt-6">
      <div className="text-center text-red-600">
        <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-semibold">Unable to load calendar data</p>
        <p className="text-sm text-red-500 mt-2">
          Please ensure the backend server is running and the calendar endpoint is available.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

**Result**: Users see a clear message instead of random data when API fails.

---

### 4. **Added Visual Indicator for Days with No Data**
Updated calendar to show **gray color** for days with zero consumption:

```tsx
const getCategoryColor = (consumption: number, category: 'low' | 'medium' | 'high') => {
  // Show gray for zero consumption (no data for that day)
  if (consumption === 0) {
    return 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600';
  }
  
  switch (category) {
    case 'low': return 'bg-blue-500 hover:bg-blue-600';
    case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'high': return 'bg-red-500 hover:bg-red-600';
  }
};
```

**Result**: Days without data show as gray instead of blue, making it clear there's no activity.

---

### 5. **Updated Calendar Legend**
Added "No Data" category to the legend:

```tsx
<div className="flex items-center gap-2">
  <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
  <span className="text-xs">No Data</span>
</div>
```

**Result**: Users understand what gray days mean.

---

### 6. **Improved Tooltip for Zero Days**
Updated tooltip to show "(No data)" for days with zero consumption:

```tsx
title={`${day.consumption.toFixed(2)} kWh - ₹${day.cost.toFixed(2)}${day.consumption === 0 ? ' (No data)' : ''}`}
```

And shows "-" instead of "0.0" in the calendar cell:

```tsx
<span className="text-[10px] opacity-75">
  {day.consumption === 0 ? '-' : day.consumption.toFixed(1)}
</span>
```

**Result**: Clear indication when hovering over days without activity.

---

## 🔄 How Real Data Works

### Backend (`backend/metricsService.js`)
The `getEnergyCalendar(year, month)` function:

1. **Queries all devices** from MongoDB (including newly added devices):
   ```javascript
   const devices = await Device.find({}, {
     name: 1, classroom: 1, switches: 1, status: 1, _id: 1
   }).lean();
   ```

2. **Iterates through each day** of the requested month

3. **For each device**, calculates energy using `calculatePreciseEnergyConsumption()`:
   - Queries ActivityLog for on/off events
   - Calculates exact power consumption based on switch states
   - Integrates energy over time periods

4. **Returns real data**:
   - If no ActivityLog entries exist for a day → consumption = 0
   - If devices were on → actual calculated consumption
   - Automatically includes new devices as they're added to database

### Example Data Flow

```
Day 1: Device A turned on at 8 AM, off at 5 PM
  → ActivityLog: [{ action: 'on', timestamp: 8:00 }, { action: 'off', timestamp: 17:00 }]
  → Calculation: 9 hours × device power = X kWh
  → Calendar shows: Blue/Yellow/Red based on X value

Day 2: No activity (no ActivityLog entries)
  → Calculation: No on/off events = 0 kWh
  → Calendar shows: Gray (No Data)

Day 3: New device added, turned on at 10 AM
  → Next API call automatically includes new device
  → Calculation: Hours × new device power = Y kWh
  → Calendar shows: Color based on Y value
```

---

## 🎨 Calendar Color Legend

| Color | Consumption | Meaning |
|-------|-------------|---------|
| ⚪ Gray | 0 kWh | No data - devices were offline or no activity recorded |
| 🔵 Blue | ≤1 kWh | Low consumption - efficient usage |
| 🟡 Yellow | 1-2 kWh | Medium consumption - normal usage |
| 🔴 Red | >2 kWh | High consumption - check devices |

---

## ✨ New Device Support

### Automatic Detection
When a new device is added to the system:

1. **Device saved to MongoDB** via device management interface
2. **Next calendar API call** (`/api/analytics/energy-calendar/:year/:month`)
3. **getEnergyCalendar queries ALL devices**:
   ```javascript
   const devices = await Device.find({}, { ... }).lean();
   ```
4. **New device included automatically** in energy calculations
5. **Calendar reflects new device's consumption** from the moment it was added

### Example Timeline
```
October 1-10: Only Device A exists
  → Calendar shows Device A's consumption

October 11: New Device B added at 2 PM
  → Device B turned on at 3 PM

October 11 (after refresh):
  → Calendar shows: Device A consumption + Device B consumption (from 3 PM onwards)
  
October 12-31:
  → Calendar shows: Combined consumption of Device A + Device B
```

### No Configuration Needed
- ✅ No need to update dashboard code
- ✅ No need to restart frontend
- ✅ Backend automatically includes all devices in database
- ✅ Just need to restart backend if calendar endpoint was newly added

---

## 🔍 Data Accuracy

### Real Data Sources
1. **ActivityLog Model** - Stores all device on/off events with timestamps
2. **Device Model** - Current device states and switch configurations
3. **calculatePreciseEnergyConsumption()** - Integrates energy based on actual time periods

### Zero Values Mean
- ✅ **No ActivityLog entries** for that day
- ✅ **All devices were offline** for the entire day
- ✅ **No switch state changes** occurred
- ❌ **NOT** a data error or mock data

### How to Get Real Data
1. **Ensure devices are online** and reporting to backend
2. **Devices must have ActivityLog entries** (on/off events)
3. **Turn devices on/off** to generate activity
4. **Wait for next calendar refresh** to see updated values

---

## 🐛 Troubleshooting

### Calendar Shows All Gray Days
**Cause**: No ActivityLog entries in database for the selected month

**Solution**:
```javascript
// Check if ActivityLog has data
db.activitylogs.find().limit(10)

// If empty, devices need to generate activity:
// 1. Turn devices on/off through the interface
// 2. Check MQTT is connected
// 3. Verify devices are reporting status changes
```

### New Device Not Showing in Calendar
**Cause**: Backend not restarted after adding device

**Solution**:
```powershell
cd backend
npm start
```

Then refresh the calendar view.

### Calendar API Returns 404
**Cause**: Backend not restarted after adding calendar endpoint

**Solution**:
```powershell
# Restart backend to load new route
cd backend
npm start

# Verify endpoint is available
curl http://localhost:3001/api/analytics/energy-calendar/2025/10
```

---

## 📊 Summary

### Before This Update
- ❌ Showed random mock data when API failed
- ❌ No indication of days without data
- ❌ Confusing when real data was 0 vs mock data
- ❌ No way to tell if backend was working

### After This Update
- ✅ Only shows real data from ActivityLog
- ✅ Gray color for days with no activity (zero consumption)
- ✅ Clear error message when API fails
- ✅ Legend includes "No Data" category
- ✅ Tooltip shows "(No data)" for zero days
- ✅ Shows "-" instead of "0.0" for clarity
- ✅ Automatically includes new devices

### Data Integrity
- ✅ 100% real data from database
- ✅ Zero means no activity, not an error
- ✅ New devices automatically included
- ✅ Precise energy calculations from ActivityLog
- ✅ No mock or random values

---

## 🚀 Next Steps

1. **Restart Backend** to load calendar endpoint:
   ```powershell
   cd backend
   npm start
   ```

2. **Test Calendar**:
   - Navigate to Energy tab
   - Click calendar icon (📅)
   - Check for gray days (no data) vs colored days (real data)

3. **Generate Activity**:
   - Turn devices on/off through dashboard
   - Check ActivityLog is being created
   - Refresh calendar to see real consumption

4. **Add New Devices**:
   - Add device through device management
   - Device will automatically appear in next calendar refresh
   - No configuration needed!

---

**Status**: ✅ Real data only, no mock data, automatic new device detection

# Energy Analytics Enhancement

## Overview
Enhanced the analytics and monitoring dashboard to display both daily and monthly energy consumption data in the same cards, and exclude offline devices from consumption calculations.

## Changes Made

### Backend Changes

#### 1. New Function: `getEnergySummary()` in `backend/metricsService.js`
- **Purpose**: Calculate daily and monthly energy consumption and costs
- **Key Features**:
  - Only processes devices with `status: 'online'`
  - Calculates consumption from midnight today and from start of current month
  - Uses precise ActivityLog data when available
  - Falls back to estimation based on current switch states
  - Returns structured data with daily and monthly breakdowns

**Data Structure Returned**:
```javascript
{
  daily: {
    consumption: 1.234,      // kWh (today)
    cost: 12.34,            // INR (today)
    onlineDevices: 5
  },
  monthly: {
    consumption: 45.678,     // kWh (this month)
    cost: 456.78,           // INR (this month)
    onlineDevices: 5
  },
  timestamp: "2025-10-18T..."
}
```

#### 2. New Endpoint: `GET /api/analytics/energy-summary` in `backend/routes/analytics.js`
- Exposes the energy summary data to the frontend
- No parameters required
- Returns real-time calculation excluding offline devices

### Frontend Changes

#### 1. Updated `src/components/AnalyticsPanel.tsx`

**New State**:
- Added `energySummary` state to store daily/monthly consumption data

**New Functions**:
- `fetchEnergySummary()`: Fetches summary from new backend endpoint

**Updated Cards**:

**Total Consumption Card**:
- **Before**: Static "2.4 kWh" for "Last 24h"
- **After**: 
  - Primary: Today's consumption (kWh) with online device count
  - Secondary: This month's consumption (kWh)
  - Warning indicator when no devices are online

**Energy Cost Card**:
- **Before**: Static "₹186" as "Estimated cost"
- **After**:
  - Primary: Today's cost (₹) 
  - Secondary: This month's cost (₹)
  - Warning indicator when offline devices are excluded

**Auto-refresh**:
- Added `useEffect` to refresh energy summary when timeframe changes
- Summary updates automatically to reflect current device status

## User-Visible Improvements

### 1. Real-Time Data
- Cards now show **actual calculated values** instead of hardcoded placeholders
- Data updates based on real device activity and status

### 2. Dual Timeframes in One Card
```
┌─────────────────────────────┐
│ Total Consumption        ⚡  │
├─────────────────────────────┤
│ 2.45 kWh                    │
│ Today (5 devices online)    │
│ ─────────────────────────   │
│ 67.89 kWh                   │
│ This month                  │
└─────────────────────────────┘
```

### 3. Offline Device Handling
- **Consumption calculation**: Only includes devices with `status: 'online'`
- **Visual indicators**: Shows warning when no devices are online
- **Transparency**: Displays count of online devices contributing to consumption

### 4. Accurate Cost Estimation
- Uses configured electricity rate (₹/kWh from `ELECTRICITY_RATE_INR_PER_KWH`)
- Calculates based on actual/estimated consumption
- Separate daily and monthly totals for budget tracking

## Technical Benefits

### 1. Database Efficiency
- Leverages existing `ActivityLog` for precise consumption tracking
- Falls back gracefully to switch-state estimation
- Single query per device for both daily and monthly

### 2. Accuracy
- Uses `calculatePreciseEnergyConsumption()` for logs with timestamps
- Accounts for partial days and months
- Excludes offline devices to prevent inflated numbers

### 3. Maintainability
- Centralized calculation in `getEnergySummary()`
- Clear separation between precise and estimated logic
- Consistent data structure for frontend

## Configuration

### Backend
- **Electricity Rate**: Configured in `backend/metricsService.js` as `ELECTRICITY_RATE_INR_PER_KWH`
- **Default**: Check current value in metricsService (typically ₹6-8 per kWh for Indian rates)

### Frontend
- **Auto-refresh**: Triggers on timeframe change
- **Manual refresh**: Available via existing refresh button in analytics panel

## Testing Recommendations

1. **With All Devices Offline**:
   - Should show "0.00 kWh" and "₹0.00"
   - Warning message: "No devices online - consumption not calculated"

2. **With Mixed Online/Offline**:
   - Should calculate only for online devices
   - Device count should match online devices

3. **Daily Rollover**:
   - Daily consumption should reset at midnight
   - Monthly should continue accumulating

4. **Month Rollover**:
   - Monthly consumption should reset on 1st of month

## Future Enhancements

1. **Historical Comparison**:
   - Add "vs. yesterday" and "vs. last month" indicators
   - Show percentage change with trend arrows

2. **Breakdown by Classroom**:
   - Add drill-down to see consumption per classroom
   - Compare classrooms side-by-side

3. **Cost Projections**:
   - Estimate end-of-month cost based on current usage
   - Alert when approaching budget thresholds

4. **Export**:
   - Download daily/monthly reports as PDF or CSV
   - Include device-wise breakdown

## Files Modified

### Backend
- `backend/metricsService.js` - Added `getEnergySummary()` function
- `backend/routes/analytics.js` - Added `/energy-summary` endpoint

### Frontend
- `src/components/AnalyticsPanel.tsx` - Updated cards and added summary fetch

## API Endpoints

### New Endpoint
```
GET /api/analytics/energy-summary
Response: {
  daily: { consumption, cost, onlineDevices },
  monthly: { consumption, cost, onlineDevices },
  timestamp
}
```

### Existing Endpoints (Unchanged)
- `GET /api/analytics/energy/:timeframe` - Time-series energy data
- `GET /api/analytics/dashboard` - Overall dashboard stats

---

**Date**: October 18, 2025  
**Status**: ✅ Completed  
**Impact**: High - Provides accurate, actionable energy consumption data

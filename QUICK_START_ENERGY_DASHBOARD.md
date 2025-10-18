# Quick Start - Energy Monitoring Dashboard

## 🚀 Start the Application

### 1. Start Backend Server
```powershell
cd backend
npm start
```
**Expected output**:
```
MongoDB connected successfully
Server running on port 3001
Prometheus metrics available at /api/analytics/metrics
```

### 2. Start Frontend Dev Server
```powershell
# In a new terminal
npm run dev
```
**Expected output**:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Open Browser
Navigate to: `http://localhost:5173`

### 4. Go to Analytics Page
1. Click **Analytics** in the navigation menu
2. Click the **Energy** tab
3. 🎉 You should see the new Energy Monitoring Dashboard!

## 📸 What You Should See

### Summary Cards (Top Row)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 🔵 Today's   │ 🟢 This      │ 🟣 Bill This │ 🟠 Runtime   │
│    Usage     │    Month     │    Month     │              │
│  X.XXX kWh   │  XX.XXX kWh  │   ₹XXX.XX    │ Today: XXh   │
│  Runtime:XXh │  Runtime:XXh │   ₹7.5/kWh   │ Month:XXXh   │
│  X devices   │  Eff: 85%    │   Avg/day    │  Uptime:XX%  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Chart Section (Middle)
```
Energy Consumption Trend         [Day] [Month] [Year]
┌────────────────────────────────────────────────────┐
│                                                     │
│     ┃ ┃   ┃     ┃ ┃ ┃       ┃   ┃     ┃ ┃        │
│     ┃ ┃   ┃     ┃ ┃ ┃       ┃   ┃     ┃ ┃        │
│ ────┸─┸───┸─────┸─┸─┸───────┸───┸─────┸─┸──────  │
│ 00  02  04  06  08  10  12  14  16  18  20  22    │
└────────────────────────────────────────────────────┘
```

### Calendar View (When toggled)
```
📅 October 2025                          [◀]    [▶]
┌────────────────────────────────────────────────┐
│ Sun  Mon  Tue  Wed  Thu  Fri  Sat              │
│       🔵   🟡   🔵   🟡   🔴   🔵              │
│  🟡   🔵   🔴   🟡   🔵   🟡   🔵  ...         │
└────────────────────────────────────────────────┘
Total Consumption: XX.XX kWh | Total Cost: ₹XXX.XX
```

## ✅ Quick Feature Test

### Test 1: View Mode Tabs
1. Click **Day** tab → Should show 24 hourly bars (00-23)
2. Click **Month** tab → Should show 30/31 daily bars (1-31)
3. Click **Year** tab → Should show 12 monthly bars (Jan-Dec)

### Test 2: Calendar View
1. Click the 📅 calendar icon (top right)
2. Calendar should appear with color-coded days
3. Click ◀ to go to previous month
4. Click ▶ to go to next month
5. Hover over any day → Tooltip should show kWh, cost, runtime

### Test 3: Filters
1. Click **Device** dropdown → Should show list of devices
2. Click **Classroom** dropdown → Should show list of classrooms
3. Select a device → Charts should update (future: backend filtering)

### Test 4: Interactive Tooltips
1. Hover over any bar in the chart → Should show:
   - Time/Date
   - Consumption (kWh)
   - Cost (₹)
   - Runtime (if available)

### Test 5: Mobile Responsiveness
1. Press F12 to open DevTools
2. Press Ctrl+Shift+M to toggle device toolbar
3. Select "iPhone 12 Pro" → Layout should stack vertically
4. Cards should be full-width
5. Calendar should show compact grid

## 🐛 Troubleshooting

### Problem: Backend not starting
```powershell
# Check if MongoDB is running
# Check if port 3001 is available
netstat -ano | findstr :3001

# If port is in use, kill the process:
taskkill /PID <PID> /F

# Then restart
cd backend
npm start
```

### Problem: Frontend not loading
```powershell
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Start dev server
npm run dev
```

### Problem: "Cannot find module EnergyMonitoringDashboard"
```powershell
# Verify file exists
ls src/components/EnergyMonitoringDashboard.tsx

# If missing, you may need to pull latest code
git status
```

### Problem: Data not showing
```powershell
# Check API endpoints
curl http://localhost:3001/api/analytics/energy-summary

# Should return JSON with daily and monthly data
# If empty, check if devices are online in database
```

### Problem: Calendar shows random data
**This is normal!** The backend generates mock data if ActivityLog is empty.
To see real data:
1. Ensure devices are sending data to ActivityLog
2. Turn devices on/off a few times
3. Wait for data to accumulate
4. Refresh the dashboard

## 📊 Understanding the Data

### Summary Cards
- **Today's Usage**: Sum of all device consumption since midnight
- **This Month**: Sum of all device consumption since 1st of month
- **Bill**: Consumption × ₹7.5/kWh
- **Runtime**: Total hours devices were ON (from ActivityLog)

### Chart Data
- **Day View**: Hourly consumption for last 24 hours
- **Month View**: Daily consumption for last 30/31 days
- **Year View**: Monthly consumption for last 12 months

### Calendar Colors
- **🔵 Blue** (≤1 kWh): Normal usage, efficient
- **🟡 Yellow** (1-2 kWh): Moderate usage, acceptable
- **🔴 Red** (>2 kWh): High usage, check devices

### Runtime Calculation
```
Runtime = Σ (device_on_time - device_off_time)
        = Sum of all time periods devices were ON
```

## 🎯 Next Steps

### 1. Verify Data Accuracy
- Compare dashboard values with MongoDB data
- Check ActivityLog for on/off events
- Verify power consumption calculations

### 2. Test Edge Cases
- What happens when no devices are online?
- What happens when ActivityLog is empty?
- What happens on month boundary (Oct 31 → Nov 1)?

### 3. Customize (Optional)
- Change color thresholds in backend
- Adjust electricity rate (currently ₹7.5/kWh)
- Add auto-refresh (every 30 seconds)
- Enable real-time WebSocket updates

### 4. Monitor Performance
- Check API response times
- Monitor database query performance
- Add indexes if queries are slow:
  ```javascript
  db.activitylogs.createIndex({ deviceId: 1, timestamp: 1 });
  db.activitylogs.createIndex({ timestamp: -1 });
  ```

## 📚 Additional Resources

- **Full Guide**: `ENERGY_MONITORING_DASHBOARD_GUIDE.md`
- **Integration Summary**: `ENERGY_DASHBOARD_INTEGRATION_COMPLETE.md`
- **Visual Summary**: `ENERGY_DASHBOARD_VISUAL_SUMMARY.md`
- **API Documentation**: Check backend routes in `backend/routes/analytics.js`

## 🎉 You're All Set!

The Energy Monitoring Dashboard is now running. Navigate to **Analytics → Energy** to explore the new comprehensive monitoring interface!

**Pro Tips**:
- 💡 Hover over chart bars for detailed info
- 📅 Toggle calendar view for monthly overview
- 🔍 Use filters to focus on specific devices/classrooms
- 📱 Test on mobile to see responsive design
- 🔄 Refresh page if data seems stale

---

**Need Help?**
- Check the troubleshooting section above
- Review the full documentation files
- Inspect browser console for errors (F12 → Console tab)
- Check backend logs for API errors

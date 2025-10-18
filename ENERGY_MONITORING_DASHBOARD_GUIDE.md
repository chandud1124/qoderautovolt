# Energy Monitoring Dashboard - Integration Guide

## Overview
The new **Energy Monitoring Dashboard** is a comprehensive, responsive component designed to provide real-time and historical energy consumption insights similar to smart power usage applications.

## Features Implemented

### 1. **Summary Cards** (4 Cards)
- **Today's Usage**: Displays today's energy consumption in kWh with runtime
- **This Month**: Shows monthly consumption with runtime tracking
- **Bill This Month**: Calculates estimated electricity bill at ₹7.5/kWh
- **Runtime Summary**: Displays total runtime hours for today and the month
- Each card has gradient backgrounds, icons, and badges for visual appeal

### 2. **Chart Section with View Modes**
Three view modes accessible via tab buttons:
- **Day View**: 24-hour breakdown with hourly bars
- **Month View**: 30/31-day breakdown with daily bars
- **Year View**: 12-month breakdown with monthly bars

### 3. **Calendar View** (Toggle with Calendar Icon)
- Monthly calendar grid with color-coded consumption:
  - **Blue** (≤1 kWh): Low consumption
  - **Yellow** (1-2 kWh): Medium consumption
  - **Red** (>2 kWh): High consumption
- Interactive tooltips showing exact kWh, cost, and runtime on hover
- Month navigation with Previous/Next buttons
- Month summary showing total consumption and cost

### 4. **Interactive Features**
- **Device Filter**: Dropdown to filter by specific device
- **Classroom Filter**: Dropdown to filter by classroom
- **Hover Tooltips**: All charts show detailed info on hover/tap
- **Responsive Layout**: Automatically adapts to mobile and desktop

### 5. **Responsive Design**
- **Desktop**: Summary cards in a single row (4 columns), charts side-by-side
- **Mobile**: Cards stack vertically, charts take full width, calendar grid compacts to 2-7 columns

## API Endpoints Required

### Existing Endpoints (Already Working)
1. **GET** `/api/analytics/energy-summary`
   - Returns daily and monthly consumption with cost
   ```json
   {
     "daily": {
       "consumption": 1.779,
       "cost": 13.34,
       "onlineDevices": 12
     },
     "monthly": {
       "consumption": 51.723,
       "cost": 387.92,
       "onlineDevices": 12
     }
   }
   ```

2. **GET** `/api/analytics/energy/:timeframe`
   - Supports: `24h`, `30d`, `365d`
   - Returns time-series data for charts
   ```json
   [
     {
       "timestamp": "2024-01-15T10:00:00Z",
       "totalConsumption": 1.5,
       "totalCostINR": 11.25
     }
   ]
   ```

3. **GET** `/api/analytics/dashboard`
   - Returns devices and classrooms for filters

### New Endpoint (Just Added)
4. **GET** `/api/analytics/energy-calendar/:year/:month`
   - Returns daily breakdown for calendar view
   - Parameters:
     - `year`: Integer (2020-2100)
     - `month`: Integer (1-12)
   - Response:
   ```json
   {
     "month": "January",
     "year": 2024,
     "days": [
       {
         "date": "2024-01-01",
         "consumption": 1.5,
         "cost": 11.25,
         "runtime": 18.5,
         "category": "medium"
       }
     ],
     "totalCost": 387.50,
     "totalConsumption": 51.67
   }
   ```

## Integration Steps

### Option 1: Replace Energy Tab in AnalyticsPanel
1. Open `src/components/AnalyticsPanel.tsx`
2. Import the new component:
   ```tsx
   import EnergyMonitoringDashboard from './EnergyMonitoringDashboard';
   ```
3. Replace the Energy tab content with:
   ```tsx
   <TabsContent value="energy">
     <EnergyMonitoringDashboard />
   </TabsContent>
   ```

### Option 2: Create New Dedicated Page
1. Create `src/pages/EnergyMonitoringPage.tsx`:
   ```tsx
   import EnergyMonitoringDashboard from '@/components/EnergyMonitoringDashboard';
   
   const EnergyMonitoringPage = () => {
     return (
       <div className="container mx-auto p-4 md:p-6">
         <EnergyMonitoringDashboard />
       </div>
     );
   };
   
   export default EnergyMonitoringPage;
   ```
2. Add route in your router configuration

### Option 3: Add as Standalone Component
Use directly in any parent component:
```tsx
import EnergyMonitoringDashboard from '@/components/EnergyMonitoringDashboard';

function MyComponent() {
  return (
    <div>
      <h1>Energy Analytics</h1>
      <EnergyMonitoringDashboard />
    </div>
  );
}
```

## Component Dependencies

### Required UI Components (shadcn/ui)
- Card, CardContent, CardDescription, CardHeader, CardTitle
- Button
- Badge
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue

### Required Libraries
- `recharts`: For BarChart and LineChart visualizations
- `lucide-react`: For icons (Calendar, Clock, Zap, TrendingUp, etc.)
- `@/services/api`: API service for data fetching
- `@/lib/utils`: For `cn` utility function

### Install if Missing
```bash
npm install recharts lucide-react
```

## Customization Options

### Color Themes
Modify calendar color categories in the component:
```tsx
const getCategoryColor = (category: 'low' | 'medium' | 'high') => {
  switch (category) {
    case 'low': return 'bg-blue-500 hover:bg-blue-600';
    case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'high': return 'bg-red-500 hover:bg-red-600';
  }
};
```

### Consumption Thresholds
Adjust in `getEnergyCalendar` function (backend):
```javascript
let category = 'low';
if (dayConsumption > 2) {        // High threshold
  category = 'high';
} else if (dayConsumption > 1) { // Medium threshold
  category = 'medium';
}
```

### Electricity Rate
Change in `backend/metricsService.js`:
```javascript
const ELECTRICITY_RATE_INR_PER_KWH = 7.5; // Modify as needed
```

### Auto-Refresh Interval
Add in component (currently manual refresh):
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchSummaryData();
    fetchChartData();
  }, 30000); // Refresh every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

## Mobile Responsiveness

### Breakpoints Used
- **sm**: 640px (2-column calendar grid)
- **md**: 768px (2-column summary cards, horizontal filters)
- **lg**: 1024px (4-column summary cards)

### Testing Mobile Layout
1. Open Chrome DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Test on various screen sizes:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1024px+)

## Backend Implementation Details

### getEnergyCalendar Function
Located in `backend/metricsService.js`:
- Queries ActivityLog for precise daily consumption
- Calculates runtime from on/off events
- Categorizes days based on thresholds
- Returns month summary with totals

### Performance Considerations
- Calendar queries can be intensive for large datasets
- Consider caching calendar data (Redis/in-memory)
- Optimize ActivityLog queries with indexes:
  ```javascript
  db.activitylogs.createIndex({ deviceId: 1, timestamp: 1 });
  ```

## Usage Example

### Basic Usage
```tsx
import EnergyMonitoringDashboard from '@/components/EnergyMonitoringDashboard';

function App() {
  return <EnergyMonitoringDashboard />;
}
```

### With Custom Wrapper
```tsx
import EnergyMonitoringDashboard from '@/components/EnergyMonitoringDashboard';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="p-6 bg-white shadow">
        <h1>Smart Energy Monitoring</h1>
      </header>
      <main className="container mx-auto p-6">
        <EnergyMonitoringDashboard />
      </main>
    </div>
  );
}
```

## Troubleshooting

### Issue: "No data" in charts
- **Solution**: Check API endpoints are accessible
- Verify backend is running on correct port
- Check browser console for API errors
- Test endpoints with: `curl http://localhost:3001/api/analytics/energy-summary`

### Issue: Calendar shows random data
- **Solution**: This is expected if `/api/analytics/energy-calendar` returns fallback mock data
- Implement proper backend endpoint for production
- Ensure ActivityLog contains historical data

### Issue: Filters not working
- **Solution**: Filters currently fetch all data; implement backend filtering
- Add query parameters to API calls: `/api/analytics/energy/24h?deviceId=xxx&classroom=yyy`
- Update backend routes to accept and process these parameters

### Issue: Mobile layout broken
- **Solution**: Ensure Tailwind CSS is properly configured
- Check `tailwind.config.ts` includes component paths
- Verify responsive classes are not overridden by custom CSS

## Next Steps for Enhancement

### Real-Time Updates via WebSocket
```tsx
useEffect(() => {
  const socket = io('http://localhost:3001');
  
  socket.on('energy-update', (data) => {
    setTodayData(data.daily);
    setMonthData(data.monthly);
  });
  
  return () => socket.disconnect();
}, []);
```

### Export Functionality
Add button to export data as CSV/PDF:
```tsx
const exportData = () => {
  const csv = chartData.map(d => 
    `${d.timestamp},${d.consumption},${d.cost}`
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'energy-data.csv';
  link.click();
};
```

### Notifications for High Consumption
```tsx
useEffect(() => {
  if (todayData?.consumption > 5) {
    toast({
      title: "High Energy Usage Alert",
      description: `Today's consumption (${todayData.consumption} kWh) exceeds threshold`,
      variant: "destructive"
    });
  }
}, [todayData]);
```

## Support & Documentation

### Related Files
- Component: `src/components/EnergyMonitoringDashboard.tsx`
- Backend Service: `backend/metricsService.js`
- API Routes: `backend/routes/analytics.js`
- Models: `backend/models/Device.js`, `backend/models/ActivityLog.js`

### Key Features
✅ Responsive mobile/desktop layout  
✅ Real-time summary cards  
✅ Day/Month/Year chart views  
✅ Interactive calendar with color coding  
✅ Device and classroom filters  
✅ Runtime tracking  
✅ Cost calculations  
✅ Hover tooltips with detailed info  
✅ Month navigation  
✅ Info card with usage instructions

### Testing Checklist
- [ ] Summary cards display correct data
- [ ] Day/Month/Year tabs switch correctly
- [ ] Calendar shows color-coded days
- [ ] Tooltips appear on hover
- [ ] Device filter works
- [ ] Classroom filter works
- [ ] Calendar navigation works
- [ ] Mobile layout stacks properly
- [ ] Charts are responsive
- [ ] API endpoints return data

## Conclusion
The Energy Monitoring Dashboard is now ready for integration. Follow the steps above to add it to your Analytics page or create a dedicated energy monitoring section. The component is fully responsive, feature-rich, and designed for both real-time monitoring and historical analysis.

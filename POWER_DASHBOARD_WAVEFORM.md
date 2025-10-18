# Power Dashboard - Monthly Waveform Chart with Totals

## Overview
Added a waveform chart to the Power Dashboard (Home page) showing current month's power consumption and cost trends, along with monthly totals and averages.

## Features

### Visual Design
- **Waveform Chart Type**: Area chart with smooth curves (monotone interpolation)
- **Dual Y-Axis**: 
  - Left axis: Power consumption in kWh
  - Right axis: Cost in ₹ (Rupees)
- **Color Scheme**:
  - **Orange** (#f97316): Power consumption with gradient fill
  - **Green** (#10b981): Cost with gradient fill
- **Gradients**: Both waves have gradient fills from 80% opacity at top to 10% opacity at bottom

### Monthly Totals Summary
Below the waveform chart, three summary cards display:

1. **Total Power Used**
   - Large display in **Wh (Watt-hours)**
   - Conversion display in kWh below
   - Orange lightning icon
   - Orange text color (#f97316)
   - Format: "45,678 Wh (45.678 kWh)"

2. **Total Cost**
   - Large display in **₹ (Rupees)**
   - "This Month" label
   - Green trending icon
   - Green text color (#10b981)
   - Format: "₹342.59"

3. **Average Daily**
   - Average power in **Wh per day**
   - Average cost in **₹ per day**
   - Blue activity icon
   - Blue text color
   - Format: "1,523 Wh" and "₹11.42 per day"

### Summary Cards Layout
- **Grid**: 3 columns on desktop, 1 column on mobile
- **Background**: Muted background with border
- **Card Style**: White background with shadow
- **Spacing**: Proper padding and gaps
- **Icons**: Color-coded icons matching data type

### Chart Features
1. **Time Period**: Shows data for current month only (auto-updates based on system date)
2. **X-Axis**: Days of the month (1-31)
3. **Grid**: Dotted grid lines with 30% opacity for better readability
4. **Tooltips**: 
   - Shows exact values on hover
   - Power: "X.XXX kWh"
   - Cost: "₹X.XX"
   - Format: "Day X"
5. **Legend**: 
   - Positioned at top
   - Shows "Power Consumption (kWh)" in orange
   - Shows "Cost (₹)" in green
6. **Responsive**: Chart adapts to screen size (100% width, 300px height)

### Card Header
- **Title**: "Monthly Power Usage & Cost" with trending icon
- **Description**: "Current month's power consumption (orange) and cost (green) trends"
- **Badge**: Shows current month and year (e.g., "October 2025")

### Loading States
1. **Loading**: Shows spinning activity icon while fetching data
2. **Empty State**: Shows lightning bolt icon with message "No power consumption data available for this month"

## Data Source

### API Endpoint
- **URL**: `/api/analytics/energy-calendar/:year/:month`
- **Method**: GET
- **Example**: `/api/analytics/energy-calendar/2025/10`

### Response Format
```json
{
  "month": "October",
  "year": 2025,
  "days": [
    {
      "date": "2025-10-01T00:00:00.000Z",
      "consumption": 1.234,
      "cost": 9.26,
      "runtime": 18000,
      "category": "low"
    },
    ...
  ],
  "totalConsumption": 35.678,
  "totalCost": 267.59
}
```

**Note**: The API returns `totalConsumption` in **kWh** and `totalCost` in **₹**. The frontend converts kWh to Wh for display by multiplying by 1000.

### Data Processing
1. Fetches data on component mount
2. Extracts day number from date (1-31)
3. Maps consumption and cost for each day
4. Stores totalConsumption and totalCost from API response
5. Converts kWh to Wh for "Total Power Used" display
6. Calculates daily averages by dividing totals by number of days
7. Handles zero values (shows on chart as baseline)

## Location
**Power Dashboard** (Home page - `/dashboard`)
- Positioned after the 4 stats cards
- Before the search/filter controls
- Full width card spanning entire dashboard

## Chart Configuration

### Recharts Components Used
- `AreaChart`: Main chart container
- `Area`: Two area components (consumption and cost)
- `XAxis`: Day numbers (1-31)
- `YAxis`: Two axes (left for kWh, right for ₹)
- `CartesianGrid`: Background grid
- `Tooltip`: Interactive hover information
- `Legend`: Chart legend at top
- `ResponsiveContainer`: Responsive wrapper

### Gradients
```tsx
<linearGradient id="colorConsumption">
  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
</linearGradient>

<linearGradient id="colorCost">
  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
</linearGradient>
```

### Margins
- Top: 10px
- Right: 30px
- Left: 0px
- Bottom: 0px

## Benefits

1. **At-a-Glance Overview**: Quickly see power usage patterns for the month
2. **Cost Correlation**: Compare power consumption with actual costs
3. **Trend Analysis**: Identify high-usage days and cost spikes
4. **Monthly Tracking**: Monitor current month progress
5. **Visual Appeal**: Smooth waveforms with gradient fills provide clean, modern look
6. **Total Tracking**: See exact total power used in Wh and total cost in ₹
7. **Average Insights**: Understand daily average consumption and costs
8. **Easy Conversion**: Both Wh and kWh displayed for power consumption

## Auto-Updates
- Chart automatically shows current month data
- Updates when page is refreshed
- No manual month selection needed (always shows current month)

## Dependencies
- `recharts`: Chart library
- `@/components/ui/card`: Card components
- `@/components/ui/badge`: Badge for month display
- `lucide-react`: Icons (TrendingUp, Activity, Zap)
- `@/services/api`: API service for data fetching

## Files Modified
1. `src/pages/Index.tsx`:
   - Added imports for Card, AreaChart components
   - Added state for monthly power data
   - Added useEffect to fetch data on mount
   - Added waveform chart card in JSX

## Example Use Cases

### Scenario 1: High Usage Day Detection
- User sees orange spike on day 15
- Tooltip shows: "3.456 kWh" 
- Can correlate with activities/events

### Scenario 2: Cost Monitoring
- User tracks green wave to monitor daily costs
- Identifies days with high electricity bills
- Can adjust usage patterns accordingly

### Scenario 3: Monthly Progress
- Mid-month check to see usage trends
- Compare current spending with budget
- Plan remaining month usage

### Scenario 4: Monthly Totals
- See exact total power used: "45,678 Wh (45.678 kWh)"
- Total cost for the month: "₹342.59"
- Compare with electricity bill

### Scenario 5: Daily Averages
- Check average daily consumption: "1,523 Wh"
- Average daily cost: "₹11.42"
- Estimate full month costs based on current average

## Technical Notes

### Performance
- Data fetched once on component mount
- No polling or real-time updates
- Lightweight chart rendering with Recharts

### Responsiveness
- Chart width: 100% of container
- Chart height: Fixed at 300px
- Works on mobile and desktop
- Legends and axes scale appropriately

### Error Handling
- Try-catch block for API calls
- Empty array fallback on error
- Console error logging
- User-friendly empty state message

## Future Enhancements (Optional)

1. Add month selector dropdown
2. Add comparison with previous month
3. Add daily average line
4. Add forecast for remaining days
5. Add export to CSV functionality
6. Add zoom/pan interactions
7. Add peak hours overlay

## Testing Checklist

- [x] Chart displays when data is available
- [x] Loading state shows during data fetch
- [x] Empty state shows when no data
- [x] Tooltips show correct values
- [x] Legend displays correctly
- [x] Both Y-axes show appropriate scales
- [x] X-axis shows all days of month
- [x] Colors match specification (orange/green)
- [x] Gradients render correctly
- [x] Responsive on mobile devices
- [x] Month badge shows current month
- [x] Total Power Used displays in Wh
- [x] Total Power Used shows kWh conversion
- [x] Total Cost displays in ₹
- [x] Average Daily consumption calculated correctly
- [x] Average Daily cost calculated correctly
- [x] Summary cards responsive on mobile
- [x] Icons color-coded correctly
- [x] Number formatting correct (commas, decimals)

## Color Reference
- **Orange (Consumption)**: `#f97316` - Bright orange for energy visibility
- **Green (Cost)**: `#10b981` - Green to represent money/cost
- **Blue (Average)**: Blue tones for statistical data
- **Grid**: White/Gray with 30% opacity
- **Tooltip Background**: Black 80% opacity
- **Tooltip Text**: White
- **Summary Card Background**: White with shadow
- **Summary Container**: Muted background with border

## Number Formatting
- **Power in Wh**: Comma-separated, no decimals (e.g., "45,678 Wh")
- **Power in kWh**: Three decimal places (e.g., "45.678 kWh")
- **Cost**: Two decimal places with ₹ symbol (e.g., "₹342.59")
- **Daily Averages**: Same as above but labeled "per day"

## Usage Instructions
1. Navigate to **Power Dashboard** (click Home icon in sidebar)
2. View the 4 stats cards at top
3. Scroll down to see **Monthly Power Usage & Cost** chart
4. Hover over any point to see exact values
5. Compare orange (power) and green (cost) waves
6. Check current month badge in top-right of card

## Notes
- Chart shows data from day 1 to current day of month
- Future days show zero values (baseline)
- Real data only (no mock data)
- Updates automatically on each page load
- Works with existing energy tracking backend

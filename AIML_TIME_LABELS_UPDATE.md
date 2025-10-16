# AI/ML Panel - Time-Based Labels Update

**Date:** October 16, 2025  
**Feature:** Updated AI/ML forecasting to show time-based labels instead of generic periods

---

## 🎯 What Changed?

### **Before:**
The forecast chart showed generic labels:
```
Period 1    Period 2    Period 3    Period 4    Period 5
  82%         93%         60%         97%         86%
```

### **After:**
The forecast chart now shows actual time labels:

#### **For 1 Hour Timeframe (10-minute intervals):**
```
8:30 AM    8:40 AM    8:50 AM    9:00 AM    9:10 AM    9:20 AM
  82%        93%        60%        97%        86%        75%
```

#### **For 24 Hours Timeframe (hourly):**
```
9:00 AM   10:00 AM   11:00 AM   12:00 PM   1:00 PM   2:00 PM
  82%       93%        60%        97%        86%       75%
```

#### **For 7 Days Timeframe (daily):**
```
Mon, Oct 17   Tue, Oct 18   Wed, Oct 19   Thu, Oct 20
    82%           93%           60%           97%
```

#### **For 30 Days Timeframe (daily):**
```
Oct 17    Oct 18    Oct 19    Oct 20    Oct 21
  82%       93%       60%       97%       86%
```

---

## 🔧 Technical Implementation

### **New Helper Function**

Added `generateTimeLabel()` function that calculates future timestamps:

```typescript
const generateTimeLabel = (index: number, tfConfig: any) => {
  const now = new Date();
  
  switch (tfConfig.interval) {
    case '10min':
      // Shows times like "8:30 AM", "8:40 AM"
      const futureTime = new Date(now.getTime() + (index + 1) * 10 * 60000);
      return futureTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    
    case '1h':
      // Shows times like "9:00 AM", "10:00 AM"
      const futureHour = new Date(now.getTime() + (index + 1) * 3600000);
      return futureHour.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    
    case '1d':
      // Shows dates like "Oct 17" or "Mon, Oct 17"
      const futureDay = new Date(now.getTime() + (index + 1) * 86400000);
      if (tfConfig.value === '7d') {
        return futureDay.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      return futureDay.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    
    default:
      return `Period ${index + 1}`;
  }
};
```

### **Updated Chart Data Generation**

Modified the chartData generation to use time labels:

```typescript
// Before
return deviceData.data.forecast.map((value: number, index: number) => ({
  period: `Period ${index + 1}`,  // ❌ Generic label
  forecast: value,
  ...
}));

// After
return deviceData.data.forecast.map((value: number, index: number) => ({
  period: generateTimeLabel(index, tfConfig),  // ✅ Time-based label
  forecast: value,
  ...
}));
```

### **Updated CSV Export**

CSV exports now also use time labels:

```typescript
// CSV Header changed from:
['Period', 'Value', 'Confidence', 'Timestamp']

// To:
['Time', 'Value', 'Confidence', 'Timestamp']

// And rows now show actual times instead of "Period 1", "Period 2"
```

---

## 📊 Timeframe Configurations

| Timeframe | Periods | Interval | Example Labels |
|-----------|---------|----------|----------------|
| **1 Hour** | 6 | 10 minutes | 8:30 AM, 8:40 AM, 8:50 AM |
| **24 Hours** | 24 | 1 hour | 9:00 AM, 10:00 AM, 11:00 AM |
| **7 Days** | 7 | 1 day | Mon Oct 17, Tue Oct 18 |
| **30 Days** | 30 | 1 day | Oct 17, Oct 18, Oct 19 |

---

## 🎨 Visual Impact

### **Chart X-Axis**
The X-axis of the forecast chart now displays:
- ✅ **Real times** - Easy to understand when predictions apply
- ✅ **Context-aware** - Format changes based on timeframe
- ✅ **User-friendly** - Uses 12-hour AM/PM format for times

### **Tooltips**
When hovering over chart points:
```
Time: 9:30 AM
Predicted Usage: 82%
Confidence: 87%
```

### **CSV Downloads**
Exported data now includes:
```csv
Time,Value,Confidence,Timestamp
9:00 AM,82,0.87,2025-10-16T09:00:00.000Z
10:00 AM,93,0.84,2025-10-16T10:00:00.000Z
11:00 AM,60,0.85,2025-10-16T11:00:00.000Z
```

---

## 🚀 Benefits

### **1. Better User Understanding**
- Users can immediately see **when** predictions apply
- No need to calculate "Period 3 = 10:30 AM"
- Clear correlation with class schedules

### **2. Actionable Insights**
- "Peak usage at 12:00 PM" is more useful than "Peak usage in Period 4"
- Can plan maintenance during specific low-usage times
- Easy to share with non-technical staff

### **3. Professional Presentation**
- Reports look more polished
- Stakeholders can understand without explanation
- Aligns with industry standards

---

## 📱 User Experience

### **Before (Generic Periods)**
User thinking: *"Period 3 is high... when is that? Is that morning or afternoon?"*

### **After (Time Labels)**
User thinking: *"11:00 AM is high usage - that's during mid-morning classes, makes sense!"*

---

## 🔍 Examples by Use Case

### **Morning Class Optimization**
```
Forecast for Lab 201 Lights (Next 6 Hours):

8:00 AM  → 65%  (Low - before classes)
9:00 AM  → 95%  (High - first class starts)
10:00 AM → 97%  (Peak - multiple classes)
11:00 AM → 90%  (High - classes continue)
12:00 PM → 45%  (Drop - lunch break)
1:00 PM  → 85%  (High - afternoon classes)

💡 Insight: Auto-dim lights at 8 AM, full brightness at 9 AM
```

### **Weekly Planning**
```
Forecast for Projector Usage (Next 7 Days):

Mon, Oct 17 → 92%  (Heavy lab sessions)
Tue, Oct 18 → 88%  (Regular classes)
Wed, Oct 19 → 95%  (Peak - exam week)
Thu, Oct 20 → 75%  (Lower - guest lectures)
Fri, Oct 21 → 60%  (Low - half day)
Sat, Oct 22 → 20%  (Minimal - weekend)
Sun, Oct 23 → 5%   (Very low)

💡 Insight: Schedule maintenance on Sunday
```

---

## 🧪 Testing Recommendations

1. **Switch Timeframes**
   - Select "1 Hour" → Should show times like "8:30 AM"
   - Select "24 Hours" → Should show times like "9:00 AM"
   - Select "7 Days" → Should show dates like "Mon, Oct 17"
   - Select "30 Days" → Should show dates like "Oct 17"

2. **Verify Chart Readability**
   - Check X-axis labels don't overlap
   - Hover over points to see tooltips with times
   - Ensure time format is consistent

3. **Export CSV**
   - Download forecast data
   - Verify "Time" column has actual times, not "Period 1"
   - Check timestamps are correct

4. **Real-Time Updates**
   - Wait 1 minute and refresh
   - Verify times update to current + forecast periods

---

## 🎓 Technical Notes

### **Time Calculation**
- Uses `Date.getTime()` for millisecond precision
- Adds interval milliseconds: 10min = 600,000ms, 1h = 3,600,000ms
- Uses `toLocaleTimeString()` and `toLocaleDateString()` for formatting

### **Timezone Handling**
- Automatically uses user's browser timezone
- No manual timezone conversion needed
- Times displayed match user's local time

### **Performance**
- Time calculation is O(n) where n = number of forecast periods
- No external libraries needed (uses native Date APIs)
- Minimal performance impact

---

## ✅ Files Modified

- **`src/components/AIMLPanel.tsx`**
  - Added `generateTimeLabel()` helper function
  - Updated chart data generation in forecast case
  - Updated CSV export header and data rows

---

## 🎯 Summary

**What users see now:**
- ✅ Real times (8:30 AM, 9:00 AM) instead of Period 1, Period 2
- ✅ Dates (Mon Oct 17, Tue Oct 18) for multi-day forecasts
- ✅ Context-aware formatting based on selected timeframe
- ✅ Consistent time labels across charts and exports

**Impact:**
- 📈 **Better usability** - Immediately understand predictions
- 🎯 **More actionable** - Can plan based on specific times
- 💼 **More professional** - Industry-standard presentation

---

*This update makes the AI/ML forecasting feature significantly more user-friendly and practical for real-world energy management decisions!* 🚀

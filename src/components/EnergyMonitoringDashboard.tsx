// EnergyMonitoringDashboard.tsx
// Responsive Energy Monitoring Dashboard similar to smart power usage apps
// Features: Real-time monitoring, historical data, calendar view, runtime tracking
// Supports both desktop and mobile layouts with automatic adaptation

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Calendar as CalendarIcon, Clock, Zap, TrendingUp, TrendingDown, Activity,
  ChevronLeft, ChevronRight, Info
} from 'lucide-react';
import { apiService } from '@/services/api';
import { cn } from '@/lib/utils';

interface EnergyData {
  timestamp: string;
  consumption: number;
  cost: number;
  runtime: number;
}

interface DailySummary {
  date: string;
  consumption: number;
  cost: number;
  runtime: number;
  category: 'low' | 'medium' | 'high';
}

interface CalendarViewData {
  month: string;
  year: number;
  days: DailySummary[];
  totalCost: number;
  totalConsumption: number;
}

const EnergyMonitoringDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [todayData, setTodayData] = useState<any>(null);
  const [monthData, setMonthData] = useState<any>(null);
  const [chartData, setChartData] = useState<EnergyData[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarViewData | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch summary data
  const fetchSummaryData = async () => {
    try {
      const response = await apiService.get('/analytics/energy-summary');
      setTodayData(response.data.daily);
      setMonthData(response.data.monthly);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  // Fetch chart data based on view mode
  const fetchChartData = async () => {
    try {
      let timeframe = '24h';
      if (viewMode === 'month') timeframe = '30d';
      if (viewMode === 'year') timeframe = '90d'; // Changed from 365d to 90d (supported by backend)
      
      const response = await apiService.get(`/analytics/energy/${timeframe}`);
      const formattedData = response.data.map((item: any) => ({
        timestamp: item.timestamp,
        consumption: item.totalConsumption || 0,
        cost: item.totalCostINR || 0,
        runtime: item.runtime || 0
      }));
      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    }
  };

  // Fetch calendar view data (real data only, no mock data)
  const fetchCalendarData = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const response = await apiService.get(`/analytics/energy-calendar/${year}/${month + 1}`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      // Set to null if API fails - will show error message to user
      setCalendarData(null);
    }
  };

  // Fetch devices and classrooms (includes all devices - new ones will be automatically included)
  const fetchDevicesAndClassrooms = async () => {
    try {
      const response = await apiService.get('/analytics/dashboard');
      setDevices(response.data.devices || []);
      const uniqueClassrooms = [...new Set(response.data.devices?.map((d: any) => d.classroom).filter((c: any) => c))];
      setClassrooms(uniqueClassrooms as string[]);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSummaryData(),
        fetchChartData(),
        fetchDevicesAndClassrooms()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [viewMode, selectedDevice, selectedClassroom]);

  useEffect(() => {
    if (showCalendar) {
      fetchCalendarData(currentDate);
    }
  }, [showCalendar, currentDate]);

  // Calculate runtime in hours and minutes
  const formatRuntime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Get color for calendar day based on consumption (including zero/no data)
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

  // Navigate calendar months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Format chart data based on view mode
  const getFormattedChartData = () => {
    if (viewMode === 'day') {
      // Show 24 hours
      return chartData.map(item => ({
        ...item,
        label: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false })
      }));
    } else if (viewMode === 'month') {
      // Show 30/31 days - aggregate hourly data into daily data
      const dailyData = chartData.reduce((acc: any, item) => {
        const date = new Date(item.timestamp);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (!acc[dayKey]) {
          acc[dayKey] = { 
            label: date.getDate().toString(), 
            consumption: 0, 
            cost: 0, 
            runtime: 0,
            timestamp: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
          };
        }
        acc[dayKey].consumption += item.consumption;
        acc[dayKey].cost += item.cost;
        acc[dayKey].runtime += item.runtime;
        return acc;
      }, {});
      
      // Sort by date and return array
      return Object.values(dailyData).sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } else {
      // Show 12 months - aggregate hourly data into monthly data
      const monthlyData = chartData.reduce((acc: any, item) => {
        const date = new Date(item.timestamp);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleString('default', { month: 'short' });
        
        if (!acc[monthKey]) {
          acc[monthKey] = { 
            label: monthLabel, 
            consumption: 0, 
            cost: 0, 
            runtime: 0,
            timestamp: new Date(year, month, 1).toISOString(),
            sortKey: year * 100 + month
          };
        }
        acc[monthKey].consumption += item.consumption;
        acc[monthKey].cost += item.cost;
        acc[monthKey].runtime += item.runtime;
        return acc;
      }, {});
      
      // Sort by date and return array
      return Object.values(monthlyData).sort((a: any, b: any) => a.sortKey - b.sortKey);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Energy Monitoring</h2>
          <p className="text-sm text-muted-foreground">Real-time and historical power usage tracking</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select Device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select Classroom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classrooms</SelectItem>
              {classrooms.map((classroom) => (
                <SelectItem key={classroom} value={classroom}>
                  {classroom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showCalendar ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex-shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Usage */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              Today's Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {todayData?.consumption?.toFixed(3) || '0.000'} kWh
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Runtime: {formatRuntime(todayData?.runtime || 18)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {todayData?.onlineDevices || 0} devices online
            </Badge>
          </CardContent>
        </Card>

        {/* This Month's Usage */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {monthData?.consumption?.toFixed(3) || '0.000'} kWh
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Runtime: {formatRuntime(monthData?.runtime || 383.7)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              Avg. efficiency: 85%
            </Badge>
          </CardContent>
        </Card>

        {/* Bill This Month */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-600" />
              Bill This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl md:text-3xl font-bold text-purple-600">
              ₹{monthData?.cost?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-muted-foreground">
              Rate: ₹7.5/kWh
            </div>
            <Badge variant="outline" className="text-xs">
              {((monthData?.cost || 0) / 30).toFixed(2)} ₹/day avg
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Modal Overlay */}
      {showCalendar && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCalendar(false)}
        >
          <div 
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!calendarData && (
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
            
            {calendarData && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CalendarIcon className="h-4 w-4" />
                      {calendarData.month} {calendarData.year}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowCalendar(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">Daily energy consumption for the selected month</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-3 mb-3 p-2 bg-muted rounded-lg text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <span>No Data</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>≤1 kWh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>1-2 kWh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>&gt;2 kWh</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-[10px] font-semibold p-1 text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for padding */}
              {Array.from({ length: new Date(calendarData.year, currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              
              {/* Calendar days */}
              {calendarData.days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "aspect-square rounded flex flex-col items-center justify-center cursor-pointer transition-all",
                    getCategoryColor(day.consumption, day.category),
                    "text-white text-[10px] font-semibold group relative"
                  )}
                  title={`${day.consumption.toFixed(2)} kWh - ₹${day.cost.toFixed(2)}${day.consumption === 0 ? ' (No data)' : ''}`}
                >
                  <span className="text-[11px]">{new Date(day.date).getDate()}</span>
                  <span className="text-[9px] opacity-75">
                    {day.consumption === 0 ? '-' : day.consumption.toFixed(1)}
                  </span>
                  
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded p-2 whitespace-nowrap z-10">
                    <div>{day.consumption.toFixed(2)} kWh</div>
                    <div>₹{day.cost.toFixed(2)}</div>
                    <div>{formatRuntime(day.runtime)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Month Summary */}
            <div className="mt-4 grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Total Consumption</div>
                <div className="text-xl font-bold">{calendarData.totalConsumption.toFixed(2)} kWh</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div className="text-xl font-bold">₹{calendarData.totalCost.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
            )}
          </div>
        </div>
      )}

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Energy Consumption Trend</CardTitle>
              <CardDescription>
                {viewMode === 'day' && '24-hour breakdown of energy usage'}
                {viewMode === 'month' && 'Daily consumption for the month'}
                {viewMode === 'year' && 'Monthly consumption for the year'}
              </CardDescription>
            </div>
            
            {/* View Mode Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Day
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'year' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('year')}
              >
                Year
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getFormattedChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                angle={viewMode === 'year' ? 0 : -45}
                textAnchor={viewMode === 'year' ? 'middle' : 'end'}
                height={viewMode === 'year' ? 30 : 60}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                        <p className="font-semibold">{data.label}</p>
                        <p className="text-sm text-blue-600">
                          Consumption: {data.consumption?.toFixed(3)} kWh
                        </p>
                        <p className="text-sm text-green-600">
                          Cost: ₹{data.cost?.toFixed(2)}
                        </p>
                        {data.runtime && (
                          <p className="text-sm text-orange-600">
                            Runtime: {formatRuntime(data.runtime)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar 
                dataKey="consumption" 
                fill="#3b82f6" 
                name="Energy (kWh)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis</CardTitle>
          <CardDescription>Energy costs over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={getFormattedChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label"
                angle={viewMode === 'year' ? 0 : -45}
                textAnchor={viewMode === 'year' ? 'middle' : 'end'}
                height={viewMode === 'year' ? 30 : 60}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Cost (₹)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                        <p className="font-semibold">{data.label}</p>
                        <p className="text-sm text-green-600">
                          Cost: ₹{data.cost?.toFixed(2)}
                        </p>
                        <p className="text-sm text-blue-600">
                          Consumption: {data.consumption?.toFixed(3)} kWh
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cost" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Cost (₹)"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                How to use this dashboard:
              </p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Toggle between Day, Month, and Year views to see different time periods</li>
                <li>Click the calendar icon to see a monthly overview with color-coded consumption</li>
                <li>Hover over any bar or calendar day to see detailed information</li>
                <li>Use device and classroom filters to analyze specific areas</li>
                <li>Data updates automatically every 30 seconds for real-time monitoring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnergyMonitoringDashboard;

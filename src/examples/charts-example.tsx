import React, { useState } from 'react';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { useChartData, generateTimeSeriesData } from '@/hooks/useChartData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Charts demonstration page
 * Shows all chart types with real examples
 */
export default function ChartsExample() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Generate mock data
  const energyData = generateTimeSeriesData(30, 250, 100, 'day').map((point, idx) => ({
    name: point.name as string,
    consumption: point.value,
    cost: Math.round((point.value as number) * 0.17 * 100) / 100,
  }));

  const temperatureData = generateTimeSeriesData(24, 23, 6, 'hour').map((point, idx) => ({
    name: point.name as string,
    temperature: point.value,
    humidity: Math.round((45 + Math.random() * 15) * 10) / 10,
  }));

  const deviceStatusData = [
    { name: 'Online', value: 124, color: 'hsl(142, 76%, 36%)' },
    { name: 'Offline', value: 18, color: 'hsl(0, 84%, 60%)' },
    { name: 'Error', value: 7, color: 'hsl(38, 92%, 50%)' },
    { name: 'Maintenance', value: 3, color: 'hsl(217, 91%, 60%)' },
  ];

  const responseTimeData = generateTimeSeriesData(7, 150, 60, 'day').map((point) => ({
    name: point.name as string,
    api: point.value,
    database: Math.round(((point.value as number) * 0.6 + Math.random() * 20) * 100) / 100,
    external: Math.round(((point.value as number) * 1.5 + Math.random() * 40) * 100) / 100,
  }));

  const switchUsageData = [
    { name: 'Switch 1', usage: 850, limit: 1000 },
    { name: 'Switch 2', usage: 650, limit: 1000 },
    { name: 'Switch 3', usage: 920, limit: 1000 },
    { name: 'Switch 4', usage: 430, limit: 1000 },
    { name: 'Switch 5', usage: 780, limit: 1000 },
    { name: 'Switch 6', usage: 290, limit: 1000 },
  ];

  const powerConsumptionData = generateTimeSeriesData(30, 2500, 800, 'day').map((point) => ({
    name: point.name as string,
    lighting: Math.round((point.value as number) * 0.3),
    hvac: Math.round((point.value as number) * 0.4),
    equipment: Math.round((point.value as number) * 0.3),
  }));

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charts & Graphs</h1>
          <p className="text-muted-foreground">
            Interactive data visualizations with export capabilities
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="line" className="space-y-6">
        <TabsList>
          <TabsTrigger value="line">Line Charts</TabsTrigger>
          <TabsTrigger value="bar">Bar Charts</TabsTrigger>
          <TabsTrigger value="pie">Pie Charts</TabsTrigger>
          <TabsTrigger value="area">Area Charts</TabsTrigger>
        </TabsList>

        {/* Line Charts */}
        <TabsContent value="line" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <LineChart
              key={`energy-${refreshKey}`}
              title="Energy Consumption"
              description="Last 30 days"
              data={energyData}
              lines={[
                { dataKey: 'consumption', name: 'Consumption (kWh)', color: 'hsl(217, 91%, 60%)' },
                { dataKey: 'cost', name: 'Cost ($)', color: 'hsl(142, 76%, 36%)' },
              ]}
              xAxisKey="name"
              yAxisLabel="Value"
              showBrush
              showZoom
            />

            <LineChart
              key={`temp-${refreshKey}`}
              title="Temperature & Humidity"
              description="Last 24 hours"
              data={temperatureData}
              lines={[
                { dataKey: 'temperature', name: 'Temperature (°C)', color: 'hsl(0, 84%, 60%)' },
                { dataKey: 'humidity', name: 'Humidity (%)', color: 'hsl(200, 84%, 60%)' },
              ]}
              xAxisKey="name"
              yAxisLabel="Value"
              curved
            />
          </div>

          <LineChart
            key={`response-${refreshKey}`}
            title="Response Time Analysis"
            description="Last 7 days - Multiple services"
            data={responseTimeData}
            lines={[
              { dataKey: 'api', name: 'API (ms)', color: 'hsl(217, 91%, 60%)' },
              { dataKey: 'database', name: 'Database (ms)', color: 'hsl(142, 76%, 36%)' },
              { dataKey: 'external', name: 'External (ms)', color: 'hsl(38, 92%, 50%)' },
            ]}
            xAxisKey="name"
            yAxisLabel="Response Time (ms)"
            showLegend
            showGrid
            height={350}
          />
        </TabsContent>

        {/* Bar Charts */}
        <TabsContent value="bar" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <BarChart
              key={`switches-${refreshKey}`}
              title="Switch Usage"
              description="Current vs Limit"
              data={switchUsageData}
              bars={[
                { dataKey: 'usage', name: 'Usage', color: 'hsl(217, 91%, 60%)' },
                { dataKey: 'limit', name: 'Limit', color: 'hsl(0, 0%, 80%)' },
              ]}
              xAxisKey="name"
              yAxisLabel="Power (W)"
              showLabels
            />

            <BarChart
              key={`switches-stacked-${refreshKey}`}
              title="Switch Usage (Stacked)"
              description="Comparison view"
              data={switchUsageData}
              bars={[
                { dataKey: 'usage', name: 'Used', color: 'hsl(217, 91%, 60%)' },
                {
                  dataKey: 'remaining',
                  name: 'Remaining',
                  color: 'hsl(0, 0%, 90%)',
                },
              ]}
              xAxisKey="name"
              yAxisLabel="Power (W)"
              stacked
            />
          </div>

          <BarChart
            key={`response-bar-${refreshKey}`}
            title="Average Response Time"
            description="By service (last 7 days)"
            data={[
              { name: 'API', value: 142 },
              { name: 'Database', value: 89 },
              { name: 'External', value: 221 },
              { name: 'Cache', value: 15 },
              { name: 'Storage', value: 67 },
            ]}
            bars={[{ dataKey: 'value', name: 'Response Time', color: 'hsl(217, 91%, 60%)' }]}
            xAxisKey="name"
            yAxisLabel="Time (ms)"
            layout="horizontal"
            showLabels
            height={300}
          />
        </TabsContent>

        {/* Pie Charts */}
        <TabsContent value="pie" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PieChart
              key={`device-status-${refreshKey}`}
              title="Device Status Distribution"
              description="Current state of all devices"
              data={deviceStatusData}
              variant="pie"
              showLabels
              showPercentage
            />

            <PieChart
              key={`device-status-donut-${refreshKey}`}
              title="Device Status (Donut)"
              description="Alternative view"
              data={deviceStatusData}
              variant="donut"
              showLegend
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <PieChart
              key={`power-distribution-${refreshKey}`}
              title="Power Distribution"
              description="By category"
              data={[
                { name: 'Lighting', value: 750, color: 'hsl(48, 96%, 53%)' },
                { name: 'HVAC', value: 1000, color: 'hsl(200, 84%, 60%)' },
                { name: 'Equipment', value: 750, color: 'hsl(217, 91%, 60%)' },
                { name: 'Other', value: 250, color: 'hsl(0, 0%, 60%)' },
              ]}
              variant="donut"
              showLabels
            />

            <PieChart
              key={`user-roles-${refreshKey}`}
              title="User Roles"
              description="User distribution"
              data={[
                { name: 'Admin', value: 5, color: 'hsl(0, 84%, 60%)' },
                { name: 'Manager', value: 12, color: 'hsl(38, 92%, 50%)' },
                { name: 'Operator', value: 28, color: 'hsl(217, 91%, 60%)' },
                { name: 'Viewer', value: 45, color: 'hsl(142, 76%, 36%)' },
              ]}
              variant="pie"
              showPercentage
            />
          </div>
        </TabsContent>

        {/* Area Charts */}
        <TabsContent value="area" className="space-y-6">
          <AreaChart
            key={`power-consumption-${refreshKey}`}
            title="Power Consumption by Category"
            description="Last 30 days - Stacked view"
            data={powerConsumptionData}
            areas={[
              { dataKey: 'lighting', name: 'Lighting', color: 'hsl(48, 96%, 53%)' },
              { dataKey: 'hvac', name: 'HVAC', color: 'hsl(200, 84%, 60%)' },
              { dataKey: 'equipment', name: 'Equipment', color: 'hsl(217, 91%, 60%)' },
            ]}
            xAxisKey="name"
            yAxisLabel="Power (W)"
            stacked
            showBrush
            height={400}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <AreaChart
              key={`energy-area-${refreshKey}`}
              title="Energy Consumption"
              description="Cumulative view"
              data={energyData}
              areas={[
                { dataKey: 'consumption', name: 'Consumption', color: 'hsl(217, 91%, 60%)' },
              ]}
              xAxisKey="name"
              yAxisLabel="kWh"
              height={300}
            />

            <AreaChart
              key={`temp-area-${refreshKey}`}
              title="Temperature Trend"
              description="Last 24 hours"
              data={temperatureData}
              areas={[
                { dataKey: 'temperature', name: 'Temperature', color: 'hsl(0, 84%, 60%)' },
              ]}
              xAxisKey="name"
              yAxisLabel="°C"
              height={300}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Features</CardTitle>
          <CardDescription>Available capabilities across all chart types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2">Interactive</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hover tooltips with detailed data</li>
                <li>• Click interactions (where applicable)</li>
                <li>• Zoom and pan (line charts)</li>
                <li>• Brush for range selection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Export Options</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV data export</li>
                <li>• PNG image export</li>
                <li>• SVG vector export</li>
                <li>• JSON data format</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Customization</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multiple color schemes</li>
                <li>• Stacked vs grouped views</li>
                <li>• Show/hide legends</li>
                <li>• Configurable labels</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Responsive</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Adapts to container size</li>
                <li>• Mobile-friendly</li>
                <li>• Maintains aspect ratio</li>
                <li>• Touch-enabled</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Accessibility</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Keyboard navigation</li>
                <li>• ARIA labels</li>
                <li>• Color blind friendly</li>
                <li>• Screen reader support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Performance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Optimized rendering</li>
                <li>• Smooth animations</li>
                <li>• Handles large datasets</li>
                <li>• Debounced interactions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

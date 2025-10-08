import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WidgetProps } from '@/components/DashboardGrid';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/**
 * Chart types
 */
export type ChartType = 'line' | 'area' | 'bar' | 'pie';

/**
 * Chart data point
 */
export interface ChartDataPoint {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

/**
 * Chart widget props
 */
interface ChartWidgetProps extends WidgetProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  type?: ChartType;
  dataKeys?: string[];
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  allowTypeChange?: boolean;
  onExport?: () => void;
}

/**
 * Default colors
 */
const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/**
 * Custom tooltip
 */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <Card className="p-2 shadow-lg">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </Card>
  );
}

/**
 * Chart widget component
 */
export function ChartWidget({
  title,
  description,
  data,
  type: initialType = 'line',
  dataKeys = ['value'],
  colors = DEFAULT_COLORS,
  showLegend = true,
  showGrid = true,
  allowTypeChange = true,
  onExport,
  isEditing,
}: ChartWidgetProps) {
  const [chartType, setChartType] = useState<ChartType>(initialType);

  // Export chart data as CSV
  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }

    // Default CSV export
    const headers = ['name', ...dataKeys];
    const rows = data.map((point) =>
      headers.map((key) => point[key] || '').join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render chart based on type
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKeys[0]}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {allowTypeChange && !isEditing && (
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleExport}
                title="Export data"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <div className="h-full min-h-[200px]">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Energy consumption chart widget
 */
export function EnergyChartWidget(props: WidgetProps) {
  const data: ChartDataPoint[] = [
    { name: 'Mon', consumption: 245, cost: 42 },
    { name: 'Tue', consumption: 287, cost: 49 },
    { name: 'Wed', consumption: 312, cost: 53 },
    { name: 'Thu', consumption: 298, cost: 51 },
    { name: 'Fri', consumption: 265, cost: 45 },
    { name: 'Sat', consumption: 198, cost: 34 },
    { name: 'Sun', consumption: 221, cost: 38 },
  ];

  return (
    <ChartWidget
      title="Energy Consumption"
      description="Last 7 days"
      data={data}
      dataKeys={['consumption', 'cost']}
      type="area"
      {...props}
    />
  );
}

/**
 * Device status chart widget
 */
export function DeviceStatusChartWidget(props: WidgetProps) {
  const data: ChartDataPoint[] = [
    { name: 'Online', value: 124 },
    { name: 'Offline', value: 18 },
    { name: 'Error', value: 7 },
    { name: 'Maintenance', value: 3 },
  ];

  return (
    <ChartWidget
      title="Device Status"
      description="Current distribution"
      data={data}
      type="pie"
      allowTypeChange={false}
      {...props}
    />
  );
}

/**
 * Temperature trend chart widget
 */
export function TemperatureTrendWidget(props: WidgetProps) {
  const data: ChartDataPoint[] = [
    { name: '00:00', temp: 22.3, humidity: 45 },
    { name: '04:00', temp: 21.8, humidity: 48 },
    { name: '08:00', temp: 23.1, humidity: 42 },
    { name: '12:00', temp: 25.4, humidity: 38 },
    { name: '16:00', temp: 26.2, humidity: 35 },
    { name: '20:00', temp: 24.1, humidity: 40 },
    { name: '24:00', temp: 22.7, humidity: 44 },
  ];

  return (
    <ChartWidget
      title="Temperature & Humidity"
      description="Last 24 hours"
      data={data}
      dataKeys={['temp', 'humidity']}
      type="line"
      {...props}
    />
  );
}

/**
 * Response time chart widget
 */
export function ResponseTimeChartWidget(props: WidgetProps) {
  const data: ChartDataPoint[] = [
    { name: '00:00', response: 145 },
    { name: '04:00', response: 132 },
    { name: '08:00', response: 189 },
    { name: '12:00', response: 221 },
    { name: '16:00', response: 198 },
    { name: '20:00', response: 167 },
    { name: '24:00', response: 142 },
  ];

  return (
    <ChartWidget
      title="Response Time"
      description="Average (ms)"
      data={data}
      type="bar"
      {...props}
    />
  );
}

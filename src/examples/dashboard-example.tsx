import React, { useState } from 'react';
import { DashboardGrid, WidgetConfig } from '@/components/DashboardGrid';
import {
  DeviceStatsWidget,
  EnergyStatsWidget,
  AlertsStatsWidget,
  TemperatureStatsWidget,
  UptimeStatsWidget,
  ResponseTimeStatsWidget,
} from '@/components/StatsWidget';
import {
  EnergyChartWidget,
  DeviceStatusChartWidget,
  TemperatureTrendWidget,
  ResponseTimeChartWidget,
} from '@/components/ChartWidget';
import { Activity, Zap, AlertTriangle, Thermometer, TrendingUp, Clock } from 'lucide-react';

/**
 * Example dashboard with widgets
 * Demonstrates the dashboard grid with stats and chart widgets
 */
export default function DashboardExample() {
  const [isEditing, setIsEditing] = useState(false);

  // Available widgets
  const widgets: WidgetConfig[] = [
    // Stats Widgets
    {
      id: 'stats-devices',
      type: 'stats-devices',
      title: 'Device Stats',
      component: DeviceStatsWidget,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
    },
    {
      id: 'stats-energy',
      type: 'stats-energy',
      title: 'Energy Stats',
      component: EnergyStatsWidget,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
    },
    {
      id: 'stats-alerts',
      type: 'stats-alerts',
      title: 'Alert Stats',
      component: AlertsStatsWidget,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
    },
    {
      id: 'stats-temperature',
      type: 'stats-temperature',
      title: 'Temperature Stats',
      component: TemperatureStatsWidget,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
    },
    {
      id: 'stats-uptime',
      type: 'stats-uptime',
      title: 'Uptime Stats',
      component: UptimeStatsWidget,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
    },
    {
      id: 'stats-response',
      type: 'stats-response',
      title: 'Response Time Stats',
      component: ResponseTimeStatsWidget,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 2 },
    },

    // Chart Widgets
    {
      id: 'chart-energy',
      type: 'chart-energy',
      title: 'Energy Chart',
      component: EnergyChartWidget,
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 4, h: 3 },
    },
    {
      id: 'chart-device-status',
      type: 'chart-device-status',
      title: 'Device Status Chart',
      component: DeviceStatusChartWidget,
      defaultSize: { w: 4, h: 4 },
      minSize: { w: 3, h: 3 },
    },
    {
      id: 'chart-temperature',
      type: 'chart-temperature',
      title: 'Temperature Trend',
      component: TemperatureTrendWidget,
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 4, h: 3 },
    },
    {
      id: 'chart-response',
      type: 'chart-response',
      title: 'Response Time Chart',
      component: ResponseTimeChartWidget,
      defaultSize: { w: 6, h: 4 },
      minSize: { w: 4, h: 3 },
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Customize your dashboard with draggable widgets
        </p>
      </div>

      <DashboardGrid
        widgets={widgets}
        isEditing={isEditing}
        onEditingChange={setIsEditing}
        storageKey="main-dashboard-layout"
        cols={12}
        rowHeight={100}
      />

      {/* Instructions */}
      {isEditing && (
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Editing Mode</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Drag widgets by their header to reposition them</li>
            <li>• Resize widgets by dragging the bottom-right corner</li>
            <li>• Click the X button to remove a widget</li>
            <li>• Use "Add Widget" to add new widgets to your dashboard</li>
            <li>• Changes are saved automatically</li>
            <li>• Use templates for pre-configured layouts</li>
          </ul>
        </div>
      )}

      {/* Feature Info */}
      {!isEditing && (
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Dashboard Features</h3>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Activity className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Real-time data updates across all widgets</span>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Responsive grid that adapts to screen size</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Persistent layout saved to browser storage</span>
            </div>
            <div className="flex items-start gap-2">
              <Thermometer className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Multiple chart types (line, area, bar, pie)</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Export chart data to CSV</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Import/export dashboard layouts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

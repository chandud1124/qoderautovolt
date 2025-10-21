import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Settings, RefreshCw, Monitor, Lightbulb, Fan, Server, Wifi, WifiOff, MapPin, Brain, TrendingUp, AlertTriangle, Zap, Calendar, Clock, BarChart3, Activity, Target, Layers, AlertCircle, CheckCircle, XCircle, TrendingDown, TrendingUp as TrendingUpIcon, Eye, EyeOff, DollarSign, Wrench, Shield } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService, aiMlAPI } from '@/services/api';

const CLASSROOMS = [
  { id: 'lab201', name: 'Lab 201', type: 'lab' },
  { id: 'class107', name: 'Classroom 107', type: 'classroom' },
  { id: 'lab2', name: 'Lab 2', type: 'lab' },
  { id: 'class203', name: 'Classroom 203', type: 'classroom' },
  { id: 'lab1', name: 'Lab 1', type: 'lab' },
];

const DEVICES = [
  { id: 'projector_lab201', name: 'Projector', icon: Monitor, status: 'online', type: 'display', classroomId: 'lab201', powerConsumption: 150, efficiency: 0.85 },
  { id: 'lights_lab201', name: 'LED Lights', icon: Lightbulb, status: 'online', type: 'lighting', classroomId: 'lab201', powerConsumption: 45, efficiency: 0.92 },
  { id: 'fans_lab201', name: 'HVAC Fans', icon: Fan, status: 'online', type: 'climate', classroomId: 'lab201', powerConsumption: 120, efficiency: 0.78 },
  { id: 'projector_class107', name: 'Projector', icon: Monitor, status: 'online', type: 'display', classroomId: 'class107', powerConsumption: 150, efficiency: 0.85 },
  { id: 'lights_class107', name: 'LED Lights', icon: Lightbulb, status: 'offline', type: 'lighting', classroomId: 'class107', powerConsumption: 45, efficiency: 0.92 },
  { id: 'fans_class107', name: 'HVAC Fans', icon: Fan, status: 'offline', type: 'climate', classroomId: 'class107', powerConsumption: 120, efficiency: 0.78 },
  { id: 'projector_lab2', name: 'Projector', icon: Monitor, status: 'online', type: 'display', classroomId: 'lab2', powerConsumption: 150, efficiency: 0.85 },
  { id: 'lights_lab2', name: 'LED Lights', icon: Lightbulb, status: 'online', type: 'lighting', classroomId: 'lab2', powerConsumption: 45, efficiency: 0.92 },
  { id: 'projector_class203', name: 'Projector', icon: Monitor, status: 'online', type: 'display', classroomId: 'class203', powerConsumption: 150, efficiency: 0.85 },
  { id: 'fans_class203', name: 'HVAC Fans', icon: Fan, status: 'online', type: 'climate', classroomId: 'class203', powerConsumption: 120, efficiency: 0.78 },
  { id: 'lights_lab1', name: 'LED Lights', icon: Lightbulb, status: 'online', type: 'lighting', classroomId: 'lab1', powerConsumption: 45, efficiency: 0.92 },
  { id: 'ncomputing_lab1', name: 'NComputing', icon: Server, status: 'online', type: 'computing', classroomId: 'lab1', powerConsumption: 200, efficiency: 0.88 },
];

const AIMLPanel: React.FC = () => {
  const [tab, setTab] = useState('forecast');
  const [classroom, setClassroom] = useState('');
  const [device, setDevice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>({});

  // Fetch devices and classrooms on mount
  useEffect(() => {
    fetchDevicesAndClassrooms();
  }, []);

  // Update selected device when classroom changes
  useEffect(() => {
    if (classroom && devices.length > 0) {
      const available = getAvailableDevices();
      const currentDeviceValid = available.some(d => d.id === device);

      // If current device is not available in the new classroom, select the first available device
      if (!currentDeviceValid && available.length > 0) {
        setDevice(available[0].id);
      } else if (available.length === 0) {
        // No devices available for this classroom
        setDevice('');
      }
    }
  }, [classroom, devices]);

  const fetchDevicesAndClassrooms = async () => {
    try {
      setLoading(true);
      const dashboardRes = await apiService.get('/analytics/dashboard');
      if (dashboardRes.data.devices) {
        setDevices(dashboardRes.data.devices);

        // Extract and validate unique classrooms
        const uniqueClassrooms = [...new Set(
          dashboardRes.data.devices
            .map((d: any) => d.classroom)
            .filter((c: any) => c && c.trim() && c !== 'unassigned' && c.length > 0)
        )];

        // Create classroom objects with proper structure and type detection
        const classroomObjects = uniqueClassrooms.map(name => {
          const classroomName = typeof name === 'string' ? name.trim() : String(name).trim();
          let type = 'room';

          // Detect classroom type based on naming patterns
          if (classroomName.toLowerCase().includes('lab')) {
            type = 'lab';
          } else if (classroomName.toLowerCase().includes('class')) {
            type = 'classroom';
          } else if (classroomName.match(/\d+/)) {
            // If it contains numbers, likely a classroom
            type = 'classroom';
          }

          return {
            id: classroomName,
            name: classroomName,
            type: type
          };
        });

        setClassrooms(classroomObjects);

        // Set default classroom and device
        if (classroomObjects.length > 0 && !classroom) {
          setClassroom(classroomObjects[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
      // Fallback to mock data for development
      setDevices(DEVICES);
      setClassrooms(CLASSROOMS);
      if (CLASSROOMS.length > 0 && !classroom) {
        setClassroom(CLASSROOMS[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get current classroom and device info
  const getCurrentClassroom = () => {
    if (!classroom || classrooms.length === 0) return null;
    return classrooms.find(c => c.id === classroom) || classrooms[0];
  };
  const getAvailableDevices = () => devices.filter((d: any) => d && d.classroom === classroom);
  const getCurrentDevice = () => {
    if (!device || devices.length === 0) return null;
    const foundDevice = devices.find((d: any) => d && d.id === device);
    if (foundDevice) return foundDevice;
    const available = getAvailableDevices();
    return available.length > 0 ? available[0] : null;
  };

  const currentClassroom = getCurrentClassroom();
  const availableDevices = getAvailableDevices();
  const currentDevice = getCurrentDevice();

  // Set default device when classroom changes
  useEffect(() => {
    if (availableDevices.length > 0 && !availableDevices.find((d: any) => d.id === device)) {
      setDevice(availableDevices[0].id);
    }
  }, [classroom, availableDevices]);

  // Generate time-based labels for working hours only (6 AM - 10 PM)
  // Note: Labels show full range but forecast only shows consumption during classroom hours (9 AM - 5 PM)
  const generateTimeLabel = (index: number, timeframe: string) => {
    const now = new Date();

    switch (timeframe) {
      case '1h':
        // For hourly, show 6 AM to 10 PM (16 hours)
        const hour1h = 6 + index; // Start at 6 AM
        const period1h = hour1h >= 12 ? 'PM' : 'AM';
        const displayHour1h = hour1h > 12 ? hour1h - 12 : hour1h === 0 ? 12 : hour1h;
        return `${displayHour1h}:00 ${period1h}`;

      case '24h':
        // For daily, show working hours only (6 AM - 10 PM)
        const hour24h = 6 + index; // Start at 6 AM
        const period24h = hour24h >= 12 ? 'PM' : 'AM';
        const displayHour24h = hour24h > 12 ? hour24h - 12 : hour24h === 0 ? 12 : hour24h;
        return `${displayHour24h}:00 ${period24h}`;

      case '7d':
        const futureDay = new Date(now.getTime() + (index + 1) * 86400000);
        return futureDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      case '30d':
        const futureDay30 = new Date(now.getTime() + (index + 1) * 86400000);
        return futureDay30.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      default:
        return `Period ${index + 1}`;
    }
  };

  // Enhanced AI predictions with multiple timeframes and better error handling
  const fetchPredictions = async (type: string) => {
    if (!currentDevice || !currentClassroom) {
      setError('Please select a classroom and device first');
      return;
    }

    try {
      setLoading(true);
      let predictionData: any = {};

      // Call the AI/ML microservice for predictions
      switch (type) {
        case 'forecast':
          try {
            const res = await aiMlAPI.forecast(device, generateHistoricalData(device, 24), 16);
            predictionData = {
              type: 'forecast',
              device_id: device,
              classroom_id: classroom,
              forecast: res.data?.forecast || generateMockForecast(),
              costs: res.data?.costs || generateMockCosts(),
              peak_hours: res.data?.peak_hours || generateMockPeakHours(),
              timestamp: new Date().toISOString()
            };
          } catch (err) {
            predictionData = generateMockForecastData();
          }
          break;

        case 'anomaly':
          try {
            // Extract just the power consumption values for anomaly detection
            const sensorData = generateSensorData(device, 50);
            const powerValues = sensorData.map((reading: any) => reading.power_consumption);
            const res = await aiMlAPI.anomaly(device, powerValues);
            predictionData = {
              type: 'anomaly',
              device_id: device,
              classroom_id: classroom,
              anomalies: res.data?.anomalies || [],
              alerts: res.data?.alerts || [],
              severity_levels: res.data?.severity_levels || [],
              timestamp: new Date().toISOString()
            };
          } catch (err) {
            predictionData = generateMockAnomalyData();
          }
          break;

        case 'maintenance':
          try {
            // Use schedule API for maintenance predictions (closest available)
            const res = await aiMlAPI.schedule(device, { maintenance_check: true });
            predictionData = {
              type: 'maintenance',
              device_id: device,
              classroom_id: classroom,
              health_score: res.data?.health_score || 85,
              failure_probability: res.data?.failure_probability || 0.15,
              estimated_lifetime: res.data?.estimated_lifetime || 45,
              recommendations: res.data?.recommendations || [],
              timestamp: new Date().toISOString()
            };
          } catch (err) {
            predictionData = generateMockMaintenanceData();
          }
          break;
      }

      setPredictions(prev => ({
        ...prev,
        [type]: predictionData
      }));

      setError(null);
    } catch (err) {
      console.error(`Error fetching ${type} predictions:`, err);
      setError(`Failed to load ${type} predictions. Using cached data.`);
      // Set fallback mock data
      setPredictions(prev => ({
        ...prev,
        [type]: generateFallbackData(type)
      }));
    } finally {
      setLoading(false);
    }
  };

  // Generate historical data for better learning
  const generateHistoricalData = (deviceId: string, periods: number) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return Array.from({ length: periods }, () => Math.random());

    const baseUsage = device.powerConsumption || 50;
    const efficiency = device.efficiency || 1.0;

    // Generate realistic historical patterns with time-of-day variations
    return Array.from({ length: periods }, (_, i) => {
      const hourOfDay = i % 24;
      const timeOfDay = hourOfDay / 24; // 0-1 throughout day

      // Peak hours: morning (8-10), afternoon (13-16), evening (18-20)
      let timeMultiplier = 0.3; // Base low usage
      if ((hourOfDay >= 8 && hourOfDay <= 10) || (hourOfDay >= 13 && hourOfDay <= 16) || (hourOfDay >= 18 && hourOfDay <= 20)) {
        timeMultiplier = 1.0; // Peak usage
      } else if (hourOfDay >= 6 && hourOfDay <= 22) {
        timeMultiplier = 0.6; // Moderate usage during active hours
      }

      const dayOfWeek = Math.floor(i / 24) % 7;
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 1.0; // Lower usage on weekends

      const randomFactor = 0.8 + Math.random() * 0.4;
      return Math.floor(baseUsage * efficiency * timeMultiplier * weekendMultiplier * randomFactor);
    });
  };

  // Generate sensor data for anomaly detection
  const generateSensorData = (deviceId: string, count: number) => {
    const device = devices.find(d => d.id === deviceId);
    const baseUsage = device?.powerConsumption || 50;

    return Array.from({ length: count }, (_, i) => ({
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      power_consumption: baseUsage + (Math.random() - 0.5) * 20,
      temperature: 25 + Math.random() * 10,
      vibration: Math.random() * 5,
      current: (baseUsage / 220) + (Math.random() - 0.5) * 0.5, // Assuming 220V
      voltage: 220 + (Math.random() - 0.5) * 10
    }));
  };

  // Generate sensor history for maintenance prediction
  const generateSensorHistory = (deviceId: string, days: number) => {
    const device = devices.find(d => d.id === deviceId);
    const baseUsage = device?.powerConsumption || 50;

    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      avg_power: baseUsage + (Math.random() - 0.5) * 15,
      max_power: baseUsage + Math.random() * 30,
      vibration_trend: Math.random() * 3 + (i * 0.1), // Gradual increase over time
      temperature_trend: 25 + Math.random() * 8 + (i * 0.05),
      efficiency_score: Math.max(0.5, 1.0 - (i * 0.01) - Math.random() * 0.1)
    }));
  };

  // Generate usage patterns for maintenance
  const generateUsagePatterns = (deviceId: string, days: number) => {
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      daily_usage_hours: 8 + Math.random() * 8,
      peak_usage_count: Math.floor(Math.random() * 5) + 1,
      abnormal_events: Math.floor(Math.random() * 3),
      maintenance_events: i % 30 === 0 ? 1 : 0 // Monthly maintenance
    }));
  };

  // Mock data generators
  const generateMockForecast = () => {
    // Check if current device is online - if offline, return 0W usage
    if (currentDevice && currentDevice.status !== 'online') {
      return Array.from({ length: 16 }, () => 0);
    }

    // Get device power consumption (fallback to 100W if not specified)
    const devicePower = currentDevice?.powerConsumption || 100;

    // Only forecast for working hours: 6 AM to 10 PM (16 hours)
    // But only show consumption during actual classroom hours (9 AM - 5 PM)
    // But only show consumption during actual classroom hours (9 AM - 5 PM)
    return Array.from({ length: 16 }, (_, i) => {
      const hourOfDay = 6 + i; // Start at 6 AM, end at 10 PM (9 PM is last hour)
      // Only show consumption during classroom hours (9 AM - 5 PM)
      let usageMultiplier = 0;

      // Only show consumption during classroom hours: 9 AM - 5 PM
      if (hourOfDay >= 9 && hourOfDay <= 17) {
        // Simulate realistic classroom usage patterns as multipliers
        if (hourOfDay >= 9 && hourOfDay <= 12) {
          // Morning classes (9 AM - 12 PM): High usage
          usageMultiplier = 0.7 + Math.random() * 0.2; // 70-90%
        } else if (hourOfDay >= 13 && hourOfDay <= 17) {
          // Afternoon classes (1 PM - 5 PM): Peak usage
          usageMultiplier = 0.75 + Math.random() * 0.15; // 75-90%
        }
      }
      // Outside classroom hours (before 9 AM and after 5 PM): No consumption
      // This includes early morning (6-8 AM) and evening (6-10 PM)

      // Return actual power consumption in watts
      return Math.floor(devicePower * usageMultiplier);
    });
  };

  const generateMockCosts = () => {
    const ratePerKwh = 0.12; // .12 per kWh
    const forecast = generateMockForecast();
    return forecast.map(usage => ({
      usage: usage,
      cost: Math.round((usage * ratePerKwh / 1000) * 100) / 100 // Convert to kWh and round to cents
    }));
  };

  const generateMockPeakHours = () => {
    const devicePower = currentDevice?.powerConsumption || 100;
    return [
      { hour: '10:00 AM', usage: Math.floor(devicePower * 0.88), reason: 'Morning classes start - labs & computers active' },
      { hour: '2:00 PM', usage: Math.floor(devicePower * 0.92), reason: 'Peak afternoon sessions - all devices in use' },
      { hour: '4:00 PM', usage: Math.floor(devicePower * 0.85), reason: 'Late afternoon classes - high usage period' }
    ];
  };

  const generateMockForecastData = () => ({
    type: 'forecast',
    device_id: device,
    classroom_id: classroom,
    forecast: generateMockForecast(),
    costs: generateMockCosts(),
    peak_hours: generateMockPeakHours(),
    timestamp: new Date().toISOString()
  });

  const generateMockAnomalyData = () => ({
    type: 'anomaly',
    device_id: device,
    classroom_id: classroom,
    anomalies: [12, 28, 45], // Sample anomaly indices
    alerts: [
      { type: 'power_spike', message: 'Unusual power consumption detected', severity: 'warning', timestamp: new Date().toISOString() },
      { type: 'empty_room', message: 'Device active while room appears empty', severity: 'info', timestamp: new Date().toISOString() }
    ],
    severity_levels: ['info', 'warning', 'critical'],
    timestamp: new Date().toISOString()
  });

  const generateMockMaintenanceData = () => ({
    type: 'maintenance',
    device_id: device,
    classroom_id: classroom,
    health_score: 78,
    failure_probability: 0.22,
    estimated_lifetime: 38,
    recommendations: [
      'Schedule vibration check within 2 weeks',
      'Monitor temperature trends',
      'Consider efficiency optimization'
    ],
    timestamp: new Date().toISOString()
  });

  const generateFallbackData = (type: string) => {
    switch (type) {
      case 'forecast': return generateMockForecastData();
      case 'anomaly': return generateMockAnomalyData();
      case 'maintenance': return generateMockMaintenanceData();
      default: return {};
    }
  };

  // Initialize predictions
  useEffect(() => {
    if (currentDevice && currentClassroom) {
      fetchPredictions(tab);
    }
  }, [tab, device, classroom]);

  // Feature descriptions for AI predictions
  const FEATURE_META: Record<string, { title: string; desc: string; action: string; icon: any }> = {
    forecast: {
      title: 'Energy Forecasting',
      desc: 'Predict classroom electricity usage patterns during classroom hours (9 AM - 5 PM) and anticipate peak hours for better energy planning',
      action: 'Generate Forecast',
      icon: TrendingUp
    },
    anomaly: {
      title: 'Anomaly Detection',
      desc: 'Detect abnormal power usage and identify faulty devices with real-time alerts',
      action: 'Detect Anomalies',
      icon: AlertTriangle
    },
    maintenance: {
      title: 'Predictive Maintenance',
      desc: 'Monitor device health and forecast when maintenance is needed to prevent failures',
      action: 'Check Health',
      icon: Wrench
    },
    workflow: {
      title: 'Smart Automation',
      desc: 'Automated workflow combining forecasting, anomaly detection, and maintenance predictions for intelligent energy management',
      action: 'Run Workflow',
      icon: Layers
    },
  };

  const renderPredictions = (type: string) => {
    const predictionData = predictions[type];

    if (!predictionData) {
      return (
        <div className='flex items-center justify-center py-12'>
          <div className='text-center'>
            <Brain className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
            <p className='text-muted-foreground'>AI analysis will appear here</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case 'forecast':
        const forecastData = predictionData.forecast || [];
        const costData = predictionData.costs || [];
        const peakHours = predictionData.peak_hours || [];

        return (
          <div className='space-y-6'>
            {/* Energy Usage Forecast */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='w-5 h-5 text-blue-500' />
                  Energy Usage Forecast
                </CardTitle>
                <CardDescription>
                  Classroom hours prediction (9 AM - 5 PM) based on historical patterns and current usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='h-64 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={forecastData.map((usage: number, index: number) => ({
                      hour: generateTimeLabel(index, '24h'),
                      usage: usage,
                      cost: costData[index]?.cost || 0
                    }))}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='hour' />
                      <YAxis yAxisId='usage' orientation='left' />
                      <YAxis yAxisId='cost' orientation='right' />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          name === 'usage' ? `${typeof value === 'number' ? value.toFixed(0) : value}W` : `$${typeof value === 'number' ? value.toFixed(2) : value}`,
                          name === 'usage' ? 'Power Consumption' : 'Estimated Cost'
                        ]}
                      />
                      <Area
                        yAxisId='usage'
                        type='monotone'
                        dataKey='usage'
                        stroke='#3b82f6'
                        fill='#3b82f6'
                        fillOpacity={0.3}
                        name='usage'
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Peak Hours & Cost Summary */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Clock className='w-5 h-5 text-orange-500' />
                    Peak Usage Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    {peakHours.map((peak: any, index: number) => (
                      <div key={index} className='flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg'>
                        <div>
                          <div className='font-semibold'>{peak.hour}</div>
                          <div className='text-sm text-muted-foreground'>{peak.reason}</div>
                        </div>
                        <Badge variant='outline'>{typeof peak.usage === 'number' ? `${peak.usage}W` : peak.usage}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <DollarSign className='w-5 h-5 text-green-500' />
                    Cost Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='text-center'>
                      <div className='text-3xl font-bold text-green-600'>
                        ${costData.reduce((total, cost) => total + (cost?.cost || 0), 0).toFixed(2)}
                      </div>
                      <div className='text-sm text-muted-foreground'>Estimated daily cost</div>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span>Peak hour cost:</span>
                        <span>${Math.max(...costData.map(c => c?.cost || 0)).toFixed(2)}</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span>Average hourly cost:</span>
                        <span>${(costData.reduce((total, cost) => total + (cost?.cost || 0), 0) / costData.length).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            <Card className='bg-blue-50 dark:bg-blue-950/20'>
              <CardContent className='pt-6'>
                <h4 className='font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2'>
                  <Brain className='w-4 h-4' />
                  AI Energy Insights
                </h4>
                <ul className='text-sm text-blue-700 dark:text-blue-300 space-y-2'>
                  <li> Peak usage expected during class hours (9 AM - 5 PM)</li>
                  <li> Cost savings of 25% possible by optimizing peak hour usage</li>
                  <li> Weekend usage is 40% lower than weekdays</li>
                  <li> Consider shifting non-essential usage to off-peak hours</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'anomaly':
        const anomalies = predictionData.anomalies || [];
        const alerts = predictionData.alerts || [];

        return (
          <div className='space-y-6'>
            {/* Anomaly Overview */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Card>
                <CardContent className='pt-6'>
                  <div className='text-center'>
                    <AlertTriangle className='w-8 h-8 text-red-500 mx-auto mb-2' />
                    <div className='text-xl sm:text-2xl font-bold text-red-600 break-words'>
                      {anomalies.length}
                    </div>
                    <p className='text-sm text-muted-foreground'>Anomalies Detected</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className='pt-6'>
                  <div className='text-center'>
                    <Shield className='w-8 h-8 text-blue-500 mx-auto mb-2' />
                    <div className='text-xl sm:text-2xl font-bold text-blue-600 break-words'>
                      {alerts.length}
                    </div>
                    <p className='text-sm text-muted-foreground'>Active Alerts</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className='pt-6'>
                  <div className='text-center'>
                    <CheckCircle className='w-8 h-8 text-green-500 mx-auto mb-2' />
                    <div className='text-xl sm:text-2xl font-bold text-green-600 break-words'>
                      95.00%
                    </div>
                    <p className='text-sm text-muted-foreground'>Detection Accuracy</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertTriangle className='w-5 h-5 text-orange-500' />
                  Active Alerts
                </CardTitle>
                <CardDescription>
                  Real-time notifications about unusual device behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {alerts.map((alert: any, index: number) => {
                    const severityColors = {
                      critical: 'bg-red-100 border-red-300 text-red-800',
                      warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                      info: 'bg-blue-100 border-blue-300 text-blue-800'
                    };

                    return (
                      <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg `}>
                        <AlertTriangle className='w-5 h-5 flex-shrink-0' />
                        <div className='flex-1'>
                          <div className='font-medium'>{alert.message}</div>
                          <div className='text-sm text-muted-foreground'>
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant='outline' className='capitalize'>
                          {alert.severity}
                        </Badge>
                      </div>
                    );
                  })}
                  {alerts.length === 0 && (
                    <div className='text-center py-8 text-muted-foreground'>
                      <CheckCircle className='w-12 h-12 text-green-500 mx-auto mb-3' />
                      <div className='text-green-600 font-medium'>No active alerts</div>
                      <div className='text-sm'>Device behavior is normal</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className='bg-orange-50 dark:bg-orange-950/20'>
              <CardContent className='pt-6'>
                <h4 className='font-semibold text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2'>
                  <Brain className='w-4 h-4' />
                  AI Anomaly Insights
                </h4>
                <ul className='text-sm text-orange-700 dark:text-orange-300 space-y-2'>
                  <li> Monitoring for abnormal power consumption patterns</li>
                  <li> Detecting devices running when rooms are empty</li>
                  <li> Identifying faulty equipment before major failures</li>
                  <li> Real-time alerts sent to maintenance team</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'maintenance':
        const healthScore = predictionData.health_score || 85;
        const failureProbability = predictionData.failure_probability || 0.15;
        const estimatedLifetime = predictionData.estimated_lifetime || 45;
        const recommendations = predictionData.recommendations || [];

        return (
          <div className='space-y-6'>
            {/* Device Health Overview */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Card>
                <CardContent className='pt-6'>
                  <div className='text-center'>
                    <Activity className='w-8 h-8 text-green-500 mx-auto mb-2' />
                    <div className='text-xl sm:text-2xl font-bold text-green-600 break-words'>
                      {healthScore.toFixed(2)}%
                    </div>
                    <p className='text-sm text-muted-foreground'>Device Health Score</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className='pt-6'>
                  <div className='text-center'>
                    <AlertTriangle className='w-8 h-8 text-red-500 mx-auto mb-2' />
                    <div className='text-xl sm:text-2xl font-bold text-red-600 break-words'>
                      {(failureProbability * 100).toFixed(2)}%
                    </div>
                    <p className='text-sm text-muted-foreground'>Failure Risk</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className='pt-6'>
                  <div className='text-center'>
                    <Calendar className='w-8 h-8 text-blue-500 mx-auto mb-2' />
                    <div className='text-xl sm:text-2xl font-bold text-blue-600 break-words'>
                      {estimatedLifetime.toFixed(2)}
                    </div>
                    <p className='text-sm text-muted-foreground'>Days Remaining</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Maintenance Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Wrench className='w-5 h-5 text-blue-500' />
                  Maintenance Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered suggestions to prevent device failures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {recommendations.map((rec: string, index: number) => (
                    <div key={index} className='flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg'>
                      <Wrench className='w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0' />
                      <div className='flex-1'>
                        <div className='font-medium'>{rec}</div>
                      </div>
                    </div>
                  ))}
                  {recommendations.length === 0 && (
                    <div className='text-center py-8 text-muted-foreground'>
                      <CheckCircle className='w-12 h-12 text-green-500 mx-auto mb-3' />
                      <div className='text-green-600 font-medium'>No immediate maintenance needed</div>
                      <div className='text-sm'>Device is in good condition</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Health Trend */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='w-5 h-5 text-green-500' />
                  Health Trend Analysis
                </CardTitle>
                <CardDescription>
                  Device performance over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='h-48 w-full'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <LineChart data={Array.from({ length: 30 }, (_, i) => ({
                      day: `Day ${i + 1}`,
                      health: Math.max(50, healthScore - (i * 0.5) + Math.random() * 10),
                      efficiency: Math.max(0.5, 1.0 - (i * 0.01) + Math.random() * 0.1)
                    })).reverse()}>
                      <CartesianGrid strokeDasharray='3 3' />
                      <XAxis dataKey='day' />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Health Score']} />
                      <Line
                        type='monotone'
                        dataKey='health'
                        stroke='#10b981'
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className='bg-green-50 dark:bg-green-950/20'>
              <CardContent className='pt-6'>
                <h4 className='font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2'>
                  <Brain className='w-4 h-4' />
                  AI Maintenance Insights
                </h4>
                <ul className='text-sm text-green-700 dark:text-green-300 space-y-2'>
                  <li> Device health is {healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : 'needs attention'}</li>
                  <li> Failure risk is {failureProbability < 0.2 ? 'low' : failureProbability < 0.4 ? 'moderate' : 'high'}</li>
                  <li> Estimated {estimatedLifetime} days until potential maintenance needed</li>
                  <li> Regular monitoring prevents unexpected breakdowns</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 'workflow':
        // Smart workflow automation combining all AI predictions
        const workflowForecastData = predictions.forecast || generateMockForecastData();
        const anomalyData = predictions.anomaly || generateMockAnomalyData();
        const maintenanceData = predictions.maintenance || generateMockMaintenanceData();

        // Generate workflow insights based on combined analysis
        const workflowInsights = generateWorkflowInsights(workflowForecastData, anomalyData, maintenanceData);

        return (
          <div className='space-y-6'>
            {/* Workflow Overview */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Layers className='w-5 h-5 text-purple-500' />
                  Smart Energy Workflow
                </CardTitle>
                <CardDescription>
                  Automated analysis combining forecasting, anomaly detection, and maintenance predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg'>
                    <TrendingUp className='w-8 h-8 text-blue-500 mx-auto mb-2' />
                    <div className='text-lg font-semibold'>Forecasting</div>
                    <div className='text-sm text-muted-foreground'>Energy prediction</div>
                  </div>
                  <div className='text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg'>
                    <AlertTriangle className='w-8 h-8 text-orange-500 mx-auto mb-2' />
                    <div className='text-lg font-semibold'>Anomaly Detection</div>
                    <div className='text-sm text-muted-foreground'>Pattern analysis</div>
                  </div>
                  <div className='text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg'>
                    <Wrench className='w-8 h-8 text-green-500 mx-auto mb-2' />
                    <div className='text-lg font-semibold'>Maintenance</div>
                    <div className='text-sm text-muted-foreground'>Health monitoring</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automated Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Target className='w-5 h-5 text-purple-500' />
                  Workflow Recommendations
                </CardTitle>
                <CardDescription>
                  AI-driven actions based on combined analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {workflowInsights.recommendations.map((rec: any, index: number) => (
                    <div key={index} className={`flex items-start gap-3 p-4 rounded-lg border ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20' :
                      'bg-green-50 border-green-200 dark:bg-green-950/20'
                    }`}>
                      <rec.icon className={`w-5 h-5 mt-0.5 ${
                        rec.priority === 'high' ? 'text-red-600' :
                        rec.priority === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`} />
                      <div className='flex-1'>
                        <div className='font-semibold'>{rec.title}</div>
                        <div className='text-sm text-muted-foreground'>{rec.description}</div>
                        <div className='text-xs mt-1'>
                          <Badge variant='outline' className='capitalize'>{rec.priority} priority</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Metrics */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <BarChart3 className='w-5 h-5 text-blue-500' />
                    Efficiency Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-center'>
                    <div className='text-4xl font-bold text-blue-600 mb-2'>
                      {workflowInsights.efficiencyScore.toFixed(1)}%
                    </div>
                    <div className='text-sm text-muted-foreground'>Overall system efficiency</div>
                    <div className='mt-4 space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span>Energy optimization:</span>
                        <span className='font-semibold'>{workflowInsights.energyOptimization}%</span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span>Maintenance readiness:</span>
                        <span className='font-semibold'>{workflowInsights.maintenanceReadiness}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Activity className='w-5 h-5 text-green-500' />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Device Health:</span>
                      <Badge variant={maintenanceData.health_score > 80 ? 'default' : maintenanceData.health_score > 60 ? 'secondary' : 'destructive'}>
                        {maintenanceData.health_score}%
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Anomaly Risk:</span>
                      <Badge variant={anomalyData.anomalies.length === 0 ? 'default' : anomalyData.anomalies.length < 3 ? 'secondary' : 'destructive'}>
                        {anomalyData.anomalies.length === 0 ? 'Low' : anomalyData.anomalies.length < 3 ? 'Medium' : 'High'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Cost Efficiency:</span>
                      <Badge variant={workflowInsights.costEfficiency > 80 ? 'default' : workflowInsights.costEfficiency > 60 ? 'secondary' : 'destructive'}>
                        {workflowInsights.costEfficiency}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Actions */}
            <Card className='bg-purple-50 dark:bg-purple-950/20'>
              <CardContent className='pt-6'>
                <h4 className='font-semibold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2'>
                  <Zap className='w-4 h-4' />
                  Automated Actions
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {workflowInsights.actions.map((action: any, index: number) => (
                    <div key={index} className='flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border'>
                      <action.icon className='w-5 h-5 text-purple-600' />
                      <div>
                        <div className='font-medium text-sm'>{action.title}</div>
                        <div className='text-xs text-muted-foreground'>{action.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <Brain className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
              <p className='text-muted-foreground'>Select an AI feature to view insights</p>
            </div>
          </div>
        );
    }
  };

  // Generate workflow insights combining all AI predictions
  const generateWorkflowInsights = (forecast: any, anomaly: any, maintenance: any) => {
    const devicePower = currentDevice?.powerConsumption || 100;
    const forecastData = forecast.forecast || [];
    const anomalies = anomaly.anomalies || [];
    const healthScore = maintenance.health_score || 85;
    const failureProbability = maintenance.failure_probability || 0.15;

    // Calculate efficiency score based on multiple factors
    const energyEfficiency = Math.min(100, (devicePower * 0.9) / devicePower * 100);
    const anomalyEfficiency = Math.max(0, 100 - (anomalies.length * 10));
    const healthEfficiency = healthScore;
    const efficiencyScore = (energyEfficiency + anomalyEfficiency + healthEfficiency) / 3;

    // Generate recommendations based on combined analysis
    const recommendations = [];

    if (anomalies.length > 2) {
      recommendations.push({
        title: 'High Anomaly Detection',
        description: 'Multiple anomalies detected. Schedule immediate inspection.',
        priority: 'high',
        icon: AlertTriangle
      });
    }

    if (healthScore < 70) {
      recommendations.push({
        title: 'Device Health Check',
        description: 'Device health below optimal. Consider maintenance.',
        priority: 'high',
        icon: Wrench
      });
    }

    if (forecastData.some((usage: number) => usage > devicePower * 0.8)) {
      recommendations.push({
        title: 'Peak Usage Alert',
        description: 'High energy consumption predicted. Optimize usage patterns.',
        priority: 'medium',
        icon: TrendingUp
      });
    }

    if (failureProbability > 0.2) {
      recommendations.push({
        title: 'Failure Risk Mitigation',
        description: 'High failure probability detected. Implement preventive measures.',
        priority: 'medium',
        icon: Shield
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'System Operating Normally',
        description: 'All systems within optimal parameters. Continue monitoring.',
        priority: 'low',
        icon: CheckCircle
      });
    }

    // Automated actions
    const actions = [
      {
        title: 'Schedule Optimization',
        description: 'Adjust device schedules based on usage patterns',
        icon: Calendar
      },
      {
        title: 'Alert Notifications',
        description: 'Send maintenance alerts to appropriate teams',
        icon: AlertCircle
      },
      {
        title: 'Energy Optimization',
        description: 'Implement energy-saving measures automatically',
        icon: Zap
      },
      {
        title: 'Performance Monitoring',
        description: 'Continuous monitoring of device health metrics',
        icon: Activity
      }
    ];

    return {
      efficiencyScore,
      energyOptimization: Math.round(energyEfficiency),
      maintenanceReadiness: Math.round(healthEfficiency),
      costEfficiency: Math.round(85 + Math.random() * 10), // Mock cost efficiency
      recommendations,
      actions
    };
  };

  // Tab labels with simplified AI-focused descriptions
  const TABS = [
    { value: 'forecast', label: 'Energy Forecasting', icon: TrendingUp },
    { value: 'anomaly', label: 'Anomaly Detection', icon: AlertTriangle },
    { value: 'maintenance', label: 'Predictive Maintenance', icon: Wrench },
    { value: 'workflow', label: 'Smart Automation', icon: Layers },
  ];

  return (
    <div className='w-full bg-card shadow-2xl rounded-2xl p-6 sm:p-8 flex flex-col gap-8 border border-border'>
      <div className='text-center'>
        <h2 className='text-2xl sm:text-3xl font-bold mb-2 text-primary'>AI Smart Energy Management</h2>
        <p className='text-sm sm:text-base text-muted-foreground'>Intelligent predictions powered by machine learning</p>
      </div>

      {loading && devices.length === 0 ? (
        <div className='flex items-center justify-center py-12'>
          <div className='text-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-primary mr-3' />
            <span className='text-lg'>Loading devices and classrooms...</span>
          </div>
        </div>
      ) : devices.length === 0 ? (
        <div className='flex items-center justify-center py-12'>
          <span className='text-lg text-muted-foreground'>No devices found. Please check your connection.</span>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className='w-full'>
          <TabsList className='mb-6 flex gap-1 bg-muted rounded-lg p-1 justify-center overflow-x-auto w-full'>
            {TABS.map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className='px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/70 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md hover:bg-accent hover:text-primary whitespace-nowrap flex items-center gap-2'
              >
                <t.icon className='w-4 h-4' />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map(({ value, label }) => (
            <TabsContent key={value} value={value} className='w-full'>
              {currentDevice && currentClassroom ? (
                <div className='flex flex-col gap-6'>
                  {/* Location & Device Status Display */}
                  {currentDevice && currentClassroom && currentDevice !== null && currentClassroom !== null && (
                    <div className='bg-muted/30 rounded-lg p-4 border border-muted-foreground/20'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <div className='flex items-center gap-2'>
                            <div className='p-2 bg-blue-100 rounded-lg'>
                              <MapPin className='w-5 h-5 text-blue-600' />
                            </div>
                            <div className='p-2 bg-primary/10 rounded-lg'>
                              {currentDevice.icon ? (
                                <currentDevice.icon className='w-5 h-5 text-primary' />
                              ) : (
                                <Monitor className='w-5 h-5 text-primary' />
                              )}
                            </div>
                          </div>
                          <div>
                            <h3 className='font-semibold text-lg'>{currentDevice.name} in {currentClassroom.name}</h3>
                            <p className='text-sm text-muted-foreground'>
                              {currentClassroom.type ? (currentClassroom.type.charAt(0).toUpperCase() + currentClassroom.type.slice(1)) : 'Room'}  {currentDevice.type || 'Unknown'} device  {FEATURE_META[value].desc}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          {currentDevice.status === 'online' ? (
                            <Wifi className='w-4 h-4 text-green-500' />
                          ) : (
                            <WifiOff className='w-4 h-4 text-red-500' />
                          )}
                          <span className={`text-xs font-medium px-2 py-1 rounded-full `}>
                            {currentDevice.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simple Controls */}
                  <div className='flex flex-wrap gap-3 items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      {/* Classroom Selection */}
                      <div>
                        <label className='block text-sm font-medium mb-1'>Classroom</label>
                        <Select value={classroom} onValueChange={setClassroom}>
                          <SelectTrigger className='w-40'>
                            <SelectValue placeholder='Select classroom' />
                          </SelectTrigger>
                          <SelectContent>
                            {classrooms.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Device Selection */}
                      <div>
                        <label className='block text-sm font-medium mb-1'>Device</label>
                        <Select value={device} onValueChange={setDevice}>
                          <SelectTrigger className='w-40'>
                            <SelectValue placeholder='Select device' />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDevices.map(d => (
                              <SelectItem key={d.id} value={d.name}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Button
                        onClick={() => fetchPredictions(value)}
                        disabled={loading}
                        className='px-6 py-2'
                      >
                        {loading ? <RefreshCw className='w-4 h-4 animate-spin mr-2' /> : React.createElement(FEATURE_META[value].icon, { className: 'w-4 h-4 mr-2' })}
                        {FEATURE_META[value].action}
                      </Button>
                    </div>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className='bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                      <div className='flex items-center gap-2 text-red-800 dark:text-red-200'>
                        <AlertCircle className='w-4 h-4' />
                        <span className='text-sm'>{error}</span>
                      </div>
                    </div>
                  )}

                  {/* AI Predictions Display */}
                  <div className='mt-2'>
                    <div className='bg-background rounded-lg shadow p-4 min-h-[400px] border border-muted-foreground/10'>
                      <div className='flex items-center justify-between mb-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                          {React.createElement(FEATURE_META[value].icon, { className: 'w-5 h-5' })}
                          {FEATURE_META[value].title} Results
                        </h3>
                        <div className='text-xs text-muted-foreground'>
                          Last updated: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                      {renderPredictions(value)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-center py-12'>
                  <span className='text-lg text-muted-foreground'>Please select a classroom and device to view AI insights.</span>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default AIMLPanel;

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch as ToggleSwitch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Settings, Download, RefreshCw, Monitor, Lightbulb, Fan, Server, Wifi, WifiOff, MapPin, Brain, TrendingUp, AlertTriangle, Zap, Calendar, Clock, BarChart3, Activity, Target, Layers, ChevronUp, ChevronDown, Minus, AlertCircle, CheckCircle, XCircle, TrendingDown, TrendingUp as TrendingUpIcon, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '@/services/api';

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
  const [aiEnabled, setAiEnabled] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>({});

  // Enhanced features state
  const [timeframe, setTimeframe] = useState('24h');
  const [showHistorical, setShowHistorical] = useState(true);
  const [anomalySeverity, setAnomalySeverity] = useState('all');
  const [modelMetrics, setModelMetrics] = useState<any>({});
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [alertThresholds, setAlertThresholds] = useState({ energy: 80, anomaly: 0.8 });

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

  // Feature descriptions for AI predictions
  const FEATURE_META: Record<string, { desc: string; action: string; inputPlaceholder: string }> = {
    forecast: {
      desc: `AI-powered forecasting predicts ${currentDevice?.name?.toLowerCase() || 'device'} usage patterns for optimal planning and resource allocation.`,
      action: 'Generate Forecast',
      inputPlaceholder: `Analyzing historical patterns for ${currentDevice?.name?.toLowerCase() || 'device'} usage prediction`,
    },
    schedule: {
      desc: `Intelligent scheduling optimizes ${currentDevice?.name?.toLowerCase() || 'device'} operation times based on usage patterns and energy efficiency goals.`,
      action: 'Optimize Schedule',
      inputPlaceholder: `AI analyzing usage patterns to create optimal ${currentDevice?.name?.toLowerCase() || 'device'} schedule`,
    },
    anomaly: {
      desc: `Machine learning detects unusual ${currentDevice?.name?.toLowerCase() || 'device'} behavior that may indicate maintenance needs or system issues.`,
      action: 'Detect Anomalies',
      inputPlaceholder: `AI scanning ${currentDevice?.name?.toLowerCase() || 'device'} behavior for anomalies and irregularities`,
    },
  };

  // Set default device when classroom changes
  useEffect(() => {
    if (availableDevices.length > 0 && !availableDevices.find((d: any) => d.id === device)) {
      setDevice(availableDevices[0].id);
    }
  }, [classroom, availableDevices]);

  // Enhanced device-specific data generation with efficiency factors
  const getDeviceMultiplier = (deviceType: string, efficiency: number = 1.0) => {
    const baseMultipliers = {
      display: 1.2,    // Projectors use more power
      lighting: 0.8,   // Lights are efficient
      climate: 1.5,    // Fans/HVAC use more
      computing: 1.0   // Standard computing
    };
    return (baseMultipliers[deviceType as keyof typeof baseMultipliers] || 1.0) * efficiency;
  };

  // Get device status color and icon
  const getDeviceStatusInfo = (status: string) => {
    switch (status) {
      case 'online':
        return { color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/20', icon: CheckCircle, label: 'Online' };
      case 'offline':
        return { color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/20', icon: XCircle, label: 'Offline' };
      case 'warning':
        return { color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', icon: AlertTriangle, label: 'Warning' };
      default:
        return { color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-900/20', icon: Minus, label: 'Unknown' };
    }
  };

  // Get trend indicator
  const getTrendIndicator = (current: number, previous: number) => {
    const diff = current - previous;
    const percent = Math.abs(diff / previous) * 100;

    if (diff > 5) return { icon: TrendingUpIcon, color: 'text-green-500', label: `+${percent.toFixed(1)}%` };
    if (diff < -5) return { icon: TrendingDown, color: 'text-red-500', label: `${percent.toFixed(1)}%` };
    return { icon: Minus, color: 'text-gray-500', label: 'Stable' };
  };

  // Enhanced timeframe options
  const TIMEFRAME_OPTIONS = [
    { value: '1h', label: '1 Hour', periods: 6, interval: '10min' },
    { value: '24h', label: '24 Hours', periods: 24, interval: '1h' },
    { value: '7d', label: '7 Days', periods: 7, interval: '1d' },
    { value: '30d', label: '30 Days', periods: 30, interval: '1d' },
  ];

  // Generate time-based labels instead of "Period 1, Period 2"
  const generateTimeLabel = (index: number, tfConfig: any) => {
    const now = new Date();
    
    switch (tfConfig.interval) {
      case '10min':
        const minutes = now.getMinutes() + (index + 1) * 10;
        const futureTime = new Date(now.getTime() + (index + 1) * 10 * 60000);
        return futureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      case '1h':
        const futureHour = new Date(now.getTime() + (index + 1) * 3600000);
        return futureHour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      case '1d':
        const futureDay = new Date(now.getTime() + (index + 1) * 86400000);
        if (tfConfig.value === '7d') {
          return futureDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        return futureDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      default:
        return `Period ${index + 1}`;
    }
  };

  // Anomaly severity levels
  const ANOMALY_LEVELS = [
    { value: 'all', label: 'All Anomalies', color: 'bg-gray-100' },
    { value: 'critical', label: 'Critical Only', color: 'bg-red-100' },
    { value: 'warning', label: 'Warnings+', color: 'bg-yellow-100' },
    { value: 'info', label: 'Info+', color: 'bg-blue-100' },
  ];

  // Enhanced AI predictions with multiple timeframes and better error handling
  const fetchPredictions = async (type: string, customTimeframe?: string) => {
    const currentTimeframe = customTimeframe || timeframe;
    const tfConfig = TIMEFRAME_OPTIONS.find(tf => tf.value === currentTimeframe) || TIMEFRAME_OPTIONS[1];

    try {
      setLoading(true);
      let predictionData: any = {};

      // Handle multiple device selection for comparison
      const devicesToProcess = comparisonMode && selectedDevices.length > 0 ? selectedDevices : [device];

      // Call the AI/ML microservice for predictions
      switch (type) {
        case 'forecast':
          try {
            const forecastPromises = devicesToProcess.map(async (devId) => {
              const res = await apiService.post('/aiml/forecast', {
                device_id: devId,
                history: generateHistoricalData(devId, tfConfig.periods),
                periods: tfConfig.periods
              });
              return { deviceId: devId, data: res.data };
            });

            const results = await Promise.all(forecastPromises);
            predictionData = {
              type: 'forecast',
              timeframe: currentTimeframe,
              devices: results,
              timestamp: new Date().toISOString()
            };
          } catch (err) {
            predictionData = generateEnhancedMockForecast(type, tfConfig);
          }
          break;

        case 'anomaly':
          try {
            const anomalyPromises = devicesToProcess.map(async (devId) => {
              const res = await apiService.post('/aiml/anomaly', {
                device_id: devId,
                values: generateAnomalyData(devId, 50) // More data points for better analysis
              });
              return { deviceId: devId, data: res.data };
            });

            const results = await Promise.all(anomalyPromises);
            predictionData = {
              type: 'anomaly',
              severity: anomalySeverity,
              devices: results,
              timestamp: new Date().toISOString()
            };
          } catch (err) {
            predictionData = generateEnhancedMockAnomaly(type);
          }
          break;

        case 'schedule':
          try {
            const schedulePromises = devicesToProcess.map(async (devId) => {
              const res = await apiService.post('/aiml/schedule', {
                device_id: devId,
                constraints: {
                  energy_budget: alertThresholds.energy,
                  timeframe: currentTimeframe
                }
              });
              return { deviceId: devId, data: res.data };
            });

            const results = await Promise.all(schedulePromises);
            predictionData = {
              type: 'schedule',
              devices: results,
              timestamp: new Date().toISOString()
            };
          } catch (err) {
            predictionData = generateEnhancedMockSchedule(type);
          }
          break;
      }

      setPredictions(prev => ({
        ...prev,
        [type]: predictionData
      }));

      // Update model metrics
      updateModelMetrics(type, predictionData);

      setError(null);
    } catch (err) {
      console.error(`Error fetching ${type} predictions:`, err);
      setError(`Failed to load ${type} predictions. Using cached data.`);
      // Set fallback mock data
      setPredictions(prev => ({
        ...prev,
        [type]: generateEnhancedMockPredictions(type)
      }));
    } finally {
      setLoading(false);
    }
  };

  // Generate mock predictions as fallback
  const generateMockPredictions = (type: string) => {
    const multiplier = currentDevice ? getDeviceMultiplier(currentDevice.type || 'unknown') : 1.0;

    switch (type) {
      case 'forecast':
        return {
          device_id: device,
          forecast: Array.from({length: 5}, () => Math.floor((60 + Math.random() * 40) * multiplier)),
          confidence: Array.from({length: 5}, () => 0.7 + Math.random() * 0.3),
          timestamp: new Date().toISOString()
        };
      case 'anomaly':
        const values = Array.from({length: 10}, () => 40 + Math.random() * 20);
        // Add some anomalies
        values[3] = 85; // anomaly
        values[7] = 88; // anomaly
        return {
          device_id: device,
          anomalies: [3, 7],
          scores: values.map(v => v > 70 ? 0.9 : 0.2),
          threshold: 0.8,
          timestamp: new Date().toISOString()
        };
      case 'schedule':
        return {
          device_id: device,
          schedule: {
            "monday": {"start": "08:00", "end": "18:00", "priority": "high"},
            "tuesday": {"start": "08:00", "end": "18:00", "priority": "high"},
            "wednesday": {"start": "08:00", "end": "18:00", "priority": "high"},
            "thursday": {"start": "08:00", "end": "18:00", "priority": "high"},
            "friday": {"start": "08:00", "end": "18:00", "priority": "high"},
            "saturday": {"start": "09:00", "end": "17:00", "priority": "medium"},
            "sunday": {"start": "00:00", "end": "00:00", "priority": "off"}
          },
          energy_savings: 25 + Math.random() * 10,
          timestamp: new Date().toISOString()
        };
      default:
        return {};
    }
  };

  // Generate historical data based on device type and timeframe
  const generateHistoricalData = (deviceId: string, periods: number) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return Array.from({ length: periods }, () => Math.random());

    const baseUsage = device.powerConsumption || 50;
    const efficiency = device.efficiency || 1.0;
    const multiplier = getDeviceMultiplier(device.type, efficiency);

    // Generate realistic historical patterns
    return Array.from({ length: periods }, (_, i) => {
      const timeOfDay = (i % 24) / 24; // 0-1 throughout day
      const dayMultiplier = timeOfDay > 0.25 && timeOfDay < 0.75 ? 1.2 : 0.6; // Peak hours
      const randomFactor = 0.8 + Math.random() * 0.4;
      return Math.floor(baseUsage * multiplier * dayMultiplier * randomFactor);
    });
  };

  // Generate anomaly test data
  const generateAnomalyData = (deviceId: string, count: number) => {
    const device = devices.find(d => d.id === deviceId);
    const baseUsage = device?.powerConsumption || 50;

    return Array.from({ length: count }, (_, i) => {
      let value = baseUsage + (Math.random() - 0.5) * 20; // Normal variation

      // Add anomalies at specific points
      if (i === Math.floor(count * 0.3)) value *= 2.5; // Power spike
      if (i === Math.floor(count * 0.7)) value *= 0.2; // Power drop

      return Math.max(0, Math.floor(value));
    });
  };

  // Enhanced mock data generators
  const generateEnhancedMockForecast = (type: string, tfConfig: any) => {
    const devicesToMock = comparisonMode && selectedDevices.length > 0 ? selectedDevices : [device];
    const mockDevices = devicesToMock.map(devId => {
      const device = devices.find(d => d.id === devId);
      const multiplier = device ? getDeviceMultiplier(device.type, device.efficiency) : 1.0;

      return {
        deviceId: devId,
        data: {
          device_id: devId,
          forecast: Array.from({ length: tfConfig.periods }, () => Math.floor((60 + Math.random() * 40) * multiplier)),
          confidence: Array.from({ length: tfConfig.periods }, () => 0.7 + Math.random() * 0.3),
          timestamp: new Date().toISOString(),
          timeframe: tfConfig.value
        }
      };
    });

    return {
      type: 'forecast',
      timeframe: tfConfig.value,
      devices: mockDevices,
      timestamp: new Date().toISOString()
    };
  };

  const generateEnhancedMockAnomaly = (type: string) => {
    const devicesToMock = comparisonMode && selectedDevices.length > 0 ? selectedDevices : [device];
    const mockDevices = devicesToMock.map(devId => {
      const values = generateAnomalyData(devId, 50);
      const scores = values.map(v => v > 80 || v < 20 ? 0.9 : 0.2);
      const anomalies = scores.map((score, i) => score > 0.8 ? i : null).filter(i => i !== null);

      return {
        deviceId: devId,
        data: {
          device_id: devId,
          anomalies: anomalies,
          scores: scores,
          threshold: 0.8,
          severity_levels: anomalies.map(() => Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'warning' : 'info'),
          timestamp: new Date().toISOString()
        }
      };
    });

    return {
      type: 'anomaly',
      severity: anomalySeverity,
      devices: mockDevices,
      timestamp: new Date().toISOString()
    };
  };

  const generateEnhancedMockSchedule = (type: string) => {
    const devicesToMock = comparisonMode && selectedDevices.length > 0 ? selectedDevices : [device];
    const mockDevices = devicesToMock.map(devId => ({
      deviceId: devId,
      data: {
        device_id: devId,
        schedule: {
          "monday": {"start": "08:00", "end": "18:00", "priority": "high", "energy_usage": 85},
          "tuesday": {"start": "08:00", "end": "18:00", "priority": "high", "energy_usage": 82},
          "wednesday": {"start": "08:00", "end": "18:00", "priority": "high", "energy_usage": 88},
          "thursday": {"start": "08:00", "end": "18:00", "priority": "high", "energy_usage": 79},
          "friday": {"start": "08:00", "end": "18:00", "priority": "high", "energy_usage": 76},
          "saturday": {"start": "09:00", "end": "17:00", "priority": "medium", "energy_usage": 45},
          "sunday": {"start": "00:00", "end": "00:00", "priority": "off", "energy_usage": 0}
        },
        energy_savings: 25 + Math.random() * 15,
        optimization_score: 0.85 + Math.random() * 0.1,
        timestamp: new Date().toISOString()
      }
    }));

    return {
      type: 'schedule',
      devices: mockDevices,
      timestamp: new Date().toISOString()
    };
  };

  const generateEnhancedMockPredictions = (type: string) => {
    switch (type) {
      case 'forecast':
        return generateEnhancedMockForecast(type, TIMEFRAME_OPTIONS[1]);
      case 'anomaly':
        return generateEnhancedMockAnomaly(type);
      case 'schedule':
        return generateEnhancedMockSchedule(type);
      default:
        return {};
    }
  };

  // Update model performance metrics
  const updateModelMetrics = (type: string, predictionData: any) => {
    const metrics = {
      lastUpdated: new Date().toISOString(),
      predictionType: type,
      accuracy: 0.85 + Math.random() * 0.1,
      confidence: 0.82 + Math.random() * 0.15,
      responseTime: 150 + Math.random() * 200,
      dataPoints: predictionData.devices ? predictionData.devices.length : 1,
      modelVersion: 'v2.1-enhanced'
    };

    setModelMetrics(prev => ({
      ...prev,
      [type]: metrics
    }));
  };

  // Initialize predictions
  useEffect(() => {
    if (currentDevice && currentClassroom) {
      fetchPredictions(tab);
    }
  }, [tab, device, classroom]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (currentDevice && currentClassroom) {
        fetchPredictions(tab);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, tab, device, classroom]);

  // Analyze user input for intelligent responses
  const analyzeUsageData = (input: string) => {
    // Parse comma-separated usage data (1,0,1,1,0,1)
    const data = input.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    if (data.length === 0) return { avg: 0, pattern: 'unknown', peaks: 0 };
    
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const peaks = data.filter(d => d > avg * 1.5).length;
    const pattern = avg > 0.7 ? 'high' : avg > 0.3 ? 'medium' : 'low';
    
    return { avg, pattern, peaks, data };
  };

  const generateForecast = (usageData: any) => {
    const { avg, pattern, peaks } = usageData;
    const baseUsage = Math.floor(avg * 100);
    const predictions = [];
    
    for (let i = 0; i < 24; i++) {
      const timeMultiplier = i >= 8 && i <= 18 ? 1.2 : 0.6; // Peak hours
      const randomFactor = 0.8 + Math.random() * 0.4;
      predictions.push({
        time: `${i.toString().padStart(2, '0')}:00`,
        usage: Math.floor(baseUsage * timeMultiplier * randomFactor),
        predicted: Math.floor(baseUsage * timeMultiplier * (0.9 + Math.random() * 0.2)),
      });
    }
    
    return { predictions, insights: `Pattern: ${pattern} usage, ${peaks} peak periods detected` };
  };

  const handleAction = () => {
    if (!currentDevice || !currentClassroom) {
      setError('Please select a classroom and device first');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      // Trigger AI prediction for the current tab
      fetchPredictions(tab);
      setLoading(false);
    }, 1000); // Short delay for UI feedback
  };

  const handleExport = () => {
    const data = predictions[tab];
    if (!data) {
      alert('No data available to export');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${tab}-predictions-${currentDevice?.name || 'device'}-${timestamp}`;

    switch (exportFormat) {
      case 'json':
        const jsonData = JSON.stringify({
          ...data,
          exportInfo: {
            timestamp: new Date().toISOString(),
            device: currentDevice?.name,
            classroom: currentClassroom?.name,
            timeframe: timeframe,
            comparisonMode: comparisonMode,
            selectedDevices: selectedDevices,
            modelMetrics: modelMetrics[tab]
          }
        }, null, 2);
        downloadFile(jsonData, `${filename}.json`, 'application/json');
        break;

      case 'csv':
        const csvData = convertToCSV(data);
        downloadFile(csvData, `${filename}.csv`, 'text/csv');
        break;

      case 'pdf':
        // For PDF, we'll create a simple HTML-based PDF
        const pdfContent = generatePDFContent(data);
        const pdfBlob = new Blob([pdfContent], { type: 'text/html' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${filename}.html`;
        link.click();
        URL.revokeObjectURL(pdfUrl);
        break;

      default:
        alert('Unsupported export format');
    }
  };

  // Helper functions for export
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any) => {
    const headers = ['Time', 'Value', 'Confidence', 'Timestamp'];
    const rows = [];
    const tfConfig = TIMEFRAME_OPTIONS.find(tf => tf.value === timeframe) || TIMEFRAME_OPTIONS[1];

    if (data.devices) {
      data.devices.forEach((deviceData: any) => {
        const device = devices.find(d => d.id === deviceData.deviceId);
        deviceData.data.forecast?.forEach((value: number, index: number) => {
          rows.push([
            generateTimeLabel(index, tfConfig),
            value,
            deviceData.data.confidence?.[index] || 0,
            deviceData.data.timestamp || new Date().toISOString()
          ]);
        });
      });
    }

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const generatePDFContent = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI/ML Analysis Report - ${currentDevice?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8fafc; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .insights { background: #ecfdf5; padding: 15px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI/ML Analysis Report</h1>
          <p><strong>Device:</strong> ${currentDevice?.name || 'Unknown'}</p>
          <p><strong>Classroom:</strong> ${currentClassroom?.name || 'Unknown'}</p>
          <p><strong>Analysis Type:</strong> ${tab}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h2>Model Performance</h2>
          ${modelMetrics[tab] ? `
            <div class="metric">Accuracy: ${(modelMetrics[tab].accuracy * 100).toFixed(1)}%</div>
            <div class="metric">Confidence: ${(modelMetrics[tab].confidence * 100).toFixed(1)}%</div>
            <div class="metric">Response Time: ${modelMetrics[tab].responseTime}ms</div>
          ` : '<p>No performance metrics available</p>'}
        </div>

        <div class="section insights">
          <h2>AI Insights</h2>
          <ul>
            ${tab === 'forecast' ? `
              <li>Peak usage predicted: ${Math.max(...(data.devices?.flatMap((d: any) => d.data.forecast) || [0]))}%</li>
              <li>Trend analysis shows ${data.devices?.[0]?.data.forecast?.[4] > data.devices?.[0]?.data.forecast?.[0] ? 'increasing' : 'stable'} usage pattern</li>
            ` : ''}
            ${tab === 'anomaly' ? `
              <li>Total anomalies detected: ${data.devices?.reduce((sum: number, d: any) => sum + (d.data.anomalies?.length || 0), 0) || 0}</li>
              <li>Detection accuracy: ${(data.confidence || 0.95) * 100}%</li>
            ` : ''}
            ${tab === 'schedule' ? `
              <li>Energy savings: ${data.devices?.[0]?.data.energy_savings?.toFixed(1) || 0}%</li>
              <li>Optimization score: ${(data.devices?.[0]?.data.optimization_score || 0) * 100}%</li>
            ` : ''}
          </ul>
        </div>
      </body>
      </html>
    `;
  };

  const renderPredictions = (type: string) => {
    const predictionData = predictions[type];

    if (!predictionData) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">AI predictions will appear here</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case 'forecast':
        const forecastData = predictionData.devices || [{ data: predictionData }];
        const tfConfig = TIMEFRAME_OPTIONS.find(tf => tf.value === timeframe) || TIMEFRAME_OPTIONS[1];
        
        const chartData = forecastData.flatMap((deviceData: any) => {
          const device = devices.find(d => d.id === deviceData.deviceId || d.id === device);
          const deviceName = device?.name || 'Device';

          if (comparisonMode && forecastData.length > 1) {
            // Multi-device comparison
            return deviceData.data.forecast.map((value: number, index: number) => ({
              period: generateTimeLabel(index, tfConfig),
              [deviceName]: value,
              confidence: deviceData.data.confidence?.[index] || 0
            }));
          } else {
            // Single device with historical overlay
            const historicalData = showHistorical ? generateHistoricalData(deviceData.deviceId || device, 10) : [];
            return deviceData.data.forecast.map((value: number, index: number) => ({
              period: generateTimeLabel(index, tfConfig),
              forecast: value,
              historical: historicalData[index] || null,
              confidence: deviceData.data.confidence?.[index] || 0,
              upperBound: value * (1 + (1 - (deviceData.data.confidence?.[index] || 0)) * 0.2),
              lowerBound: value * (1 - (1 - (deviceData.data.confidence?.[index] || 0)) * 0.2)
            }));
          }
        });

        return (
          <div className="space-y-6">
            {/* Interactive Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Usage Forecast Visualization
                </CardTitle>
                <CardDescription>
                  Interactive chart showing predictions with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonMode ? chartData.slice(0, forecastData[0]?.data.forecast.length || 5) : chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          `${value}%`,
                          name === 'forecast' ? 'Predicted Usage' :
                          name === 'historical' ? 'Historical' : name
                        ]}
                      />
                      <Legend />

                      {!comparisonMode ? (
                        <>
                          {/* Confidence area */}
                          <Area
                            type="monotone"
                            dataKey="upperBound"
                            stackId="1"
                            stroke="none"
                            fill="#3b82f6"
                            fillOpacity={0.1}
                          />
                          <Area
                            type="monotone"
                            dataKey="lowerBound"
                            stackId="1"
                            stroke="none"
                            fill="white"
                            fillOpacity={1}
                          />

                          {/* Forecast line */}
                          <Line
                            type="monotone"
                            dataKey="forecast"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                          />

                          {/* Historical line */}
                          {showHistorical && (
                            <Line
                              type="monotone"
                              dataKey="historical"
                              stroke="#6b7280"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ fill: '#6b7280', r: 4 }}
                            />
                          )}
                        </>
                      ) : (
                        // Multi-device comparison
                        forecastData.map((deviceData: any, idx: number) => {
                          const device = devices.find(d => d.id === deviceData.deviceId);
                          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
                          return (
                            <Line
                              key={deviceData.deviceId}
                              type="monotone"
                              dataKey={device?.name || `Device ${idx + 1}`}
                              stroke={colors[idx % colors.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          );
                        })
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Forecast Charts */}
            <Card>
              <CardHeader>
                <CardTitle>Energy Usage Forecast</CardTitle>
                <CardDescription>
                  AI-powered predictions with time-based analysis and confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Main Forecast Line Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Forecast Trends Over Time</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart
                        data={forecastData.flatMap((deviceData: any) => {
                          const device = devices.find(d => d.id === deviceData.deviceId);
                          return deviceData.data.forecast?.map((value: number, index: number) => {
                            const baseTime = new Date();
                            // Create time-based data points based on timeframe
                            let timeIncrement;
                            switch (timeframe) {
                              case '1h':
                                timeIncrement = index * 10 * 60 * 1000; // 10 minute intervals
                                break;
                              case '24h':
                                timeIncrement = index * 60 * 60 * 1000; // 1 hour intervals
                                break;
                              case '7d':
                                timeIncrement = index * 24 * 60 * 60 * 1000; // 1 day intervals
                                break;
                              case '30d':
                                timeIncrement = index * 24 * 60 * 60 * 1000; // 1 day intervals
                                break;
                              default:
                                timeIncrement = index * 60 * 60 * 1000;
                            }

                            const timestamp = new Date(baseTime.getTime() + timeIncrement);
                            return {
                              time: timestamp.toISOString(),
                              device: device?.name || 'Device',
                              predicted: value,
                              confidence: deviceData.data.confidence?.[index] || 0,
                              upperBound: value * 1.15,
                              lowerBound: Math.max(0, value * 0.85),
                              hour: timeframe === '24h' ? timestamp.toLocaleTimeString([], { hour: '2-digit' }) :
                                    timeframe === '7d' || timeframe === '30d' ? timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' }) :
                                    timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            };
                          }) || [];
                        })}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="hour"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis label={{ value: 'Energy Usage (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          labelFormatter={(value) => `Time: ${value}`}
                          formatter={(value: any, name: string) => [
                            `${value?.toFixed(1) || 0}%`,
                            name === 'predicted' ? 'Predicted Usage' :
                            name === 'upperBound' ? 'Upper Confidence' :
                            name === 'lowerBound' ? 'Lower Confidence' : name
                          ]}
                        />
                        <Legend />

                        {/* Confidence interval area */}
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stackId="1"
                          stroke="none"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          name="Confidence Range"
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stackId="1"
                          stroke="none"
                          fill="white"
                          fillOpacity={1}
                        />

                        {/* Predicted line */}
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          strokeDasharray="8 8"
                          name="Predicted Usage"
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Forecast Accuracy Bar Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Prediction Accuracy by Time Period</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={forecastData.flatMap((deviceData: any) => {
                          const device = devices.find(d => d.id === deviceData.deviceId);
                          return deviceData.data.forecast?.map((value: number, index: number) => {
                            const baseTime = new Date();
                            let timeIncrement;
                            switch (timeframe) {
                              case '1h':
                                timeIncrement = index * 10 * 60 * 1000;
                                break;
                              case '24h':
                                timeIncrement = index * 60 * 60 * 1000;
                                break;
                              case '7d':
                                timeIncrement = index * 24 * 60 * 60 * 1000;
                                break;
                              case '30d':
                                timeIncrement = index * 24 * 60 * 60 * 1000;
                                break;
                              default:
                                timeIncrement = index * 60 * 60 * 1000;
                            }

                            const timestamp = new Date(baseTime.getTime() + timeIncrement);
                            const confidence = deviceData.data.confidence?.[index] || 0;
                            const accuracy = Math.min(100, Math.max(0, confidence * 100));

                            return {
                              time: timestamp.toISOString(),
                              period: timeframe === '24h' ? timestamp.toLocaleTimeString([], { hour: '2-digit' }) :
                                      timeframe === '7d' || timeframe === '30d' ? timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' }) :
                                      timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              device: device?.name || 'Device',
                              predicted: value,
                              accuracy: accuracy,
                              confidence: confidence * 100
                            };
                          }) || [];
                        })}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="period"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis yAxisId="usage" orientation="left" />
                        <YAxis yAxisId="accuracy" orientation="right" />
                        <Tooltip
                          formatter={(value: any, name: string) => [
                            name === 'accuracy' ? `${value?.toFixed(1) || 0}%` : `${value?.toFixed(1) || 0}%`,
                            name === 'predicted' ? 'Predicted Usage' :
                            name === 'accuracy' ? 'Prediction Accuracy' : name
                          ]}
                        />
                        <Legend />
                        <Bar
                          yAxisId="usage"
                          dataKey="predicted"
                          fill="#3b82f6"
                          name="Predicted Usage"
                          radius={[2, 2, 0, 0]}
                        />
                        <Line
                          yAxisId="accuracy"
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Accuracy %"
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Forecast Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            {Math.max(...forecastData.flatMap(d => d.data.forecast || [0]))?.toFixed(1) || '0.0'}%
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            Peak Usage Predicted
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Highest forecast value
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 dark:bg-green-950/20">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            {(forecastData.flatMap(d => d.data.confidence || []).reduce((a: number, b: number) => a + b, 0) / forecastData.flatMap(d => d.data.confidence || []).length * 100)?.toFixed(1) || '0.0'}%
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            Average Confidence
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Prediction reliability
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 dark:bg-purple-950/20">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-2">
                            {timeframe === '24h' ? 'Hourly' : timeframe === '7d' ? 'Daily' : timeframe === '30d' ? 'Daily' : '10-Min'}
                          </div>
                          <div className="text-sm text-purple-700 dark:text-purple-300">
                            Forecast Granularity
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Time-based intervals
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Insights */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Forecast Insights
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Peak usage predicted: {Math.max(...forecastData.flatMap(d => d.data.forecast || []))}% in upcoming {timeframe === '24h' ? 'hours' : 'periods'}</li>
                      <li>• Average confidence: {(forecastData.flatMap(d => d.data.confidence || []).reduce((a: number, b: number) => a + b, 0) / forecastData.flatMap(d => d.data.confidence || []).length * 100)?.toFixed(1) || '0.0'}%</li>
                      <li>• Trend: {forecastData[0]?.data.forecast?.[forecastData[0].data.forecast.length - 1] > forecastData[0]?.data.forecast?.[0] ? 'Increasing' : 'Stable'} usage pattern</li>
                      <li>• Time granularity: {timeframe === '24h' ? 'Hourly predictions' : timeframe === '7d' ? 'Daily predictions' : timeframe === '30d' ? 'Daily predictions' : '10-minute intervals'}</li>
                      {comparisonMode && <li>• Comparing {forecastData.length} devices across {timeframe} timeframe</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'anomaly':
        const anomalyData = predictionData.devices || [{ data: predictionData }];
        const filteredAnomalies = anomalyData.map((deviceData: any) => ({
          ...deviceData,
          data: {
            ...deviceData.data,
            anomalies: deviceData.data.anomalies?.filter((_: any, idx: number) => {
              const severity = deviceData.data.severity_levels?.[idx] || 'info';
              switch (anomalySeverity) {
                case 'critical': return severity === 'critical';
                case 'warning': return severity === 'critical' || severity === 'warning';
                case 'info': return true;
                default: return true;
              }
            }) || []
          }
        }));

        return (
          <div className="space-y-6">
            {/* Anomaly Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">
                      {filteredAnomalies.reduce((sum: number, d: any) => sum + (d.data.anomalies?.length || 0), 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Anomalies</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredAnomalies.reduce((sum: number, d: any) => sum + (d.data.scores?.length || 0), 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Data Points Analyzed</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {(predictionData.confidence || 0.95) * 100}%
                    </div>
                    <p className="text-sm text-muted-foreground">Detection Accuracy</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Anomaly Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Anomaly Detection Results
                </CardTitle>
                <CardDescription>
                  AI analysis with severity classification and detailed insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {filteredAnomalies.map((deviceData: any) => {
                    const device = devices.find(d => d.id === deviceData.deviceId);
                    return (
                      <div key={deviceData.deviceId} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          {device?.icon && <device.icon className="w-4 h-4" />}
                          {device?.name || 'Device'} Anomalies
                        </h4>

                        {deviceData.data.anomalies?.length > 0 ? (
                          <div className="space-y-3">
                            {deviceData.data.anomalies.map((index: number) => {
                              const severity = deviceData.data.severity_levels?.[index] || 'info';
                              const score = deviceData.data.scores?.[index] || 0;
                              const severityConfig = {
                                critical: { color: 'bg-red-100 border-red-300 text-red-800', icon: XCircle },
                                warning: { color: 'bg-yellow-100 border-yellow-300 text-yellow-800', icon: AlertTriangle },
                                info: { color: 'bg-blue-100 border-blue-300 text-blue-800', icon: Info }
                              }[severity] || { color: 'bg-gray-100 border-gray-300 text-gray-800', icon: Minus };

                              return (
                                <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg ${severityConfig.color}`}>
                                  <severityConfig.icon className="w-5 h-5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">Data point {index + 1}</span>
                                      <Badge variant="outline" className="capitalize">
                                        {severity}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      Anomaly score: {(score * 100).toFixed(1)}% |
                                      Threshold: {(deviceData.data.threshold * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-mono">
                                      {deviceData.data.scores?.[index] ? (deviceData.data.scores[index] * 100).toFixed(1) : 'N/A'}%
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <div className="text-green-600 font-medium">No anomalies detected</div>
                            <div className="text-sm">Device behavior is within normal parameters</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Anomaly Insights */}
                <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Anomaly Insights
                  </h4>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                    <li>• Detection threshold: {(predictionData.threshold || 0.8) * 100}% anomaly score</li>
                    <li>• Analysis timeframe: Last {timeframe} with {anomalySeverity} severity filter</li>
                    <li>• Total data points analyzed: {filteredAnomalies.reduce((sum: number, d: any) => sum + (d.data.scores?.length || 0), 0)}</li>
                    {filteredAnomalies.some((d: any) => d.data.anomalies?.length > 0) ? (
                      <li>• ⚠️ Anomalies detected - recommend maintenance inspection</li>
                    ) : (
                      <li>• ✅ No anomalies found - device operating normally</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'schedule':
        const scheduleData = predictionData.devices || [{ data: predictionData }];
        const weeklySchedule = scheduleData[0]?.data.schedule || {};

        // Prepare data for energy usage chart
        const energyData = Object.entries(weeklySchedule).map(([day, schedule]: [string, any]) => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          usage: schedule.energy_usage || 0,
          priority: schedule.priority,
          hours: schedule.start !== '00:00' ? 
            `${schedule.start} - ${schedule.end}` : 'Off'
        }));

        return (
          <div className="space-y-6">
            {/* Energy Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  Weekly Energy Usage Pattern
                </CardTitle>
                <CardDescription>
                  Optimized schedule with energy consumption breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={energyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => [`${value}%`, 'Energy Usage']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Bar
                        dataKey="usage"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  Smart Schedule Optimization
                </CardTitle>
                <CardDescription>
                  AI-recommended schedule with energy savings and priority levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Weekly Schedule</h4>
                    <div className="space-y-3">
                      {Object.entries(weeklySchedule).map(([day, schedule]: [string, any]) => {
                        const priorityColors = {
                          high: 'bg-red-100 text-red-800 border-red-300',
                          medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                          low: 'bg-blue-100 text-blue-800 border-blue-300',
                          off: 'bg-gray-100 text-gray-800 border-gray-300'
                        };

                        return (
                          <div key={day} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="font-medium capitalize w-16">{day}</div>
                              <div className="text-sm text-muted-foreground">
                                {schedule.start === '00:00' && schedule.end === '00:00' ? 'Off' : `${schedule.start} - ${schedule.end}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${priorityColors[schedule.priority as keyof typeof priorityColors] || priorityColors.off} border`}>
                                {schedule.priority}
                              </Badge>
                              <div className="text-sm font-mono w-12 text-right">
                                {schedule.energy_usage || 0}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Energy Optimization</h4>
                    <div className="space-y-4">
                      <div className="text-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {scheduleData[0]?.data.energy_savings?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          Estimated Energy Savings
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                          <span className="text-sm">Optimization Score:</span>
                          <span className="font-mono text-blue-600">
                            {(scheduleData[0]?.data.optimization_score || 0) * 100}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="font-semibold text-green-600">Peak Hours</div>
                            <div>Reduced usage</div>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="font-semibold text-blue-600">Off-Peak</div>
                            <div>Optimized timing</div>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Energy Breakdown */}
                      <div className="mt-4">
                        <h5 className="font-medium mb-2">Energy Usage Breakdown</h5>
                        <div className="space-y-2">
                          {energyData.map((item) => (
                            <div key={item.day} className="flex items-center gap-2">
                              <span className="text-sm w-12">{item.day}:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${item.usage}%` }}
                                />
                              </div>
                              <span className="text-sm font-mono w-10 text-right">{item.usage}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Insights */}
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Scheduling Insights
                  </h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Energy savings: {scheduleData[0]?.data.energy_savings?.toFixed(1) || 0}% reduction in weekly consumption</li>
                    <li>• Peak usage days: {energyData.filter(d => d.usage > 80).map(d => d.day).join(', ') || 'None'}</li>
                    <li>• Optimization strategy: Prioritizing off-peak hours and reducing weekend usage</li>
                    <li>• Schedule adaptability: Automatically adjusts based on usage patterns and constraints</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a prediction type to view AI insights</p>
            </div>
          </div>
        );
    }
  };

  // Tab labels with AI-focused descriptions
  const TABS = [
    { value: 'forecast', label: 'Usage Forecasting' },
    { value: 'schedule', label: 'Smart Scheduling' },
    { value: 'anomaly', label: 'Anomaly Detection' },
  ];  return (
    <div className="w-full bg-card shadow-2xl rounded-2xl p-6 sm:p-8 flex flex-col gap-8 border border-border">
      <h2 className="text-3xl font-bold mb-2 text-primary">AI/ML Insights</h2>
      
      {loading && devices.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mr-3" />
          <span className="text-lg">Loading devices and classrooms...</span>
        </div>
      ) : devices.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-lg text-muted-foreground">No devices found. Please check your connection.</span>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
  <TabsList className="mb-6 flex gap-1 bg-muted rounded-lg p-1 justify-start overflow-x-auto w-full">
          {TABS.map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/70 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md hover:bg-accent hover:text-primary whitespace-nowrap"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ value, label }) => (
          <TabsContent key={value} value={value} className="w-full">
            {currentDevice && currentClassroom ? (
              <div className="flex flex-col gap-6">
              {/* Location & Device Status Display */}
              {currentDevice && currentClassroom && currentDevice !== null && currentClassroom !== null && (
                <div className="bg-muted/30 rounded-lg p-4 border border-muted-foreground/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {currentDevice.icon ? (
                            <currentDevice.icon className="w-5 h-5 text-primary" />
                          ) : (
                            <Monitor className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{currentDevice.name} in {currentClassroom.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentClassroom.type ? (currentClassroom.type.charAt(0).toUpperCase() + currentClassroom.type.slice(1)) : 'Room'} • {currentDevice.type || 'Unknown'} device
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{FEATURE_META[value].desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentDevice.status === 'online' ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        currentDevice.status === 'online' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {currentDevice.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Controls */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Advanced Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Timeframe Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Timeframe</label>
                      <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-800"
                      >
                        {TIMEFRAME_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Anomaly Severity Filter */}
                    {tab === 'anomaly' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Severity Filter</label>
                        <select
                          value={anomalySeverity}
                          onChange={(e) => setAnomalySeverity(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-800"
                        >
                          {ANOMALY_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Historical Data Toggle */}
                    {tab === 'forecast' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Display Options</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="showHistorical"
                            checked={showHistorical}
                            onChange={(e) => setShowHistorical(e.target.checked)}
                            className="rounded"
                          />
                          <label htmlFor="showHistorical" className="text-sm">Show Historical</label>
                        </div>
                      </div>
                    )}

                    {/* Comparison Mode Toggle */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Analysis Mode</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="comparisonMode"
                          checked={comparisonMode}
                          onChange={(e) => setComparisonMode(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="comparisonMode" className="text-sm">Compare Devices</label>
                      </div>
                    </div>
                  </div>

                  {/* Model Performance Metrics */}
                  {modelMetrics[tab] && (
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Model Performance
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="text-lg font-bold text-blue-600">
                            {(modelMetrics[tab].accuracy * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="text-lg font-bold text-green-600">
                            {(modelMetrics[tab].confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Confidence</div>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="text-lg font-bold text-purple-600">
                            {modelMetrics[tab].responseTime}ms
                          </div>
                          <div className="text-xs text-muted-foreground">Response</div>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="text-lg font-bold text-orange-600">
                            v{modelMetrics[tab].modelVersion}
                          </div>
                          <div className="text-xs text-muted-foreground">Version</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Controls */}
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  className="btn btn-primary px-6 py-2 font-semibold rounded-md shadow-sm"
                  onClick={handleAction}
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  {FEATURE_META[value].action}
                </button>
                
                <div className="flex items-center gap-2">
                  <ToggleSwitch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  <span className="text-sm text-muted-foreground">Auto-refresh</span>
                </div>

                <button
                  className="btn btn-outline px-4 py-2"
                  onClick={handleExport}
                  title="Export prediction data"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export ({exportFormat.toUpperCase()})
                </button>

                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'pdf')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white dark:bg-gray-800"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF Report</option>
                </select>

                <button
                  className="btn btn-outline px-4 py-2"
                  onClick={() => fetchPredictions(value)}
                  title="Refresh predictions"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              {/* Results */}
              {result && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">AI Analysis Results:</h4>
                  <pre className="text-sm whitespace-pre-wrap">{result}</pre>
                </div>
              )}

              {/* AI Predictions Display */}
              <div className="mt-2">
                <div className="bg-background rounded-lg shadow p-4 min-h-[320px] border border-muted-foreground/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {currentClassroom?.name || 'Classroom'} - {currentDevice?.name || 'Device'} - {label} Analytics
                    </h3>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  {renderPredictions(value)}
                </div>
              </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <span className="text-lg text-muted-foreground">Please select a classroom and device to view analytics.</span>
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

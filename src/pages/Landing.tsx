import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Zap,
  Leaf,
  Cpu,
  Shield,
  BarChart3,
  Clock,
  ArrowRight,
  Lightbulb,
  TrendingDown,
  Wifi,
  CheckCircle,
  Menu,
  X,
  MonitorSmartphone,
  Brain,
  Calendar,
  Smartphone,
  Users,
  Settings,
  Activity,
  Eye,
  Target,
  Award,
  Sparkles,
  ChevronRight,
  PlayCircle
} from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [realTimeStats, setRealTimeStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalSwitches: 0,
    switchesOn: 0,
    energySavedPercentage: 40,
    uptimePercentage: 99.9
  });
  const [loading, setLoading] = useState(true);

  // Fetch real stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/public/stats');
        const result = await response.json();
        if (result.success && result.data) {
          setRealTimeStats({
            totalDevices: result.data.totalDevices || 0,
            onlineDevices: result.data.onlineDevices || 0,
            totalSwitches: result.data.totalSwitches || 0,
            switchesOn: result.data.switchesOn || 0,
            energySavedPercentage: result.data.energySavedPercentage || 40,
            uptimePercentage: result.data.uptimePercentage || 99.9
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: TrendingDown,
      title: 'Energy Monitoring',
      description: 'Real-time tracking of power consumption with detailed analytics and cost insights for every classroom',
      stat: '40% Savings'
    },
    {
      icon: Brain,
      title: 'AI Predictions',
      description: 'Machine learning algorithms predict usage patterns and optimize schedules automatically',
      stat: 'Smart Automation'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Automated device control based on class timings, occupancy sensors, and custom schedules',
      stat: '24/7 Control'
    },
    {
      icon: MonitorSmartphone,
      title: 'Remote Control',
      description: 'Control lights, fans, and devices from anywhere using web or mobile interface with instant response',
      stat: 'Zero Latency'
    },
    {
      icon: Shield,
      title: 'Security & Access',
      description: 'Role-based permissions, audit logs, and enterprise-grade security for institutional deployment',
      stat: 'Enterprise Grade'
    },
    {
      icon: Activity,
      title: 'Live Analytics',
      description: 'Comprehensive dashboards with real-time device status, usage reports, and energy metrics',
      stat: 'Real-time Data'
    }
  ];

  const howItWorks = [
    {
      step: '1',
      icon: Users,
      title: 'Register & Setup',
      description: 'Create your account and set up your institution profile with classrooms and users'
    },
    {
      step: '2',
      icon: Cpu,
      title: 'Connect Devices',
      description: 'Install ESP32 controllers and connect classroom devices through our MQTT network'
    },
    {
      step: '3',
      icon: Settings,
      title: 'Automate & Monitor',
      description: 'Configure schedules, set rules, and monitor energy consumption in real-time'
    }
  ];

  const benefits = [
    {
      icon: TrendingDown,
      title: 'Save Energy Up to 40%',
      description: 'Reduce electricity bills with intelligent automation and usage monitoring'
    },
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Machine learning optimizes schedules based on actual usage patterns'
    },
    {
      icon: Clock,
      title: 'Save Time & Effort',
      description: 'Eliminate manual switching with automated classroom management'
    },
    {
      icon: Target,
      title: 'Complete Control',
      description: 'Monitor and control all devices from a single centralized dashboard'
    }
  ];

  // Dynamic stats using real data
  const stats = [
    { 
      value: `${realTimeStats.energySavedPercentage}%`, 
      label: 'Energy Saved', 
      icon: TrendingDown 
    },
    { 
      value: realTimeStats.totalDevices > 0 ? `${realTimeStats.totalDevices}+` : '0', 
      label: 'Connected Devices', 
      icon: Wifi 
    },
    { 
      value: '24/7', 
      label: 'Active Monitoring', 
      icon: Clock 
    },
    { 
      value: `${realTimeStats.uptimePercentage}%`, 
      label: 'System Uptime', 
      icon: CheckCircle 
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2.5">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">AutoVolt</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Smart Classroom Automation</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3 items-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-slate-700 hover:text-blue-600 hover:bg-blue-50"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 shadow-lg shadow-blue-500/30"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-slate-900" />
              ) : (
                <Menu className="h-6 w-6 text-slate-900" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-slate-200 space-y-2 animate-in slide-in-from-top">
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-center text-slate-700 hover:bg-slate-100"
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  navigate('/register');
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
              >
                Get Started Free
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section with Classroom Background */}
      <section className="relative pt-20 pb-24 sm:pt-24 sm:pb-32 lg:pt-28 lg:pb-40 overflow-hidden">
        {/* Background with Classroom Image Overlay */}
        <div className="absolute inset-0 z-0">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-slate-900/95 z-10" />
          
          {/* Classroom Pattern/Texture */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="classroom-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#classroom-grid)" className="text-white" />
            </svg>
          </div>

          {/* Animated Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="container relative z-20 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20">
                <Sparkles className="h-4 w-4 text-blue-300" />
                <span className="text-sm font-medium">Smart IoT for Educational Institutions</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                  Automate Your
                  <span className="block mt-2 bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                    Smart Classroom
                  </span>
                </h1>
                
                {/* Tagline */}
                <p className="text-xl sm:text-2xl text-blue-100 font-medium max-w-3xl mx-auto">
                  Intelligent classroom automation for energy savings and effortless control
                </p>

                {/* Description */}
                <p className="text-base sm:text-lg text-blue-200/90 max-w-2xl mx-auto leading-relaxed">
                  Transform your educational spaces with AI-powered automation. Control lights, fans, and devices remotely while reducing energy costs by up to 40% with our smart IoT platform.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
            {[
              { 
                value: loading ? '...' : `${realTimeStats.energySavedPercentage}%`, 
                label: 'Energy Saved', 
                icon: TrendingDown, 
                color: 'text-green-600' 
              },
              { 
                value: loading ? '...' : (realTimeStats.totalDevices > 0 ? `${realTimeStats.totalDevices}` : '0'), 
                label: 'Devices Connected', 
                icon: Wifi, 
                color: 'text-blue-600' 
              },
              { 
                value: '24/7', 
                label: 'Active Monitoring', 
                icon: Clock, 
                color: 'text-purple-600' 
              },
              { 
                value: loading ? '...' : `${realTimeStats.uptimePercentage}%`, 
                label: 'System Uptime', 
                icon: CheckCircle, 
                color: 'text-teal-600' 
              }
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-xl hover:bg-slate-50 transition-colors">
                <stat.icon className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 ${stat.color}`} />
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
              <Award className="h-4 w-4" />
              <span className="text-sm font-semibold">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
              Comprehensive tools to automate, monitor, and optimize your classroom devices
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <Card key={i} className="border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 group bg-white">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors mb-4">
                      <feature.icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="inline-block ml-4 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      {feature.stat}
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-semibold">Simple Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Get Started in 3 Easy Steps
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              From registration to full automation in minutes
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
              {/* Connection Lines */}
              <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" style={{ top: '80px' }} />
              
              {howItWorks.map((step, i) => (
                <div key={i} className="relative text-center">
                  {/* Step Number */}
                  <div className="relative z-10 mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-3xl font-bold rounded-full shadow-lg mb-4 relative">
                      {step.step}
                      <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className="inline-flex p-4 rounded-2xl bg-blue-50 mb-4">
                    <step.icon className="h-10 w-10 text-blue-600" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                  
                  {/* Arrow */}
                  {i < howItWorks.length - 1 && (
                    <ChevronRight className="hidden md:block absolute top-20 -right-10 h-8 w-8 text-blue-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots / Demo Section */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-semibold">See It In Action</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Intuitive Dashboard & Controls
            </h2>
            <p className="text-lg sm:text-xl text-blue-200 max-w-3xl mx-auto">
              Monitor all your classroom devices from a beautiful, easy-to-use interface
            </p>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Browser Chrome */}
              <div className="bg-slate-800 rounded-t-2xl p-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-slate-700 rounded px-4 py-1 text-sm text-slate-400 text-center">
                  dashboard.autovolt.app
                </div>
              </div>
              
              {/* Dashboard Mockup */}
              <div className="bg-gradient-to-br from-slate-100 to-white p-8 rounded-b-2xl shadow-2xl">
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { icon: Lightbulb, label: 'Classroom A', status: '4 Devices ON', color: 'bg-green-100 text-green-700' },
                    { icon: BarChart3, label: 'Energy Usage', status: '234 kWh Today', color: 'bg-blue-100 text-blue-700' },
                    { icon: Calendar, label: 'Next Schedule', status: 'Auto OFF at 5 PM', color: 'bg-purple-100 text-purple-700' }
                  ].map((item, i) => (
                    <Card key={i} className="border-2">
                      <CardContent className="p-6">
                        <div className={`inline-flex p-3 rounded-lg ${item.color} mb-3`}>
                          <item.icon className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-slate-900 mb-1">{item.label}</p>
                        <p className="text-sm text-slate-600">{item.status}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Use AutoVolt - Value Proposition */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 sm:mb-20">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6">
                <Target className="h-4 w-4" />
                <span className="text-sm font-semibold">Why Choose Us</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Transform Your Institution
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                Experience the power of intelligent automation and sustainable energy management
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex gap-6 p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 hover:shadow-lg transition-shadow border border-slate-200">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                      <benefit.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Classroom?
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join hundreds of institutions saving energy costs and improving efficiency with AutoVolt's smart automation platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/register')}
                className="bg-white text-blue-900 hover:bg-blue-50 text-lg px-10 py-7 font-semibold shadow-xl group"
              >
                Start Free Trial Now
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/login')}
                className="border-2 border-white text-white hover:bg-white/10 text-lg px-10 py-7 font-semibold"
              >
                Sign In to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;

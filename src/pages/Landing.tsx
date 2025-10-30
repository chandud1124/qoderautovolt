import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
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
  PlayCircle,
  Layers,
  Boxes,
  Circle,
  ChevronDown,
  Play,
  TrendingUp,
  Tv,
  Wind,
  Monitor as MonitorIcon,
  Zap
} from 'lucide-react';
import '../styles/landing.css';


const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const hardwareRef = useRef<HTMLDivElement>(null);
  const [hardwareVisible, setHardwareVisible] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalSwitches: 0,
    switchesOn: 0,
    energySavedPercentage: 40,
    uptimePercentage: 99.9
  });
  const [loading, setLoading] = useState(true);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);

      // Determine active section
      const sections = document.querySelectorAll('section[data-section]');
      let currentSection = 0;
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
          currentSection = index;
        }
      });
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hardware section scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHardwareVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (hardwareRef.current) {
      observer.observe(hardwareRef.current);
    }

    return () => {
      if (hardwareRef.current) {
        observer.unobserve(hardwareRef.current);
      }
    };
  }, []);

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
            energySavedPercentage: parseFloat((result.data.energySavedPercentage || 40).toFixed(2)),
            uptimePercentage: parseFloat((result.data.uptimePercentage || 99.9).toFixed(2))
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
      stat: `${realTimeStats.energySavedPercentage}% Savings`
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

  const benefits = [
    {
      icon: TrendingDown,
      title: `Save Energy Up to ${realTimeStats.energySavedPercentage}%`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-x-hidden">
      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 z-[100]">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 transition-all duration-300 shadow-lg shadow-blue-500/50"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />
      </div>
      {/* Navigation - Glassmorphism */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-transparent backdrop-blur-xl border-b border-white/10" />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo with 3D Effect */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/50 transform group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
                  AutoVolt
                </h1>
                <p className="text-[10px] sm:text-xs text-blue-300/80 font-medium">Smart Classroom Automation</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3 items-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-blue-100 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/10"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="relative group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white gap-2 shadow-lg shadow-blue-500/50 border border-blue-400/30"
              >
                <span className="relative z-10">Register</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg opacity-0 group-hover:opacity-30 blur transition-opacity" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-2 backdrop-blur-xl bg-slate-900/50 rounded-lg p-4 animate-in slide-in-from-top">
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-center text-blue-100 hover:bg-white/10 border border-white/10"
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  navigate('/register');
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/50"
              >
                Get Started Free
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - 3D Interactive */}
      <section 
        ref={heroRef}
        data-section="0"
        className="relative pt-20 pb-16 sm:pt-24 sm:pb-24 lg:pt-28 lg:pb-40 overflow-hidden min-h-[90vh] sm:min-h-screen flex items-center"
      >
        {/* Animated 3D Background Elements */}
        <div className="absolute inset-0 z-0">
          {/* Gradient Overlay with animated orbs */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-slate-900/95 z-10" />
          
          {/* Floating 3D Orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-spin-slow" />
          
          {/* 3D Grid Pattern with perspective */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                transform: 'perspective(1000px) rotateX(60deg)',
                transformOrigin: 'center center'
              }}
            />
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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-left space-y-8 animate-in slide-in-from-left duration-1000">
              {/* Badge with Glassmorphism */}
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg">
                <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span className="text-sm font-medium text-blue-200">AI-Powered Automation Platform</span>
              </div>

              {/* Heading with Gradient Animation */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="block text-white drop-shadow-2xl">
                    Transform Your
                  </span>
                  <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-2xl animate-gradient">
                    Smart Classroom
                  </span>
                  <span className="block text-white drop-shadow-2xl">
                    Into the Future
                  </span>
                </h1>
                
                {/* Description */}
                <p className="text-lg sm:text-xl text-blue-200/90 leading-relaxed max-w-2xl">
                  Experience next-generation classroom automation with AI-powered scheduling,
                  real-time monitoring, and intelligent energy management. Save up to{' '}
                  <span className="text-cyan-400 font-bold">{realTimeStats.energySavedPercentage}% on electricity</span> costs.
                </p>
              </div>

              {/* Animated Stats - Glassmorphism Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { 
                    value: loading ? '...' : `${realTimeStats.totalDevices}+`, 
                    label: 'Active Devices', 
                    icon: Activity, 
                    color: 'from-blue-500 to-cyan-500' 
                  },
                  { 
                    value: loading ? '...' : `${realTimeStats.switchesOn}+`, 
                    label: 'Devices Online', 
                    icon: Calendar, 
                    color: 'from-cyan-500 to-blue-500' 
                  },
                  { 
                    value: `${realTimeStats.energySavedPercentage}%`, 
                    label: 'Energy Saved', 
                    icon: TrendingUp, 
                    color: 'from-green-500 to-emerald-500' 
                  }
                ].map((stat, idx) => (
                  <div 
                    key={idx}
                    className="group relative bg-white/5 backdrop-blur-xl rounded-lg sm:rounded-2xl p-2 sm:p-4 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-lg sm:rounded-2xl transition-opacity" 
                         style={{ backgroundImage: `linear-gradient(to bottom right, rgb(59, 130, 246), rgb(34, 211, 238))` }} />
                    <div className={`inline-flex p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${stat.color} mb-1 sm:mb-2`}>
                      <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] sm:text-xs text-blue-200/70 leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons with 3D Effect */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-4 border-t border-white/10">
                
              </div>
            </div>

            {/* Right: 3D Dashboard Preview */}
            <div className="relative animate-in slide-in-from-right duration-1000 delay-300 max-w-full overflow-hidden">
              <div className="relative perspective-1000 max-w-2xl mx-auto lg:mx-0">
                {/* Floating Dashboard Card with Glassmorphism */}
                <div className="relative group">
                  {/* Glow Effect */}
                  <div className="hidden lg:block absolute -inset-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity animate-pulse" />
                  
                  {/* Main Dashboard */}
                  <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-2xl rounded-2xl lg:rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl transform group-hover:scale-[1.02] transition-all duration-500 lg:rotate-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">Live Dashboard</h3>
                        <p className="text-xs sm:text-sm text-blue-200/70">Real-time monitoring</p>
                      </div>
                      <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-green-300">Online</span>
                      </div>
                    </div>

                    {/* 3D Device Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                      {[
                        { name: 'Main Lights', status: 'ON', icon: Lightbulb, color: 'yellow' },
                        { name: 'Projector', status: 'OFF', icon: Tv, color: 'blue' },
                        { name: 'Ncomuting', status: 'ON', icon: MonitorIcon, color: 'cyan' },
                        { name: 'Fan', status: 'ON', icon: Wind, color: 'purple' }
                      ].map((device, idx) => (
                        <div 
                          key={idx}
                          className="relative bg-white/5 backdrop-blur-xl rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-lg group/card"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className={`inline-flex p-1.5 sm:p-2 rounded-lg ${
                            device.color === 'yellow' ? 'bg-yellow-500/20' :
                            device.color === 'blue' ? 'bg-blue-500/20' :
                            device.color === 'cyan' ? 'bg-cyan-500/20' :
                            'bg-purple-500/20'
                          } mb-2`}>
                            <device.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              device.color === 'yellow' ? 'text-yellow-400' :
                              device.color === 'blue' ? 'text-blue-400' :
                              device.color === 'cyan' ? 'text-cyan-400' :
                              'text-purple-400'
                            }`} />
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-white truncate">{device.name}</div>
                          <div className={`text-xs ${device.status === 'ON' ? 'text-green-400' : 'text-gray-400'}`}>
                            {device.status}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Energy Chart Visualization */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/10">
                      {/* Animated Line Chart */}
                      <div className="relative h-16 sm:h-20 w-full">
                        <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                          {/* Grid lines */}
                          <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
                              <stop offset="50%" stopColor="rgb(34, 211, 238)" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.8" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal grid lines */}
                          <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                          <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                          <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                          {/* Energy consumption line */}
                          <path
                            d="M0,60 Q25,45 50,55 T100,35 Q125,25 150,40 T200,30"
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="2"
                            className="animate-pulse"
                            style={{ animationDuration: '3s' }}
                          />

                          {/* Animated data points */}
                          {[
                            { x: 0, y: 60 },
                            { x: 25, y: 45 },
                            { x: 50, y: 55 },
                            { x: 75, y: 35 },
                            { x: 100, y: 35 },
                            { x: 125, y: 25 },
                            { x: 150, y: 40 },
                            { x: 175, y: 35 },
                            { x: 200, y: 30 }
                          ].map((point, i) => (
                            <circle
                              key={i}
                              cx={point.x}
                              cy={point.y}
                              r="2"
                              fill="rgb(34, 211, 238)"
                              className="animate-pulse"
                              style={{
                                animationDelay: `${i * 200}ms`,
                                animationDuration: '2s'
                              }}
                            />
                          ))}
                        </svg>

                        {/* Energy consumption indicator */}
                        <div className="absolute top-1 left-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-xs text-white font-medium">Live Trend</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Info Cards - Hidden on mobile to prevent overflow */}
                  <div className="hidden lg:block absolute -right-6 top-20 animate-float">
                    <div className="bg-gradient-to-br from-green-500/90 to-emerald-500/90 backdrop-blur-xl rounded-2xl p-4 border border-green-400/30 shadow-2xl shadow-green-500/30">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-full p-2">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">{realTimeStats.energySavedPercentage}%</div>
                          <div className="text-xs text-green-100">Energy Saved</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-blue-200/70">Scroll to explore</span>
            <ChevronDown className="h-6 w-6 text-blue-400" />
          </div>
        </div>

        {/* Decorative Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          </svg>
        </div>
      </section>

      {/* 3D Hardware Components Section - Futuristic */}
      <section 
        ref={hardwareRef}
        data-section="1"
        className="py-20 sm:py-32 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-950"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16 sm:mb-24">
            <div 
              className={`inline-flex items-center gap-2 bg-blue-500/10 backdrop-blur-xl px-4 py-2 rounded-full border border-blue-500/30 mb-6 transition-all duration-1000 ${
                hardwareVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <Cpu className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-sm font-medium text-blue-200">IoT Hardware Architecture</span>
            </div>
            
            <h2 
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 transition-all duration-1000 delay-100 ${
                hardwareVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <span className="block text-white mb-2">Powered by</span>
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Industrial-Grade Hardware
              </span>
            </h2>
            
            <p 
              className={`text-lg sm:text-xl text-blue-200/80 max-w-3xl mx-auto transition-all duration-1000 delay-200 ${
                hardwareVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              Built with cutting-edge ESP32 microcontrollers, professional relay modules,
              and intelligent PIR sensors for reliable classroom automation
            </p>
          </div>

          {/* Features Grid - Now at top */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-6xl mx-auto">
            {[
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Real-time Control",
                description: "Instant device switching with <50ms latency",
                gradient: "from-blue-600 to-cyan-600"
              },
              {
                icon: <Wifi className="h-8 w-8" />,
                title: "Cloud Integration",
                description: "MQTT & WebSocket for seamless connectivity",
                gradient: "from-purple-600 to-pink-600"
              },
              {
                icon: <Brain className="h-8 w-8" />,
                title: "Smart Automation",
                description: "PIR-based occupancy detection & scheduling",
                gradient: "from-teal-600 to-emerald-600"
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: "Secure by Design",
                description: "End-to-end encryption & role-based access",
                gradient: "from-indigo-600 to-blue-600"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`group relative transition-all duration-1000 ${
                  hardwareVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${500 + index * 100}ms` }}
              >
                {/* Glow Effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-75 transition-opacity duration-500`} />

                {/* Card */}
                <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 h-full">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-blue-200/70 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Info */}
          <div 
            className={`mt-16 text-center transition-all duration-1000 delay-900 ${
              hardwareVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-6 bg-white/5 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/10 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-white font-semibold">Industrial Grade</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="text-white font-semibold">CE Certified</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-400" />
                <span className="text-white font-semibold">Energy Efficient</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Stats Section - Glassmorphism */}
      <section 
        data-section="1"
        className="py-12 sm:py-16 lg:py-20 relative bg-slate-950"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[
              { 
                value: loading ? '...' : `${realTimeStats.energySavedPercentage}%`, 
                label: 'Energy Saved', 
                icon: TrendingDown, 
                color: 'from-green-500 to-emerald-500',
                bg: 'bg-green-500/10'
              },
              { 
                value: loading ? '...' : (realTimeStats.totalDevices > 0 ? `${realTimeStats.totalDevices}` : '0'), 
                label: 'Devices Connected', 
                icon: Wifi, 
                color: 'from-blue-500 to-cyan-500',
                bg: 'bg-blue-500/10'
              },
              { 
                value: '24/7', 
                label: 'Active Monitoring', 
                icon: Clock, 
                color: 'from-purple-500 to-pink-500',
                bg: 'bg-purple-500/10'
              },
              { 
                value: loading ? '...' : `${realTimeStats.uptimePercentage}%`, 
                label: 'System Uptime', 
                icon: CheckCircle, 
                color: 'from-teal-500 to-cyan-500',
                bg: 'bg-teal-500/10'
              }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="group relative bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                {/* Hover Glow */}
                <div className={`absolute inset-0 ${stat.bg} rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
                
                {/* Icon with gradient */}
                <div className={`relative inline-flex p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.color} mb-2 sm:mb-4 shadow-lg`}>
                  <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
                </div>
                
                {/* Stats */}
                <div className="relative">
                  <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-1 sm:mb-2">{stat.value}</div>
                  <div className="text-xs sm:text-sm lg:text-base text-blue-200/80 font-medium leading-tight">{stat.label}</div>
                </div>

                {/* Decorative Corner */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-12 h-12 sm:w-16 sm:h-16 border-t border-r border-white/10 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Screenshots / Demo Section */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
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

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white py-16 sm:py-20 border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg p-2 shadow-lg">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" fill="currentColor"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  AutoVolt
                </h3>
              </div>
              <p className="text-blue-200/80 text-sm leading-relaxed">
                Smart Classroom Automation powered by AI for sustainable energy management
              </p>
            </div>

            {/* Team Members */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                Team Members
              </h4>
              <ul className="space-y-2 text-sm text-blue-200/80">
                <li className="hover:text-cyan-400 transition-colors">• Chandu. D</li>
                <li className="hover:text-cyan-400 transition-colors">• Kiran Raj. R</li>
                <li className="hover:text-cyan-400 transition-colors">• Mohammad Firose</li>
                <li className="hover:text-cyan-400 transition-colors">• Vedant</li>
                <li className="hover:text-cyan-400 transition-colors">• Kishor. HR</li>
              </ul>
            </div>

            {/* Leadership */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-cyan-400" />
                Leadership
              </h4>
              <ul className="space-y-3 text-sm">
                <div>
                  <p className="text-blue-200/80">Mentor</p>
                  <p className="text-white font-semibold">Anush</p>
                </div>
                <div>
                  <p className="text-blue-200/80">Dean</p>
                  <p className="text-white font-semibold">Rekha. C</p>
                </div>
              </ul>
            </div>

            {/* Design & Development */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                Design & Development
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-blue-200/80">Designed By</p>
                  <p className="text-white font-semibold">Team AutoVolt</p>
                </div>
                <div>
                  <p className="text-blue-200/80">Tech Stack</p>
                  <p className="text-white font-semibold">React • TypeScript • Vite</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-8 mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-blue-200/70 text-sm text-center sm:text-left">
                © 2025 AutoVolt. All rights reserved. Smart Classroom Automation Platform.
              </p>
              <div className="flex gap-6 text-sm text-blue-200/70">
                <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;

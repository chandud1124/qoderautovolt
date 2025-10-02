import React from 'react';
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
  Users,
  Globe,
  Battery,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  TrendingDown,
  Wifi,
  Lock
} from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Control',
      description: 'Instant hardware device control with WebSocket technology for zero-latency operations',
      color: 'text-yellow-500'
    },
    {
      icon: Leaf,
      title: 'Sustainability First',
      description: 'Reduce energy consumption by up to 40% through intelligent automation and scheduling',
      color: 'text-green-500'
    },
    {
      icon: Cpu,
      title: 'ESP32 Integration',
      description: 'Direct hardware integration with ESP32 microcontrollers via MQTT protocol',
      color: 'text-blue-500'
    },
    {
      icon: BarChart3,
      title: 'Energy Analytics',
      description: 'Comprehensive power monitoring with real-time analytics and cost tracking',
      color: 'text-purple-500'
    },
    {
      icon: Clock,
      title: 'Smart Scheduling',
      description: 'Automated device control based on time, occupancy, and custom rules',
      color: 'text-orange-500'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based access control with JWT authentication and audit logging',
      color: 'text-red-500'
    }
  ];

  const stats = [
    { value: '40%', label: 'Energy Saved', icon: TrendingDown },
    { value: '1000+', label: 'Devices Connected', icon: Wifi },
    { value: '24/7', label: 'Monitoring', icon: Clock },
    { value: '99.9%', label: 'Uptime', icon: CheckCircle }
  ];

  const benefits = [
    {
      title: 'For Educational Institutions',
      points: [
        'Automated classroom management',
        'Student attendance tracking',
        'Energy cost reduction',
        'Smart notice board system'
      ]
    },
    {
      title: 'For Businesses',
      points: [
        'Office automation',
        'Employee access control',
        'Meeting room management',
        'Operational cost savings'
      ]
    },
    {
      title: 'For Smart Homes',
      points: [
        'Home automation',
        'Voice control integration',
        'Security monitoring',
        'Energy optimization'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">AutoVolt</h1>
              <p className="text-xs text-muted-foreground">Smart Power Management</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button
              onClick={() => navigate('/register')}
              className="gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Leaf className="h-4 w-4" />
            <span className="text-sm font-medium">Sustainable Hardware Automation</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-500 to-green-500 bg-clip-text text-transparent">
            Power Your Future
            <br />
            Sustainably
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Intelligent IoT power management system that connects directly to hardware devices,
            reducing energy consumption while maximizing efficiency through real-time automation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="gap-2 text-lg px-8 py-6"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="text-lg px-8 py-6"
            >
              View Demo
            </Button>
          </div>

          {/* Hero Image/Animation */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl p-8 backdrop-blur-sm border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { icon: Lightbulb, label: 'Lights', status: 'Active' },
                  { icon: Cpu, label: 'ESP32', status: 'Online' },
                  { icon: Battery, label: 'Power', status: '87%' },
                  { icon: Wifi, label: 'Network', status: 'Connected' }
                ].map((item, i) => (
                  <Card key={i} className="bg-background/50 backdrop-blur">
                    <CardContent className="p-4 text-center">
                      <item.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.status}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-10 w-10 mx-auto mb-3 text-primary" />
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your hardware devices sustainably and efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className={`inline-block p-3 rounded-lg bg-primary/10 mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple setup, powerful results</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                icon: Smartphone,
                title: 'Connect Hardware',
                description: 'Connect ESP32 devices to your electrical equipment'
              },
              {
                step: '02',
                icon: Wifi,
                title: 'Network Setup',
                description: 'Configure MQTT connection and register devices'
              },
              {
                step: '03',
                icon: Users,
                title: 'User Management',
                description: 'Set up roles and permissions for team access'
              },
              {
                step: '04',
                icon: Zap,
                title: 'Automate & Save',
                description: 'Create schedules and watch energy savings grow'
              }
            ].map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="bg-primary text-primary-foreground text-2xl font-bold rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  {step.step}
                </div>
                <step.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {i < 3 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built For Everyone</h2>
            <p className="text-xl text-muted-foreground">
              Tailored solutions for different industries and use cases
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold mb-4">{benefit.title}</h3>
                  <ul className="space-y-3">
                    {benefit.points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Enterprise-Grade Technology</h2>
            <p className="text-xl text-muted-foreground">
              Built with modern, reliable, and scalable technologies
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'ESP32', desc: 'Hardware' },
              { name: 'MQTT', desc: 'Protocol' },
              { name: 'React', desc: 'Frontend' },
              { name: 'Node.js', desc: 'Backend' },
              { name: 'MongoDB', desc: 'Database' },
              { name: 'WebSocket', desc: 'Real-time' },
              { name: 'Docker', desc: 'Deployment' },
              { name: 'JWT', desc: 'Security' }
            ].map((tech, i) => (
              <Card key={i} className="text-center hover:scale-105 transition-transform">
                <CardContent className="p-4">
                  <Cpu className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-bold">{tech.name}</p>
                  <p className="text-xs text-muted-foreground">{tech.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground">
            <CardContent className="p-12 text-center">
              <Globe className="h-16 w-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-4xl font-bold mb-4">
                Ready to Transform Your Energy Management?
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Join thousands of organizations saving energy and reducing costs with AutoVolt
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/register')}
                  className="text-lg px-8 py-6"
                >
                  Start Free Trial
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="text-lg px-8 py-6 border-2 border-white text-white hover:bg-white hover:text-primary"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/50 py-12 px-4 border-t">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">AutoVolt</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Intelligent IoT power management for a sustainable future
              </p>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
                <li>Roadmap</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Community</li>
                <li>Support</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 AutoVolt. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

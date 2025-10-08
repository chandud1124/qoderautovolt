import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedInput } from '@/components/ui/enhanced-input';
import { EnhancedTextarea } from '@/components/ui/enhanced-textarea';
import { EnhancedSelect, EnhancedSelectItem } from '@/components/ui/enhanced-select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Lock, Building, Cpu, Search, Phone } from 'lucide-react';

export default function FormComponentsDemo() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [building, setBuilding] = useState('');
  const [deviceType, setDeviceType] = useState('');

  // Simulated validation
  const [usernameError, setUsernameError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [loadingUsername, setLoadingUsername] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    
    // Simulate validation
    if (value && value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
    } else {
      setUsernameError('');
    }
  };

  const handleEmailBlur = () => {
    if (email && email.includes('@')) {
      setEmailSuccess('Email format is valid');
    } else {
      setEmailSuccess('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { username, email, password, description, building, deviceType });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Form Components Demo</h1>
          <p className="text-muted-foreground">
            Showcasing EnhancedInput, EnhancedTextarea, and EnhancedSelect components
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="outline">Floating Labels</Badge>
            <Badge variant="outline">Validation States</Badge>
            <Badge variant="outline">Icon Support</Badge>
            <Badge variant="outline">TypeScript</Badge>
          </div>
        </div>

        <Separator />

        {/* Input Variants */}
        <Card>
          <CardHeader>
            <CardTitle>EnhancedInput - Text Inputs</CardTitle>
            <CardDescription>
              Modern text inputs with floating labels, validation states, and icon support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Input */}
              <EnhancedInput
                label="Full Name"
                placeholder="Enter your name"
                required
                hint="First and last name"
              />

              {/* Input with Icon */}
              <EnhancedInput
                label="Username"
                icon={<User className="h-4 w-4" />}
                value={username}
                onChange={handleUsernameChange}
                error={usernameError}
                loading={loadingUsername}
                hint="Unique identifier for your account"
              />

              {/* Email with Success State */}
              <EnhancedInput
                label="Email Address"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                success={emailSuccess}
                required
              />

              {/* Password with Toggle */}
              <EnhancedInput
                label="Password"
                type="password"
                icon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint="Must be at least 8 characters"
                required
              />

              {/* Input with Error */}
              <EnhancedInput
                label="Phone Number"
                icon={<Phone className="h-4 w-4" />}
                error="Invalid phone number format"
                defaultValue="123"
              />

              {/* Loading State */}
              <EnhancedInput
                label="Organization Code"
                loading
                hint="Validating code..."
                defaultValue="ABC123"
              />
            </div>
          </CardContent>
        </Card>

        {/* Variant Styles */}
        <Card>
          <CardHeader>
            <CardTitle>Input Variants</CardTitle>
            <CardDescription>
              Three visual styles: default, filled, and outlined
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Default Variant */}
              <EnhancedInput
                label="Default Variant"
                variant="default"
                icon={<User className="h-4 w-4" />}
                placeholder="Standard style"
              />

              {/* Filled Variant */}
              <EnhancedInput
                label="Filled Variant"
                variant="filled"
                icon={<Search className="h-4 w-4" />}
                placeholder="Modern minimal"
              />

              {/* Outlined Variant */}
              <EnhancedInput
                label="Outlined Variant"
                variant="outlined"
                icon={<Mail className="h-4 w-4" />}
                placeholder="Clear borders"
              />
            </div>
          </CardContent>
        </Card>

        {/* Textarea */}
        <Card>
          <CardHeader>
            <CardTitle>EnhancedTextarea - Multi-line Input</CardTitle>
            <CardDescription>
              Textarea with floating labels, character counting, and validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Textarea */}
              <EnhancedTextarea
                label="Description"
                placeholder="Enter a description"
                hint="Provide detailed information"
                rows={4}
              />

              {/* Textarea with Character Count */}
              <EnhancedTextarea
                label="Notice Content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                showCount
                maxLength={500}
                hint="Maximum 500 characters"
                rows={4}
              />

              {/* Filled Variant */}
              <EnhancedTextarea
                label="Notes"
                variant="filled"
                placeholder="Internal notes"
                rows={4}
              />

              {/* With Error */}
              <EnhancedTextarea
                label="Feedback"
                error="Message is too short (minimum 10 characters)"
                defaultValue="Short"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Select Dropdown */}
        <Card>
          <CardHeader>
            <CardTitle>EnhancedSelect - Dropdown Selection</CardTitle>
            <CardDescription>
              Select dropdown with floating labels, icons, and validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Select */}
              <EnhancedSelect
                label="Building Block"
                icon={<Building className="h-4 w-4" />}
                value={building}
                onValueChange={setBuilding}
                placeholder="Select a block"
                required
              >
                <EnhancedSelectItem value="a">Block A</EnhancedSelectItem>
                <EnhancedSelectItem value="b">Block B</EnhancedSelectItem>
                <EnhancedSelectItem value="c">Block C</EnhancedSelectItem>
                <EnhancedSelectItem value="d">Block D</EnhancedSelectItem>
              </EnhancedSelect>

              {/* Select with Icon */}
              <EnhancedSelect
                label="Device Type"
                icon={<Cpu className="h-4 w-4" />}
                value={deviceType}
                onValueChange={setDeviceType}
                hint="Choose the device model"
              >
                <EnhancedSelectItem value="esp32">ESP32</EnhancedSelectItem>
                <EnhancedSelectItem value="esp8266">ESP8266</EnhancedSelectItem>
                <EnhancedSelectItem value="arduino">Arduino Uno</EnhancedSelectItem>
                <EnhancedSelectItem value="raspberry">Raspberry Pi</EnhancedSelectItem>
              </EnhancedSelect>

              {/* Filled Variant */}
              <EnhancedSelect
                label="Department"
                variant="filled"
                placeholder="Select department"
              >
                <EnhancedSelectItem value="cs">Computer Science</EnhancedSelectItem>
                <EnhancedSelectItem value="ee">Electrical Engineering</EnhancedSelectItem>
                <EnhancedSelectItem value="me">Mechanical Engineering</EnhancedSelectItem>
              </EnhancedSelect>

              {/* With Error */}
              <EnhancedSelect
                label="Floor Level"
                error="Please select a floor"
                placeholder="Required field"
              >
                <EnhancedSelectItem value="0">Ground Floor</EnhancedSelectItem>
                <EnhancedSelectItem value="1">First Floor</EnhancedSelectItem>
                <EnhancedSelectItem value="2">Second Floor</EnhancedSelectItem>
              </EnhancedSelect>
            </div>
          </CardContent>
        </Card>

        {/* Complete Form Example */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Form Example</CardTitle>
            <CardDescription>
              All components working together in a real form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <EnhancedInput
                  label="Device Name"
                  icon={<Cpu className="h-4 w-4" />}
                  required
                  hint="Unique name for identification"
                />

                <EnhancedSelect
                  label="Location"
                  icon={<Building className="h-4 w-4" />}
                  required
                  placeholder="Select location"
                >
                  <EnhancedSelectItem value="lab1">Computer Lab 1</EnhancedSelectItem>
                  <EnhancedSelectItem value="lab2">Computer Lab 2</EnhancedSelectItem>
                  <EnhancedSelectItem value="library">Library</EnhancedSelectItem>
                </EnhancedSelect>

                <EnhancedInput
                  label="IP Address"
                  placeholder="192.168.1.100"
                  hint="Static IP address"
                />

                <EnhancedInput
                  label="MAC Address"
                  placeholder="00:11:22:33:44:55"
                  hint="Hardware address"
                />
              </div>

              <EnhancedTextarea
                label="Description"
                showCount
                maxLength={300}
                hint="Provide additional details about the device"
                rows={4}
              />

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="submit">
                  Save Device
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Features Summary */}
        <Card>
          <CardHeader>
            <CardTitle>✨ Features</CardTitle>
            <CardDescription>
              What makes these components special
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2">🎨 Visual Design</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Floating labels with smooth animation</li>
                  <li>• Three visual variants (default, filled, outlined)</li>
                  <li>• Consistent 48px height</li>
                  <li>• Professional appearance</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">✅ Validation</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Error states with red borders</li>
                  <li>• Success states with green borders</li>
                  <li>• Loading states with spinners</li>
                  <li>• Helper text for guidance</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">♿ Accessibility</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full keyboard navigation</li>
                  <li>• ARIA labels and attributes</li>
                  <li>• Screen reader compatible</li>
                  <li>• WCAG AA compliant</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

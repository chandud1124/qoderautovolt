import React, { useState } from 'react';
import { MacAddressInput } from '@/components/ui/mac-address-input';
import { IpAddressInput } from '@/components/ui/ip-address-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Network, Shield, CheckCircle2, XCircle, Info } from 'lucide-react';

/**
 * Network Input Components Example
 * Demonstrates MAC address and IP address input with auto-formatting
 */
export default function NetworkInputExample() {
  // MAC Address states
  const [macAddress, setMacAddress] = useState('');
  const [macValid, setMacValid] = useState(false);
  const [macSeparator, setMacSeparator] = useState<':' | '-'>(':');

  // IP Address states
  const [ipAddress, setIpAddress] = useState('');
  const [ipValid, setIpValid] = useState(false);
  const [subnetMask, setSubnetMask] = useState('');
  const [gateway, setGateway] = useState('');
  const [dns, setDns] = useState('');

  // Form submission
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    
    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  const handleReset = () => {
    setMacAddress('');
    setMacValid(false);
    setIpAddress('');
    setIpValid(false);
    setSubnetMask('');
    setGateway('');
    setDns('');
    setSubmitted(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          Network Input Components
        </h1>
        <p className="text-muted-foreground">
          Auto-formatting inputs for MAC addresses and IP addresses
        </p>
      </div>

      {/* Success Alert */}
      {submitted && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Network configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo">
            <Network className="h-4 w-4 mr-2" />
            Demo
          </TabsTrigger>
          <TabsTrigger value="examples">
            <Info className="h-4 w-4 mr-2" />
            Examples
          </TabsTrigger>
          <TabsTrigger value="features">
            <Shield className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
        </TabsList>

        {/* Demo Tab */}
        <TabsContent value="demo" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* MAC Address Section */}
            <Card>
              <CardHeader>
                <CardTitle>MAC Address Input</CardTitle>
                <CardDescription>
                  Automatically formats as you type (AA:BB:CC:DD:EE:FF)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mac-address">MAC Address</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={macSeparator === ':' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMacSeparator(':')}
                      >
                        Colon (:)
                      </Button>
                      <Button
                        type="button"
                        variant={macSeparator === '-' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMacSeparator('-')}
                      >
                        Hyphen (-)
                      </Button>
                    </div>
                  </div>
                  <MacAddressInput
                    id="mac-address"
                    value={macAddress}
                    onChange={setMacAddress}
                    onValidChange={(value, valid) => {
                      setMacAddress(value);
                      setMacValid(valid);
                    }}
                    separator={macSeparator}
                    placeholder={macSeparator === ':' ? 'AA:BB:CC:DD:EE:FF' : 'AA-BB-CC-DD-EE-FF'}
                  />
                  <div className="flex items-center gap-2">
                    {macValid ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Valid MAC Address
                      </Badge>
                    ) : macAddress ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Invalid Format
                      </Badge>
                    ) : (
                      <Badge variant="outline">Enter MAC address</Badge>
                    )}
                  </div>
                </div>

                {macAddress && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-mono">
                      <strong>Current Value:</strong> {macAddress}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Clean Value:</strong> {macAddress.replace(/[:-]/g, '')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* IP Address Section */}
            <Card>
              <CardHeader>
                <CardTitle>IP Address Inputs</CardTitle>
                <CardDescription>
                  Auto-formats IPv4 addresses with dots (192.168.1.1)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* IP Address */}
                <div className="space-y-2">
                  <Label htmlFor="ip-address">IP Address</Label>
                  <IpAddressInput
                    id="ip-address"
                    value={ipAddress}
                    onChange={setIpAddress}
                    onValidChange={(value, valid) => {
                      setIpAddress(value);
                      setIpValid(valid);
                    }}
                    placeholder="192.168.1.100"
                  />
                  <div className="flex items-center gap-2">
                    {ipValid ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Valid IP Address
                      </Badge>
                    ) : ipAddress ? (
                      <Badge variant="outline">
                        <Info className="h-3 w-3 mr-1" />
                        Continue typing...
                      </Badge>
                    ) : (
                      <Badge variant="outline">Enter IP address</Badge>
                    )}
                  </div>
                </div>

                {/* Subnet Mask */}
                <div className="space-y-2">
                  <Label htmlFor="subnet-mask">Subnet Mask</Label>
                  <IpAddressInput
                    id="subnet-mask"
                    value={subnetMask}
                    onChange={setSubnetMask}
                    placeholder="255.255.255.0"
                  />
                </div>

                {/* Gateway */}
                <div className="space-y-2">
                  <Label htmlFor="gateway">Gateway</Label>
                  <IpAddressInput
                    id="gateway"
                    value={gateway}
                    onChange={setGateway}
                    placeholder="192.168.1.1"
                  />
                </div>

                {/* DNS */}
                <div className="space-y-2">
                  <Label htmlFor="dns">DNS Server</Label>
                  <IpAddressInput
                    id="dns"
                    value={dns}
                    onChange={setDns}
                    placeholder="8.8.8.8"
                  />
                </div>

                {ipAddress && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm font-mono">
                      <strong>IP:</strong> {ipAddress}
                    </p>
                    {subnetMask && (
                      <p className="text-sm font-mono">
                        <strong>Subnet:</strong> {subnetMask}
                      </p>
                    )}
                    {gateway && (
                      <p className="text-sm font-mono">
                        <strong>Gateway:</strong> {gateway}
                      </p>
                    )}
                    {dns && (
                      <p className="text-sm font-mono">
                        <strong>DNS:</strong> {dns}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="submit" disabled={!macValid || !ipValid}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Examples</CardTitle>
              <CardDescription>How to use these components in your code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">MAC Address Input</h4>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
{`import { MacAddressInput } from '@/components/ui/mac-address-input';

<MacAddressInput
  value={macAddress}
  onChange={setMacAddress}
  onValidChange={(value, isValid) => {
    console.log('MAC:', value, 'Valid:', isValid);
  }}
  separator=":"  // or "-"
  placeholder="AA:BB:CC:DD:EE:FF"
/>

// Features:
// ✅ Auto-formats as you type
// ✅ Validates format (6 pairs of hex digits)
// ✅ Shows visual validation feedback
// ✅ Supports : or - separators
// ✅ Paste support with auto-formatting
// ✅ Only accepts hex characters (0-9, A-F)`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">IP Address Input</h4>
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
{`import { IpAddressInput } from '@/components/ui/ip-address-input';

<IpAddressInput
  value={ipAddress}
  onChange={setIpAddress}
  onValidChange={(value, isValid) => {
    console.log('IP:', value, 'Valid:', isValid);
  }}
  placeholder="192.168.1.1"
  allowIncomplete={true}  // Allow partial IPs while typing
/>

// Features:
// ✅ Auto-adds dots after each octet
// ✅ Validates format (4 octets, 0-255 each)
// ✅ Shows visual validation feedback
// ✅ Auto-limits each octet to 255
// ✅ Paste support with auto-formatting
// ✅ Only accepts numeric input`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* MAC Address Features */}
            <Card>
              <CardHeader>
                <CardTitle>MAC Address Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Auto-formatting:</strong> Adds separators as you type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Hex validation:</strong> Only accepts 0-9, A-F</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Separator choice:</strong> Colon (:) or hyphen (-)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Visual feedback:</strong> Green checkmark when valid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Paste support:</strong> Auto-formats pasted MACs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Uppercase:</strong> Automatically converts to uppercase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Max length:</strong> Limited to 6 pairs (12 hex digits)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* IP Address Features */}
            <Card>
              <CardHeader>
                <CardTitle>IP Address Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Auto-dots:</strong> Adds dots after each octet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Range validation:</strong> Limits each octet to 0-255</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Smart input:</strong> Auto-moves to next octet at 255</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Visual feedback:</strong> Green checkmark when complete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Paste support:</strong> Auto-formats pasted IPs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Numeric only:</strong> Only accepts numbers and dots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>4 octets:</strong> Validates complete IPv4 format</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Try It Section */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Try Pasting These</CardTitle>
              <CardDescription>
                Copy and paste these values to see auto-formatting in action
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">MAC Addresses (any format)</Label>
                <div className="grid gap-2 mt-2">
                  <code className="p-2 bg-muted rounded text-sm">AABBCCDDEEFF</code>
                  <code className="p-2 bg-muted rounded text-sm">aa:bb:cc:dd:ee:ff</code>
                  <code className="p-2 bg-muted rounded text-sm">AA-BB-CC-DD-EE-FF</code>
                  <code className="p-2 bg-muted rounded text-sm">a1b2c3d4e5f6</code>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IP Addresses (any format)</Label>
                <div className="grid gap-2 mt-2">
                  <code className="p-2 bg-muted rounded text-sm">192168001001</code>
                  <code className="p-2 bg-muted rounded text-sm">192.168.1.1</code>
                  <code className="p-2 bg-muted rounded text-sm">10.0.0.100</code>
                  <code className="p-2 bg-muted rounded text-sm">172.16.3.254</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  colorTokens,
  colors,
  getColorWithOpacity,
  getContrastColor,
} from '@/design-system/tokens/colors';
import {
  spacing,
  spacingTokens,
  borderRadius,
  shadows,
  zIndex,
  getSpacing,
} from '@/design-system/tokens/spacing';
import {
  typography,
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
} from '@/design-system/tokens/typography';
import { Palette, Type, Ruler, Package, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Design System showcase and documentation
 */
export default function DesignSystemExample() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(label);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          Design System
        </h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive design tokens for consistent UI development
        </p>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography">
            <Type className="h-4 w-4 mr-2" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="spacing">
            <Ruler className="h-4 w-4 mr-2" />
            Spacing
          </TabsTrigger>
          <TabsTrigger value="components">
            <Package className="h-4 w-4 mr-2" />
            Components
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          {/* Primary Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
              <CardDescription>Brand identity color palette</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-2">
                {Object.entries(colorTokens.primary).map(([shade, color]) => (
                  <button
                    key={shade}
                    onClick={() => copyToClipboard(color, `primary-${shade}`)}
                    className="group relative aspect-square rounded-lg border-2 border-transparent hover:border-primary transition-all"
                    style={{ backgroundColor: color }}
                    title={`${color} (Click to copy)`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {copiedToken === `primary-${shade}` ? (
                        <Check className="h-5 w-5 text-white drop-shadow-lg" />
                      ) : (
                        <Copy className="h-4 w-4 text-white drop-shadow-lg" />
                      )}
                    </div>
                    <div className="absolute bottom-1 left-0 right-0 text-center text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        className="px-1 rounded text-white drop-shadow-md"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      >
                        {shade}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Semantic Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Semantic Colors</CardTitle>
              <CardDescription>Status and feedback colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(['success', 'warning', 'danger', 'info'] as const).map((semantic) => (
                  <div key={semantic}>
                    <Label className="text-sm font-semibold mb-2 capitalize">
                      {semantic}
                    </Label>
                    <div className="grid grid-cols-10 gap-2">
                      {Object.entries(colorTokens[semantic]).map(([shade, color]) => (
                        <button
                          key={shade}
                          onClick={() =>
                            copyToClipboard(color, `${semantic}-${shade}`)
                          }
                          className="group relative aspect-square rounded-lg border-2 border-transparent hover:border-foreground transition-all"
                          style={{ backgroundColor: color }}
                          title={`${color} (Click to copy)`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            {copiedToken === `${semantic}-${shade}` ? (
                              <Check className="h-4 w-4 text-white drop-shadow-lg" />
                            ) : (
                              <Copy className="h-3 w-3 text-white drop-shadow-lg" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Neutral Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Neutral Colors</CardTitle>
              <CardDescription>Text, backgrounds, and borders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-11 gap-2">
                {Object.entries(colorTokens.neutral).map(([shade, color]) => (
                  <button
                    key={shade}
                    onClick={() => copyToClipboard(color, `neutral-${shade}`)}
                    className="group relative aspect-square rounded-lg border hover:border-foreground transition-all"
                    style={{ backgroundColor: color }}
                    title={`${color} (Click to copy)`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      {copiedToken === `neutral-${shade}` ? (
                        <Check
                          className="h-4 w-4 drop-shadow-lg"
                          style={{
                            color: getContrastColor(color),
                          }}
                        />
                      ) : (
                        <Copy
                          className="h-3 w-3 drop-shadow-lg"
                          style={{
                            color: getContrastColor(color),
                          }}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Utilities */}
          <Card>
            <CardHeader>
              <CardTitle>Color Utilities</CardTitle>
              <CardDescription>Helper functions for color manipulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2">Opacity Variants</Label>
                  <div className="flex gap-2">
                    {[1, 0.8, 0.6, 0.4, 0.2].map((opacity) => (
                      <div
                        key={opacity}
                        className="flex-1 h-20 rounded-lg border flex items-center justify-center text-white font-semibold"
                        style={{
                          backgroundColor: getColorWithOpacity(
                            colorTokens.primary[400],
                            opacity
                          ),
                        }}
                      >
                        {opacity * 100}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          {/* Font Families */}
          <Card>
            <CardHeader>
              <CardTitle>Font Families</CardTitle>
              <CardDescription>System font stacks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2">Sans Serif</Label>
                  <p style={{ fontFamily: fontFamily.sans }} className="text-lg">
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <code className="text-xs text-muted-foreground">
                    {fontFamily.sans.split(',')[0]}
                  </code>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-2">Serif</Label>
                  <p style={{ fontFamily: fontFamily.serif }} className="text-lg">
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <code className="text-xs text-muted-foreground">
                    {fontFamily.serif.split(',')[0]}
                  </code>
                </div>
                <div>
                  <Label className="text-sm font-semibold mb-2">Monospace</Label>
                  <p style={{ fontFamily: fontFamily.mono }} className="text-lg">
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <code className="text-xs text-muted-foreground">
                    {fontFamily.mono.split(',')[0]}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Font Sizes */}
          <Card>
            <CardHeader>
              <CardTitle>Font Sizes</CardTitle>
              <CardDescription>Type scale from xs to 9xl</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(fontSize).map(([size, values]) => (
                  <div
                    key={size}
                    className="flex items-baseline gap-4 border-b pb-2"
                  >
                    <Badge variant="outline" className="font-mono text-xs w-16">
                      {size}
                    </Badge>
                    <span
                      style={{ fontSize: values.rem }}
                      className="font-semibold flex-1"
                    >
                      The quick brown fox
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {values.rem} / {values.px}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Typography Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Typography Presets</CardTitle>
              <CardDescription>Pre-configured text styles</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {/* Display */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Display</Label>
                    <div className="space-y-3">
                      <div style={typography.displayLarge}>Display Large</div>
                      <div style={typography.displayMedium}>Display Medium</div>
                      <div style={typography.displaySmall}>Display Small</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Headings */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Headings</Label>
                    <div className="space-y-2">
                      <h1 style={typography.h1}>Heading 1</h1>
                      <h2 style={typography.h2}>Heading 2</h2>
                      <h3 style={typography.h3}>Heading 3</h3>
                      <h4 style={typography.h4}>Heading 4</h4>
                      <h5 style={typography.h5}>Heading 5</h5>
                      <h6 style={typography.h6}>Heading 6</h6>
                    </div>
                  </div>

                  <Separator />

                  {/* Body */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Body Text</Label>
                    <div className="space-y-2">
                      <p style={typography.bodyLarge}>
                        Body Large - The quick brown fox jumps over the lazy dog
                      </p>
                      <p style={typography.body}>
                        Body - The quick brown fox jumps over the lazy dog
                      </p>
                      <p style={typography.bodySmall}>
                        Body Small - The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Special */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Special</Label>
                    <div className="space-y-2">
                      <div style={typography.overline}>Overline Text</div>
                      <div style={typography.caption}>Caption Text</div>
                      <code style={typography.code}>Code Inline</code>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-6">
          {/* Spacing Scale */}
          <Card>
            <CardHeader>
              <CardTitle>Spacing Scale</CardTitle>
              <CardDescription>Base-4 spacing system (multiples of 4px)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(spacingTokens)
                  .slice(0, 20)
                  .map(([token, value]) => (
                    <div key={token} className="flex items-center gap-4">
                      <Badge variant="outline" className="font-mono w-12">
                        {token}
                      </Badge>
                      <div
                        className="h-6 bg-primary rounded"
                        style={{ width: value }}
                      />
                      <span className="text-sm text-muted-foreground font-mono">
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Border Radius */}
          <Card>
            <CardHeader>
              <CardTitle>Border Radius</CardTitle>
              <CardDescription>Rounding scale for components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(borderRadius).map(([name, value]) => (
                  <div key={name} className="text-center space-y-2">
                    <div
                      className="w-full h-20 bg-primary"
                      style={{ borderRadius: value }}
                    />
                    <div className="text-sm font-semibold">{name}</div>
                    <code className="text-xs text-muted-foreground">{value}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shadows */}
          <Card>
            <CardHeader>
              <CardTitle>Shadows</CardTitle>
              <CardDescription>Elevation and depth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(shadows)
                  .filter(([name]) => name !== 'none' && name !== 'inner')
                  .map(([name, value]) => (
                    <div key={name} className="text-center space-y-3">
                      <div
                        className="w-full h-24 bg-background border rounded-lg flex items-center justify-center"
                        style={{ boxShadow: value }}
                      >
                        <span className="font-semibold">{name}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Z-Index */}
          <Card>
            <CardHeader>
              <CardTitle>Z-Index Scale</CardTitle>
              <CardDescription>Layering and stacking order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(zIndex).map(([name, value]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-semibold capitalize">{name}</span>
                    <Badge variant="outline" className="font-mono">
                      {value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Examples</CardTitle>
              <CardDescription>
                Components built with design system tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Buttons */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Buttons</Label>
                  <div className="flex flex-wrap gap-3">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                </div>

                {/* Inputs */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Inputs</Label>
                  <div className="space-y-3 max-w-sm">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Enter your name" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="email@example.com" />
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Badges</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>

                {/* Cards */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Cards</Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Card Title</CardTitle>
                        <CardDescription>Card description text</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">
                          This is an example card built with design system tokens.
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Another Card</CardTitle>
                        <CardDescription>With different content</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">
                          Consistent spacing and typography throughout.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Guide</CardTitle>
              <CardDescription>How to use the design system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Import Tokens</h4>
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                    <code>{`import { colors, spacing, typography } from '@/design-system';`}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Use in Components</h4>
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                    <code>{`<div style={{
  color: colors.primary,
  padding: spacing.md,
  ...typography.h1
}}>
  Styled with design tokens
</div>`}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">With Tailwind</h4>
                  <p className="text-muted-foreground mb-2">
                    Tokens are already integrated with Tailwind CSS configuration
                  </p>
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                    <code>{`<div className="text-primary p-4 rounded-lg shadow-md">
  Using Tailwind utilities
</div>`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Design System Features</CardTitle>
          <CardDescription>Comprehensive token library</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colors
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 10-shade primary palette</li>
                <li>• 4 semantic color scales</li>
                <li>• 11-shade neutral palette</li>
                <li>• Dark theme colors</li>
                <li>• Utility functions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Type className="h-4 w-4" />
                Typography
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 3 font families</li>
                <li>• 13 font sizes (xs-9xl)</li>
                <li>• 9 font weights</li>
                <li>• 15+ typography presets</li>
                <li>• Line height & letter spacing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Spacing & Layout
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Base-4 spacing scale</li>
                <li>• 9 border radius sizes</li>
                <li>• 7 shadow elevations</li>
                <li>• Z-index scale</li>
                <li>• Duration & easing curves</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

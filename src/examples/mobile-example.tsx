import React, { useState } from 'react';
import { MobileNav } from '@/components/mobile/MobileNav';
import { BottomNav, BottomNavWithFab } from '@/components/mobile/BottomNav';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSwipeGesture, useSwipeNavigation } from '@/hooks/useSwipeGesture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home,
  LayoutDashboard,
  Zap,
  Bell,
  Settings,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Monitor,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile experience example
 */
export default function MobileExample() {
  const [activeTab, setActiveTab] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [items, setItems] = useState([
    { id: 1, title: 'Device 1', status: 'online' },
    { id: 2, title: 'Device 2', status: 'offline' },
    { id: 3, title: 'Device 3', status: 'online' },
    { id: 4, title: 'Device 4', status: 'online' },
    { id: 5, title: 'Device 5', status: 'error' },
  ]);

  // Pull to refresh
  const {
    containerRef,
    handlers: pullHandlers,
    pullState,
    pullDistance,
    progress,
    isRefreshing,
  } = usePullToRefresh({
    onRefresh: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setRefreshCount((prev) => prev + 1);
    },
  });

  // Swipe navigation for tabs
  const { touchHandlers: swipeHandlers } = useSwipeNavigation(
    () => {
      // Swipe left - next tab
      if (activeTab < 2) {
        setActiveTab((prev) => prev + 1);
      }
    },
    () => {
      // Swipe right - previous tab
      if (activeTab > 0) {
        setActiveTab((prev) => prev - 1);
      }
    },
    {
      threshold: 80,
    }
  );

  // Bottom nav items
  const bottomNavItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Devices', href: '/devices', icon: Zap, badge: 3 },
    { label: 'Notifications', href: '/notifications', icon: Bell, badge: 5 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation */}
      <MobileNav
        logo={
          <>
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">AutoVolt</span>
          </>
        }
        actions={
          <Button variant="ghost" size="icon" className="h-11 w-11">
            <Bell className="h-5 w-5" />
          </Button>
        }
      />

      {/* Content with top padding for fixed nav */}
      <div className="pt-16 pb-20">
        {/* Header */}
        <div className="p-4 space-y-2">
          <h1 className="text-3xl font-bold">Mobile Experience</h1>
          <p className="text-muted-foreground">
            Optimized for touch devices with swipe gestures and pull-to-refresh
          </p>
        </div>

        {/* Feature Cards */}
        <div className="p-4 space-y-4">
          {/* Pull to Refresh Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDown className="h-5 w-5" />
                Pull to Refresh
              </CardTitle>
              <CardDescription>
                Pull down on the list below to refresh (mobile or mouse drag)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pull indicator */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Pull Status:</span>
                  <Badge
                    variant={
                      pullState === 'refreshing'
                        ? 'default'
                        : pullState === 'ready'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {pullState}
                  </Badge>
                </div>

                {/* Progress bar */}
                {pullDistance > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Refreshable list */}
                <div
                  ref={containerRef}
                  {...pullHandlers}
                  className="border rounded-lg overflow-hidden"
                  style={{ maxHeight: '300px', overflowY: 'auto' }}
                >
                  {/* Pull indicator at top */}
                  {pullDistance > 0 && (
                    <div
                      className="flex items-center justify-center bg-primary/10 transition-all"
                      style={{ height: `${pullDistance}px` }}
                    >
                      <RefreshCw
                        className={cn(
                          'h-5 w-5 text-primary transition-transform',
                          isRefreshing && 'animate-spin',
                          pullState === 'ready' && !isRefreshing && 'rotate-180'
                        )}
                      />
                    </div>
                  )}

                  {/* List items */}
                  <div className="divide-y">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 flex items-center justify-between hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">
                            Refreshed: {refreshCount} times
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.status === 'online'
                              ? 'default'
                              : item.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swipe Navigation Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                Swipe Navigation
                <ChevronRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                Swipe left/right on the tabs below to navigate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Tab indicators */}
                <div className="flex items-center justify-center gap-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        activeTab === index
                          ? 'w-8 bg-primary'
                          : 'w-2 bg-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>

                {/* Swipeable content */}
                <div
                  {...swipeHandlers}
                  className="border rounded-lg p-6 min-h-[200px] flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent"
                >
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-bold text-primary">
                      Tab {activeTab + 1}
                    </div>
                    <div className="text-muted-foreground">
                      Swipe to navigate between tabs
                    </div>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab((prev) => Math.max(0, prev - 1))}
                    disabled={activeTab === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab((prev) => Math.min(2, prev + 1))}
                    disabled={activeTab === 2}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Features Info */}
          <Card>
            <CardHeader>
              <CardTitle>Mobile Features</CardTitle>
              <CardDescription>
                Touch-optimized features for mobile devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Touch Targets
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Minimum 44x44px tap targets</li>
                    <li>• Large, easy-to-tap buttons</li>
                    <li>• Adequate spacing between elements</li>
                    <li>• Touch feedback on interactions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ArrowDown className="h-4 w-4" />
                    Gestures
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Swipe left/right for navigation</li>
                    <li>• Pull down to refresh</li>
                    <li>• Configurable thresholds</li>
                    <li>• Haptic feedback (mobile)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Responsive Design
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>• Mobile-first approach</li>
                    <li>• Adaptive layouts (375px - 1920px)</li>
                    <li>• Bottom navigation for easy reach</li>
                    <li>• Slide-in menu with large targets</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavWithFab
        items={bottomNavItems}
        fab={{
          icon: Plus,
          label: 'Add Device',
          onClick: () => {
            alert('Add device clicked!');
          },
        }}
      />
    </div>
  );
}

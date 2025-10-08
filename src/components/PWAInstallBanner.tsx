/**
 * PWA Install Banner
 * Shows a banner prompting users to install the app
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallBanner() {
  const { canInstall, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    await install();
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal in localStorage
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if was dismissed recently (within 7 days)
  React.useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) {
        setDismissed(true);
      }
    }
  }, []);

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-1">Install AutoVolt</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Install our app for a better experience and offline access
            </p>
            
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" className="flex-1">
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Offline Indicator
 * Shows when the app is offline
 */
export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm font-medium z-50">
      You are currently offline. Some features may be limited.
    </div>
  );
}

/**
 * PWA Status Indicator
 * Shows PWA status in the UI
 */
export function PWAStatusIndicator() {
  const { isInstalled, isServiceWorkerRegistered, isOnline } = usePWA();

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isInstalled && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Installed</span>
        </div>
      )}
      
      {isServiceWorkerRegistered && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span>Offline Ready</span>
        </div>
      )}
      
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  );
}

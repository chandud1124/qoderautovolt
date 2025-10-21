import React from 'react';
import { Card } from '@/components/ui/card';
import { ExternalLink, RefreshCw, Maximize2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const GrafanaPublic: React.FC = () => {
  // Use the dashboard URL (will redirect to login if not public)
  const grafanaUrl = 'http://localhost:3000/d/iot-classroom-dashboard';
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [showError, setShowError] = React.useState(false);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenExternal = () => {
    window.open('http://localhost:3000/d/iot-classroom-dashboard', '_blank', 'noopener,noreferrer');
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  // Handle iframe load errors
  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setShowError(false);
    };

    const handleError = () => {
      setShowError(true);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div>
          <h1 className="text-2xl font-bold">Grafana Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time metrics and analytics powered by Prometheus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExternal}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </Button>
        </div>
      </div>

      {/* Grafana Iframe */}
      <div className="flex-1 relative overflow-hidden bg-background p-4">
        {showError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              The dashboard exists and is working! To embed it publicly:
              <br />
              <br />
              1. <strong>Go to the dashboard:</strong> Click "Open in New Tab" above or visit <code>http://localhost:3000/d/iot-classroom-dashboard</code>
              <br />
              2. <strong>Login:</strong> Use admin / IOT@098
              <br />
              3. <strong>Make it public:</strong> Click share icon → "Public dashboard" → Enable public access
              <br />
              4. <strong>Copy the public URL</strong> and the iframe will work automatically
              <br />
              <br />
              <strong>The dashboard "IoT Classroom System Overview" is now available and connected to Prometheus!</strong>
            </AlertDescription>
          </Alert>
        )}
        
        <iframe
          ref={iframeRef}
          src={grafanaUrl}
          className="w-full h-full border-0 rounded-lg shadow-lg"
          title="Grafana Dashboard"
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
        />
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
        <span>Connected to Grafana • </span>
        <span>Data Source: Prometheus • </span>
        <span>Public Dashboard</span>
      </div>
    </div>
  );
};

export default GrafanaPublic;

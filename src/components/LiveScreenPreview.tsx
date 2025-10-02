import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Monitor, Play, Pause, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import mqttService from '@/services/mqtt';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Board {
  _id: string;
  name: string;
  location: string;
  type: string;
  status: string;
  isOnline: boolean;
  lastScreenCapture?: Date;
}

interface ScreenCapture {
  image: string;
  timestamp: string;
  format: string;
}

const LiveScreenPreview: React.FC = () => {
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [screenCapture, setScreenCapture] = useState<ScreenCapture | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available boards
  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards', {
        params: { type: 'raspberry_pi', status: 'active' }
      });
      if (response.data.success) {
        setBoards(response.data.boards);
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    }
  };

  // Fetch screen capture for selected board
  const fetchScreenCapture = async (boardId: string) => {
    if (!boardId) return;

    try {
      setLoading(true);
      const response = await api.get(`/boards/${boardId}/screen-capture`);
      if (response.data.success && response.data.screenCapture) {
        setScreenCapture(response.data.screenCapture);
        setLastUpdate(new Date(response.data.lastUpdate));
      } else {
        setScreenCapture(null);
        setLastUpdate(null);
      }
    } catch (error) {
      console.error('Failed to fetch screen capture:', error);
      setScreenCapture(null);
      setLastUpdate(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle board selection
  const handleBoardSelect = (boardId: string) => {
    setSelectedBoard(boardId);
    if (boardId) {
      fetchScreenCapture(boardId);
    } else {
      setScreenCapture(null);
      setLastUpdate(null);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    if (selectedBoard) {
      fetchScreenCapture(selectedBoard);
    }
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Set up polling for real-time updates (since MQTT doesn't work in browser)
  useEffect(() => {
    if (autoRefresh && selectedBoard) {
      intervalRef.current = setInterval(() => {
        fetchScreenCapture(selectedBoard);
      }, 1000); // Poll every 1 second for smoother updates
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedBoard]);

  // Initial load
  useEffect(() => {
    fetchBoards();
  }, []);

  const selectedBoardData = boards.find(board => board._id === selectedBoard);
  const isBoardOnline = selectedBoardData?.isOnline && selectedBoardData?.status === 'active';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Live Screen Preview</h2>
          <p className="text-muted-foreground">
            View real-time content displayed on Raspberry Pi monitors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={!selectedBoard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Board Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            Select Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="board-select">Raspberry Pi Device</Label>
              <Select value={selectedBoard} onValueChange={handleBoardSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a device..." />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board._id} value={board._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{board.name} - {board.location}</span>
                        <Badge
                          variant={board.isOnline && board.status === 'active' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {board.isOnline && board.status === 'active' ? 'Online' : 'Offline'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBoardData && (
            <div className="mt-4 flex gap-2">
              <Badge variant={isBoardOnline ? 'default' : 'destructive'}>
                {isBoardOnline ? 'Online' : 'Offline'}
              </Badge>
              <Badge variant="outline">
                {selectedBoardData.type}
              </Badge>
              <Badge variant="outline">
                {selectedBoardData.location}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screen Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time screen capture updates every second • Videos appear as image snapshots
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedBoard ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a Raspberry Pi device to view live content</p>
              </div>
            </div>
          ) : !isBoardOnline ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The selected device is currently offline. Screen preview is not available.
              </AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading screen capture...</span>
            </div>
          ) : screenCapture ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-black">
                <img
                  src={`data:image/${screenCapture.format};base64,${screenCapture.image}`}
                  alt="Live screen preview"
                  className="w-full h-auto max-h-96 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Format: {screenCapture.format.toUpperCase()}</span>
                <span>Captured: {new Date(screenCapture.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No screen capture available</p>
                <p className="text-sm">The device may not be streaming content yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveScreenPreview;
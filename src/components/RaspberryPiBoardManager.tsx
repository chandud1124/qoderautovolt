import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cpu, Monitor, Settings, Eye, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface RaspberryPiBoard {
  _id: string;
  name: string;
  description: string;
  location: string;
  type: 'raspberry_pi';
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  macAddress: string;
  ipAddress: string;
  displaySettings: {
    resolution: string;
    orientation: 'landscape' | 'portrait';
    brightness: number;
  };
  schedule: {
    operatingHours: {
      start: string;
      end: string;
    };
  };
  screenCapture?: {
    enabled: boolean;
    interval: number; // seconds
    lastCapture?: Date;
  };
  lastSeen?: Date;
  groupId?: {
    _id: string;
    name: string;
  };
}

const RaspberryPiBoardManager: React.FC = () => {
  const [boards, setBoards] = useState<RaspberryPiBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<RaspberryPiBoard | null>(null);
  const [livePreviewBoard, setLivePreviewBoard] = useState<RaspberryPiBoard | null>(null);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    macAddress: '',
    ipAddress: '',
    displaySettings: {
      resolution: '1920x1080',
      orientation: 'landscape' as 'landscape' | 'portrait',
      brightness: 80
    },
    schedule: {
      operatingHours: {
        start: '08:00',
        end: '18:00'
      }
    },
    screenCapture: {
      enabled: true,
      interval: 30
    },
    groupId: ''
  });

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/boards', {
        params: { type: 'raspberry_pi' }
      });
      setBoards(response.data.boards || []);
    } catch (error) {
      console.error('Error fetching Raspberry Pi boards:', error);
      toast.error('Failed to fetch Raspberry Pi boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!formData.name.trim() || !formData.location.trim() || !formData.macAddress.trim()) {
      toast.error('Name, location, and MAC address are required');
      return;
    }

    try {
      await api.post('/boards', {
        ...formData,
        type: 'raspberry_pi',
        status: 'active'
      });
      toast.success('Raspberry Pi board created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchBoards();
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create Raspberry Pi board');
    }
  };

  const handleUpdateBoard = async () => {
    if (!selectedBoard || !formData.name.trim() || !formData.location.trim()) {
      toast.error('Name and location are required');
      return;
    }

    try {
      await api.patch(`/boards/${selectedBoard._id}`, formData);
      toast.success('Raspberry Pi board updated successfully');
      setIsEditDialogOpen(false);
      setSelectedBoard(null);
      resetForm();
      fetchBoards();
    } catch (error) {
      console.error('Error updating board:', error);
      toast.error('Failed to update Raspberry Pi board');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this Raspberry Pi board?')) {
      return;
    }

    try {
      await api.delete(`/boards/${boardId}`);
      toast.success('Raspberry Pi board deleted successfully');
      fetchBoards();
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete Raspberry Pi board');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      macAddress: '',
      ipAddress: '',
      displaySettings: {
        resolution: '1920x1080',
        orientation: 'landscape',
        brightness: 80
      },
      schedule: {
        operatingHours: {
          start: '08:00',
          end: '18:00'
        }
      },
      screenCapture: {
        enabled: true,
        interval: 30
      },
      groupId: ''
    });
  };

  const openEditDialog = (board: RaspberryPiBoard) => {
    setSelectedBoard(board);
    setFormData({
      name: board.name || '',
      description: board.description || '',
      location: board.location || '',
      macAddress: board.macAddress || '',
      ipAddress: board.ipAddress || '',
      displaySettings: {
        resolution: board.displaySettings?.resolution || '1920x1080',
        orientation: board.displaySettings?.orientation || 'landscape',
        brightness: board.displaySettings?.brightness ?? 80
      },
      schedule: {
        operatingHours: {
          start: board.schedule?.operatingHours?.start || '08:00',
          end: board.schedule?.operatingHours?.end || '18:00'
        }
      },
      screenCapture: {
        enabled: board.screenCapture?.enabled ?? true,
        interval: board.screenCapture?.interval ?? 30
      },
      groupId: board.groupId?._id || ''
    });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'offline': return <XCircle className="h-4 w-4" />;
      case 'maintenance': return <AlertTriangle className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Raspberry Pi Board Management</h2>
          <p className="text-muted-foreground">
            Manage Raspberry Pi display devices, configure screen capture, and monitor live content
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Cpu className="h-4 w-4 mr-2" />
              Add Raspberry Pi Board
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Raspberry Pi Board</DialogTitle>
              <DialogDescription>
                Configure a new Raspberry Pi display device with network settings and display preferences.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Board name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Room/Floor"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>MAC Address *</Label>
                  <Input
                    value={formData.macAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, macAddress: e.target.value }))}
                    placeholder="AA:BB:CC:DD:EE:FF"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input
                    value={formData.ipAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                    placeholder="192.168.1.100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Select
                    value={formData.displaySettings.resolution}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      displaySettings: { ...prev.displaySettings, resolution: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080 (FHD)</SelectItem>
                      <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                      <SelectItem value="1024x768">1024x768</SelectItem>
                      <SelectItem value="800x600">800x600</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={formData.displaySettings.orientation}
                    onValueChange={(value: 'landscape' | 'portrait') => setFormData(prev => ({
                      ...prev,
                      displaySettings: { ...prev.displaySettings, orientation: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Brightness</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.displaySettings.brightness}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      displaySettings: {
                        ...prev.displaySettings,
                        brightness: parseInt(e.target.value) || 80
                      }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operating Hours Start</Label>
                  <Input
                    type="time"
                    value={formData.schedule.operatingHours.start}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        operatingHours: { ...prev.schedule.operatingHours, start: e.target.value }
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Operating Hours End</Label>
                  <Input
                    type="time"
                    value={formData.schedule.operatingHours.end}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        operatingHours: { ...prev.schedule.operatingHours, end: e.target.value }
                      }
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="screenCapture"
                  checked={formData.screenCapture.enabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    screenCapture: { ...prev.screenCapture, enabled: e.target.checked }
                  }))}
                />
                <Label htmlFor="screenCapture">Enable automatic screen capture</Label>
              </div>

              {formData.screenCapture.enabled && (
                <div className="space-y-2">
                  <Label>Capture Interval (seconds)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="300"
                    value={formData.screenCapture.interval}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      screenCapture: { ...prev.screenCapture, interval: parseInt(e.target.value) || 30 }
                    }))}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBoard}>
                  Create Board
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Boards List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>Loading Raspberry Pi boards...</p>
              </div>
            </CardContent>
          </Card>
        ) : boards.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-muted-foreground">
                <Cpu className="h-8 w-8 mx-auto mb-2" />
                <p>No Raspberry Pi boards configured</p>
                <p className="text-sm">Add your first Raspberry Pi display device above</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          boards.map((board) => (
            <Card key={board._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cpu className="h-5 w-5" />
                      {board.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(board.status)}>
                        {getStatusIcon(board.status)}
                        <span className="ml-1 capitalize">{board.status}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">{board.location}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(board)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBoard(board._id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Network</p>
                    <p>MAC: {board.macAddress}</p>
                    {board.ipAddress && <p>IP: {board.ipAddress}</p>}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Display</p>
                    <p>{board.displaySettings.resolution} • {board.displaySettings.orientation}</p>
                    <p>Brightness: {board.displaySettings.brightness}%</p>
                  </div>
                </div>
                {board.screenCapture?.enabled && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Monitor className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-800">
                        Screen capture enabled ({board.screenCapture.interval}s interval)
                      </span>
                      {board.screenCapture.lastCapture && (
                        <span className="text-blue-600">
                          • Last: {new Date(board.screenCapture.lastCapture).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Raspberry Pi Board</DialogTitle>
            <DialogDescription>
              Update the configuration and settings for this Raspberry Pi display device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Board name"
                />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Room/Floor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MAC Address</Label>
                <Input
                  value={formData.macAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, macAddress: e.target.value }))}
                  placeholder="AA:BB:CC:DD:EE:FF"
                />
              </div>
              <div className="space-y-2">
                <Label>IP Address</Label>
                <Input
                  value={formData.ipAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={formData.displaySettings.resolution}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    displaySettings: { ...prev.displaySettings, resolution: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1920x1080">1920x1080 (FHD)</SelectItem>
                    <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                    <SelectItem value="1024x768">1024x768</SelectItem>
                    <SelectItem value="800x600">800x600</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select
                  value={formData.displaySettings.orientation}
                  onValueChange={(value: 'landscape' | 'portrait') => setFormData(prev => ({
                    ...prev,
                    displaySettings: { ...prev.displaySettings, orientation: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brightness</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.displaySettings.brightness}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    displaySettings: {
                      ...prev.displaySettings,
                      brightness: parseInt(e.target.value) || 80
                    }
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Operating Hours Start</Label>
                <Input
                  type="time"
                  value={formData.schedule.operatingHours.start}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      operatingHours: { ...prev.schedule.operatingHours, start: e.target.value }
                    }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Operating Hours End</Label>
                <Input
                  type="time"
                  value={formData.schedule.operatingHours.end}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      operatingHours: { ...prev.schedule.operatingHours, end: e.target.value }
                    }
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editScreenCapture"
                checked={formData.screenCapture.enabled}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  screenCapture: { ...prev.screenCapture, enabled: e.target.checked }
                }))}
              />
              <Label htmlFor="editScreenCapture">Enable automatic screen capture</Label>
            </div>

            {formData.screenCapture.enabled && (
              <div className="space-y-2">
                <Label>Capture Interval (seconds)</Label>
                <Input
                  type="number"
                  min="10"
                  max="300"
                  value={formData.screenCapture.interval}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    screenCapture: { ...prev.screenCapture, interval: parseInt(e.target.value) || 30 }
                  }))}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBoard}>
                Update Board
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RaspberryPiBoardManager;
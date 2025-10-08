import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useFocusTrap } from '@/hooks/useKeyboardNavigation';
import { announceToScreenReader } from '@/lib/accessibility';
import { Plus, Search, Filter, X } from 'lucide-react';

/**
 * Accessible Device List Example
 * Demonstrates proper accessibility implementation with:
 * - ARIA labels and roles
 * - Keyboard navigation
 * - Focus management
 * - Screen reader announcements
 * - Semantic HTML
 */

interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline';
  type: string;
}

const mockDevices: Device[] = [
  { id: '1', name: 'Living Room Light', status: 'online', type: 'Light' },
  { id: '2', name: 'Bedroom Fan', status: 'online', type: 'Fan' },
  { id: '3', name: 'Kitchen Outlet', status: 'offline', type: 'Outlet' },
  { id: '4', name: 'Garage Door', status: 'online', type: 'Door' },
];

export function AccessibleDeviceList() {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useFocusTrap(isModalOpen);

  // Filter devices based on search and filter
  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle device selection
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevice(deviceId);
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      announceToScreenReader(`Selected ${device.name}, status ${device.status}`, 'polite');
    }
  };

  // Handle device deletion
  const handleDeleteDevice = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    setDevices(devices.filter((d) => d.id !== deviceId));
    if (device) {
      announceToScreenReader(`Deleted ${device.name}`, 'assertive');
    }
    if (selectedDevice === deviceId) {
      setSelectedDevice(null);
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const count = filteredDevices.length;
    announceToScreenReader(`${count} device${count !== 1 ? 's' : ''} found`, 'polite');
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    const count = filteredDevices.length;
    announceToScreenReader(
      `Filtered by ${value === 'all' ? 'all statuses' : value}, ${count} device${count !== 1 ? 's' : ''} shown`,
      'polite'
    );
  };

  // Handle modal open
  const handleOpenModal = () => {
    setIsModalOpen(true);
    announceToScreenReader('Add device dialog opened', 'assertive');
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    announceToScreenReader('Add device dialog closed', 'assertive');
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <CardTitle>Accessible Device Management</CardTitle>
          <CardDescription>
            Example implementation with full accessibility support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <Label htmlFor="device-search" className="sr-only">
                Search devices
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="device-search"
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Search devices by name"
                  aria-describedby="search-help"
                />
              </div>
              <p id="search-help" className="sr-only">
                Type to search devices by name. Results update as you type.
              </p>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <Label htmlFor="status-filter" className="sr-only">
                Filter by status
              </Label>
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger id="status-filter" aria-label="Filter devices by status">
                  <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  <SelectItem value="online">Online Only</SelectItem>
                  <SelectItem value="offline">Offline Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add Device Button */}
            <Button
              onClick={handleOpenModal}
              aria-label="Add new device"
              aria-haspopup="dialog"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Device
            </Button>
          </div>

          {/* Results Count */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-muted-foreground"
          >
            Showing {filteredDevices.length} of {devices.length} devices
            {searchQuery && ` matching "${searchQuery}"`}
            {statusFilter !== 'all' && ` (${statusFilter})`}
          </div>

          {/* Device List */}
          <div
            role="list"
            aria-label="Device list"
            className="space-y-2"
          >
            {filteredDevices.length === 0 ? (
              <div
                role="status"
                className="text-center py-8 text-muted-foreground"
              >
                <p>No devices found</p>
                <p className="text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
              filteredDevices.map((device) => (
                <div
                  key={device.id}
                  role="listitem"
                  className={`
                    flex items-center justify-between p-4 rounded-lg border
                    transition-colors focus-within:ring-2 focus-within:ring-ring
                    ${selectedDevice === device.id ? 'bg-accent border-primary' : 'bg-card'}
                  `}
                  aria-label={`Device: ${device.name}`}
                >
                  <button
                    onClick={() => handleSelectDevice(device.id)}
                    className="flex-1 text-left focus:outline-none"
                    aria-pressed={selectedDevice === device.id}
                    aria-label={`Select ${device.name}, ${device.status}, ${device.type}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Indicator */}
                      <div
                        className={`
                          w-3 h-3 rounded-full
                          ${device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}
                        `}
                        role="img"
                        aria-label={device.status === 'online' ? 'Online' : 'Offline'}
                      />
                      
                      {/* Device Info */}
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {device.type} • {device.status}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDevice(device.id)}
                    aria-label={`Delete ${device.name}`}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Device Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCloseModal}
        >
          <Card
            ref={modalRef as React.RefObject<HTMLDivElement>}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="modal-title">Add New Device</CardTitle>
              <CardDescription id="modal-description">
                Enter the details for your new device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  placeholder="Enter device name"
                  aria-required="true"
                  aria-describedby="name-help"
                />
                <p id="name-help" className="text-xs text-muted-foreground mt-1">
                  Choose a descriptive name for your device
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  aria-label="Cancel adding device"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCloseModal}
                  aria-label="Save new device"
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

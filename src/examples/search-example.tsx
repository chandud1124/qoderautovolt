import React, { useState, useMemo } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { FilterBuilder, FilterField } from '@/components/search/FilterBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter as FilterIcon, Database, TrendingUp } from 'lucide-react';

/**
 * Mock device data
 */
interface Device {
  id: string;
  name: string;
  type: 'esp32' | 'arduino' | 'raspberry-pi';
  status: 'online' | 'offline' | 'error';
  location: string;
  power: number;
  temperature: number;
  lastSeen: string;
  switches: number;
}

/**
 * Generate mock devices
 */
const generateMockDevices = (): Device[] => {
  const types: Device['type'][] = ['esp32', 'arduino', 'raspberry-pi'];
  const statuses: Device['status'][] = ['online', 'offline', 'error'];
  const locations = ['Building A', 'Building B', 'Building C', 'Lab 1', 'Lab 2', 'Office'];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `device-${i + 1}`,
    name: `Device ${i + 1}`,
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    power: Math.round(Math.random() * 1000),
    temperature: Math.round((20 + Math.random() * 10) * 10) / 10,
    lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    switches: Math.floor(Math.random() * 6) + 1,
  }));
};

/**
 * Advanced search example
 */
export default function AdvancedSearchExample() {
  const [devices] = useState<Device[]>(generateMockDevices());

  // Define searchable fields
  const searchKeys = ['name', 'type', 'location', 'status'];

  // Define filter fields
  const filterFields: FilterField[] = [
    {
      key: 'type',
      label: 'Device Type',
      type: 'select',
      options: [
        { label: 'ESP32', value: 'esp32' },
        { label: 'Arduino', value: 'arduino' },
        { label: 'Raspberry Pi', value: 'raspberry-pi' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Online', value: 'online' },
        { label: 'Offline', value: 'offline' },
        { label: 'Error', value: 'error' },
      ],
    },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
    },
    {
      key: 'power',
      label: 'Power (W)',
      type: 'number',
    },
    {
      key: 'temperature',
      label: 'Temperature (°C)',
      type: 'number',
    },
    {
      key: 'switches',
      label: 'Switches',
      type: 'number',
    },
  ];

  // Use search hook
  const search = useSearch({
    data: devices,
    searchKeys,
    threshold: 0.3,
    enableFuzzy: true,
    storageKey: 'device-search',
  });

  // Generate suggestions based on current query
  const suggestions = useMemo(() => {
    if (!search.query) return [];

    const unique = new Set<string>();
    devices.forEach((device) => {
      searchKeys.forEach((key) => {
        const value = String(device[key as keyof Device]);
        if (value.toLowerCase().includes(search.query.toLowerCase())) {
          unique.add(value);
        }
      });
    });

    return Array.from(unique).slice(0, 10);
  }, [search.query, devices]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = devices.length;
    const filtered = search.results.length;
    const online = search.results.filter((d) => d.status === 'online').length;
    const offline = search.results.filter((d) => d.status === 'offline').length;
    const error = search.results.filter((d) => d.status === 'error').length;
    const avgPower =
      search.results.reduce((sum, d) => sum + d.power, 0) / (filtered || 1);

    return { total, filtered, online, offline, error, avgPower };
  }, [devices, search.results]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Search & Filtering</h1>
        <p className="text-muted-foreground">
          Powerful search with fuzzy matching, filters, and saved searches
        </p>
      </div>

      {/* Search */}
      <AdvancedSearch
        query={search.query}
        onQueryChange={search.setQuery}
        history={search.searchHistory}
        savedSearches={search.savedSearches}
        onLoadSearch={search.loadSearch}
        onSaveSearch={search.saveSearch}
        onDeleteSearch={search.deleteSearch}
        isSearching={search.isSearching}
        placeholder="Search devices by name, type, location, or status..."
        showSuggestions
        suggestions={suggestions}
      />

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Devices</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered Results</CardDescription>
            <CardTitle className="text-3xl">{stats.filtered}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Online</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.online}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offline</CardDescription>
            <CardTitle className="text-3xl text-gray-600">{stats.offline}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Power</CardDescription>
            <CardTitle className="text-3xl">{Math.round(stats.avgPower)}W</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Content */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">
            <Database className="h-4 w-4 mr-2" />
            Results ({search.resultCount})
          </TabsTrigger>
          <TabsTrigger value="filters">
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters {search.hasActiveFilters && `(${search.filters.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Results */}
        <TabsContent value="results" className="space-y-4">
          {search.isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              Searching...
            </div>
          )}

          {!search.isSearching && search.results.length === 0 && (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search.query || search.hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Start typing to search devices'}
              </p>
              {(search.query || search.hasActiveFilters) && (
                <Button variant="outline" onClick={search.reset}>
                  Clear Search
                </Button>
              )}
            </Card>
          )}

          {!search.isSearching && search.results.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {search.results.map((device) => (
                <Card key={device.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{device.name}</CardTitle>
                        <CardDescription>{device.location}</CardDescription>
                      </div>
                      <Badge
                        variant={
                          device.status === 'online'
                            ? 'default'
                            : device.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {device.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{device.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Power:</span>
                      <span className="font-medium">{device.power}W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temperature:</span>
                      <span className="font-medium">{device.temperature}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Switches:</span>
                      <span className="font-medium">{device.switches}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Filters */}
        <TabsContent value="filters">
          <FilterBuilder
            fields={filterFields}
            filters={search.filters}
            onAdd={search.addFilter}
            onRemove={search.removeFilter}
            onUpdate={search.updateFilter}
            onClear={search.clearFilters}
          />
        </TabsContent>
      </Tabs>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>Search Features</CardTitle>
          <CardDescription>Available search capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Fuzzy Search
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Finds matches even with typos</li>
                <li>• Configurable threshold</li>
                <li>• Searches multiple fields</li>
                <li>• Real-time results</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FilterIcon className="h-4 w-4" />
                Advanced Filters
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multiple filter conditions</li>
                <li>• AND/OR/NOT logic operators</li>
                <li>• 10+ comparison operators</li>
                <li>• Type-specific inputs</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Smart Features
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Search suggestions</li>
                <li>• Search history</li>
                <li>• Saved searches</li>
                <li>• Debounced input</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

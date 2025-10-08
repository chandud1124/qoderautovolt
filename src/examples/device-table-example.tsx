/**
 * Example: Using DataTable with Device Data
 * 
 * This file demonstrates how to use the DataTable component with various features:
 * - Column definitions with sorting
 * - Row selection
 * - Bulk actions
 * - Export functionality
 * - Custom cell rendering
 */

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader, DataTableRowSelectCheckbox, DataTableSelectAllCheckbox } from '@/components/ui/data-table';
import { BulkActionsToolbar, commonBulkActions, BulkAction } from '@/components/ui/bulk-actions-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { exportToCSV, exportToJSON, formatTableDate } from '@/lib/table-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Example data type
interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning';
  location: string;
  lastSeen: string;
  ipAddress: string;
}

// Example usage component
export function DeviceTableExample() {
  const [data, setData] = React.useState<Device[]>([
    {
      id: '1',
      name: 'Main Display',
      type: 'Display',
      status: 'online',
      location: 'Room 101',
      lastSeen: new Date().toISOString(),
      ipAddress: '192.168.1.10',
    },
    {
      id: '2',
      name: 'Control Panel',
      type: 'Controller',
      status: 'online',
      location: 'Room 102',
      lastSeen: new Date().toISOString(),
      ipAddress: '192.168.1.11',
    },
    // Add more mock data as needed
  ]);

  const [selectedRows, setSelectedRows] = React.useState<Device[]>([]);

  // Define columns
  const columns: ColumnDef<Device>[] = [
    // Selection column
    {
      id: 'select',
      header: ({ table }) => <DataTableSelectAllCheckbox table={table} />,
      cell: ({ row }) => <DataTableRowSelectCheckbox row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
    // Name column with sorting
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    // Type column
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    },
    // Status column with badge
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            variant={
              status === 'online'
                ? 'default'
                : status === 'warning'
                ? 'outline'
                : 'destructive'
            }
          >
            {status}
          </Badge>
        );
      },
    },
    // Location column
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
    },
    // Last Seen column with formatted date
    {
      accessorKey: 'lastSeen',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Seen" />,
      cell: ({ row }) => formatTableDate(row.getValue('lastSeen')),
    },
    // IP Address column
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.getValue('ipAddress')}
        </code>
      ),
    },
    // Actions column
    {
      id: 'actions',
      cell: ({ row }) => {
        const device = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(device)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(device)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Handle export to CSV
  const handleExport = (exportData: Device[]) => {
    exportToCSV(
      exportData,
      'devices-export.csv',
      [
        { key: 'name', label: 'Device Name' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'location', label: 'Location' },
        { key: 'lastSeen', label: 'Last Seen' },
        { key: 'ipAddress', label: 'IP Address' },
      ]
    );
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    console.log('Deleting selected devices:', selectedRows);
    // Implement delete logic
    setSelectedRows([]);
  };

  // Handle edit
  const handleEdit = (device: Device) => {
    console.log('Edit device:', device);
  };

  // Handle delete
  const handleDelete = (device: Device) => {
    console.log('Delete device:', device);
  };

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    commonBulkActions.delete(handleBulkDelete),
    commonBulkActions.export(() => handleExport(selectedRows)),
  ];

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedRows.length}
        totalCount={data.length}
        onDeselectAll={() => setSelectedRows([])}
        actions={bulkActions}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search devices..."
        onExport={handleExport}
        enableRowSelection={true}
        enableColumnVisibility={true}
        enablePagination={true}
        pageSize={10}
      />
    </div>
  );
}

/**
 * Usage in your pages:
 * 
 * import { DeviceTableExample } from '@/examples/device-table-example';
 * 
 * function DevicesPage() {
 *   return (
 *     <div className="container mx-auto py-10">
 *       <h1 className="text-3xl font-bold mb-6">Devices</h1>
 *       <DeviceTableExample />
 *     </div>
 *   );
 * }
 * 
 * 
 * Key Features Demonstrated:
 * 
 * 1. Column Sorting: Click column headers to sort (ascending/descending)
 * 2. Row Selection: Checkboxes for selecting rows
 * 3. Bulk Actions: Perform actions on multiple rows (delete, export)
 * 4. Search/Filter: Search by device name
 * 5. Export: Export selected or all filtered data to CSV
 * 6. Column Visibility: Show/hide columns using the View menu
 * 7. Pagination: Navigate through pages with first/prev/next/last buttons
 * 8. Custom Cells: Badges, formatted dates, action menus
 * 9. Responsive: Works on mobile and desktop
 * 10. TypeScript: Full type safety
 */

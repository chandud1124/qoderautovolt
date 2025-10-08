import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreVertical,
  Trash2,
  Edit,
  Download,
  Archive,
  X,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'success';
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDeselectAll: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onDeselectAll,
  actions,
  className,
}: BulkActionsToolbarProps) {
  const [confirmAction, setConfirmAction] = React.useState<BulkAction | null>(null);
  const [isExecuting, setIsExecuting] = React.useState(false);

  const handleActionClick = async (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      setIsExecuting(true);
      try {
        await action.onClick();
      } finally {
        setIsExecuting(false);
      }
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;

    setIsExecuting(true);
    try {
      await confirmAction.onClick();
    } finally {
      setIsExecuting(false);
      setConfirmAction(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className={`flex items-center justify-between gap-4 rounded-lg border bg-card p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm font-semibold">
            {selectedCount} selected
          </Badge>
          <span className="text-sm text-muted-foreground">
            out of {totalCount} total
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {actions.slice(0, 2).map((action, index) => (
            <Button
              key={index}
              variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={isExecuting}
              className="h-8"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          {actions.length > 2 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.slice(2).map((action, index) => (
                  <React.Fragment key={index}>
                    <DropdownMenuItem
                      onClick={() => handleActionClick(action)}
                      disabled={isExecuting}
                      className={
                        action.variant === 'destructive'
                          ? 'text-destructive focus:text-destructive'
                          : ''
                      }
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                    {index < actions.slice(2).length - 1 && <DropdownMenuSeparator />}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmationTitle || 'Are you sure?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmationDescription ||
                `This action will affect ${selectedCount} selected item(s). This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecuting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              disabled={isExecuting}
              className={
                confirmAction?.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {isExecuting ? 'Processing...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Preset bulk actions for common use cases
export const commonBulkActions = {
  delete: (onDelete: () => void | Promise<void>): BulkAction => ({
    label: 'Delete',
    icon: <Trash2 className="mr-2 h-4 w-4" />,
    onClick: onDelete,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Delete selected items?',
    confirmationDescription: 'This action cannot be undone. All selected items will be permanently deleted.',
  }),

  export: (onExport: () => void | Promise<void>): BulkAction => ({
    label: 'Export',
    icon: <Download className="mr-2 h-4 w-4" />,
    onClick: onExport,
  }),

  archive: (onArchive: () => void | Promise<void>): BulkAction => ({
    label: 'Archive',
    icon: <Archive className="mr-2 h-4 w-4" />,
    onClick: onArchive,
    requiresConfirmation: true,
    confirmationTitle: 'Archive selected items?',
    confirmationDescription: 'Selected items will be moved to the archive.',
  }),

  approve: (onApprove: () => void | Promise<void>): BulkAction => ({
    label: 'Approve',
    icon: <Check className="mr-2 h-4 w-4" />,
    onClick: onApprove,
    variant: 'success',
  }),

  edit: (onEdit: () => void | Promise<void>): BulkAction => ({
    label: 'Edit',
    icon: <Edit className="mr-2 h-4 w-4" />,
    onClick: onEdit,
  }),
};

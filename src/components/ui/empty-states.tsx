import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileQuestion,
  Inbox,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  Settings,
  Wifi,
  Database,
  Filter,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && (
        <div className="mb-4 text-muted-foreground opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Predefined empty state variants
export const NoDevices: React.FC<{ onAddDevice?: () => void }> = ({ onAddDevice }) => (
  <EmptyState
    icon={<Inbox className="h-16 w-16" />}
    title="No devices found"
    description="Get started by adding your first device to the system. Devices will appear here once configured."
    action={
      onAddDevice
        ? {
            label: 'Add Device',
            onClick: onAddDevice,
          }
        : undefined
    }
  />
);

export const NoSearchResults: React.FC<{ onClear?: () => void }> = ({ onClear }) => (
  <EmptyState
    icon={<Search className="h-16 w-16" />}
    title="No results found"
    description="We couldn't find any matches for your search. Try adjusting your filters or search terms."
    action={
      onClear
        ? {
            label: 'Clear Search',
            onClick: onClear,
            variant: 'outline',
          }
        : undefined
    }
  />
);

export const NoNotices: React.FC<{ onCreateNotice?: () => void }> = ({ onCreateNotice }) => (
  <EmptyState
    icon={<FileQuestion className="h-16 w-16" />}
    title="No notices yet"
    description="Start creating notices to display important information and announcements on your digital boards."
    action={
      onCreateNotice
        ? {
            label: 'Create Notice',
            onClick: onCreateNotice,
          }
        : undefined
    }
  />
);

export const NoUsers: React.FC<{ onAddUser?: () => void }> = ({ onAddUser }) => (
  <EmptyState
    icon={<Users className="h-16 w-16" />}
    title="No users yet"
    description="Add users to manage access and permissions across the system."
    action={
      onAddUser
        ? {
            label: 'Add User',
            onClick: onAddUser,
          }
        : undefined
    }
  />
);

export const NoData: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon={<Database className="h-16 w-16" />}
    title="No data available"
    description="There's no data to display at the moment. Try refreshing or check back later."
    action={
      onRefresh
        ? {
            label: 'Refresh',
            onClick: onRefresh,
            variant: 'outline',
          }
        : undefined
    }
  />
);

export const NoFilterResults: React.FC<{ onClearFilters?: () => void }> = ({ onClearFilters }) => (
  <EmptyState
    icon={<Filter className="h-16 w-16" />}
    title="No matches found"
    description="No items match your current filters. Try adjusting or clearing the filters to see more results."
    action={
      onClearFilters
        ? {
            label: 'Clear Filters',
            onClick: onClearFilters,
            variant: 'outline',
          }
        : undefined
    }
  />
);

export const OfflineState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon={<Wifi className="h-16 w-16" />}
    title="You're offline"
    description="Please check your internet connection and try again."
    action={
      onRetry
        ? {
            label: 'Retry',
            onClick: onRetry,
          }
        : undefined
    }
  />
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <EmptyState
    icon={<AlertCircle className="h-16 w-16 text-destructive" />}
    title="Something went wrong"
    description={message || "We encountered an error while loading your data. Please try again."}
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
          }
        : undefined
    }
  />
);

export const SuccessState: React.FC<{ title: string; description?: string; onContinue?: () => void }> = ({
  title,
  description,
  onContinue,
}) => (
  <EmptyState
    icon={<CheckCircle className="h-16 w-16 text-success" />}
    title={title}
    description={description}
    action={
      onContinue
        ? {
            label: 'Continue',
            onClick: onContinue,
          }
        : undefined
    }
  />
);

export const ComingSoon: React.FC<{ feature: string }> = ({ feature }) => (
  <EmptyState
    icon={<Settings className="h-16 w-16" />}
    title="Coming Soon"
    description={`${feature} is currently under development. Check back soon for updates!`}
  />
);

// Card-based empty state with illustration
interface EmptyStateCardProps {
  illustration?: React.ReactNode;
  title: string;
  description: string;
  features?: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  illustration,
  title,
  description,
  features,
  action,
  className,
}) => {
  return (
    <div className={cn('max-w-2xl mx-auto py-12 px-4', className)}>
      <div className="bg-card border rounded-lg p-8 text-center">
        {illustration && (
          <div className="mb-6 flex justify-center">
            {illustration}
          </div>
        )}
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        
        {features && features.length > 0 && (
          <div className="mb-6">
            <ul className="text-sm text-muted-foreground space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {action && (
          <Button onClick={action.onClick} size="lg">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};

// Onboarding empty state
interface OnboardingEmptyStateProps {
  steps: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  onGetStarted?: () => void;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  steps,
  onGetStarted,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">Get Started</h2>
        <p className="text-muted-foreground">
          Follow these steps to set up your system
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-card border rounded-lg p-6 text-center hover:shadow-md transition-shadow"
          >
            <div className="mb-4 flex justify-center text-primary">
              {step.icon}
            </div>
            <h3 className="font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
      
      {onGetStarted && (
        <div className="text-center">
          <Button onClick={onGetStarted} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Get Started
          </Button>
        </div>
      )}
    </div>
  );
};

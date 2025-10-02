import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Monitor, Edit, Trash2 } from 'lucide-react';
import { NoticeSubmissionForm } from '@/components/NoticeSubmissionForm';
import { NoticeApprovalPanel } from '@/components/NoticeApprovalPanel';
import BoardManager from '@/components/BoardManager';
import ContentScheduler from '@/components/ContentScheduler';
import LiveScreenPreview from '@/components/LiveScreenPreview';
import { NoticeFilters } from '@/components/NoticeFilters';
import { NoticePagination } from '@/components/NoticePagination';
import { BulkActions } from '@/components/BulkActions';
import { useAuth } from '@/hooks/useAuth';
import { Notice, NoticeFilters as NoticeFiltersType } from '@/types';
import api from '@/services/api';
import mqttService from '@/services/mqtt';
import { useToast } from '@/hooks/use-toast';

const NoticeBoard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeNotices, setActiveNotices] = useState<Notice[]>([]);
  const [pendingNotices, setPendingNotices] = useState<Notice[]>([]);
  const [activeTab, setActiveTab] = useState<string>((user?.role === 'admin' || user?.role === 'super-admin') ? 'pending' : 'live-preview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newlyApprovedContentId, setNewlyApprovedContentId] = useState<string | null>(null);
  const [contentSchedulerRefreshTrigger, setContentSchedulerRefreshTrigger] = useState(0);

  const refreshContentScheduler = () => {
    setContentSchedulerRefreshTrigger(prev => prev + 1);
  };

  // Log tab changes
  useEffect(() => {
    console.log('[NoticeBoard] Active tab changed to:', activeTab);
  }, [activeTab]);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [boards, setBoards] = useState<any[]>([]);
  const [filters, setFilters] = useState<NoticeFiltersType>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: '',
    status: undefined,
    priority: undefined,
    category: undefined,
    dateFrom: undefined,
    dateTo: undefined
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  const [selectedNotices, setSelectedNotices] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Notice[]>([]);

  // Fetch notices based on user role
  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError(null);

      const [noticesResponse, activeResponse] = await Promise.all([
        api.get('/notices', { params: filters }),
        api.get('/notices/active')
      ]);

      if (noticesResponse.data.success) {
        setNotices(noticesResponse.data.notices);
        setPagination({
          currentPage: noticesResponse.data.page,
          totalPages: noticesResponse.data.totalPages,
          totalItems: noticesResponse.data.totalItems
        });
      }

      if (activeResponse.data.success) {
        setActiveNotices(activeResponse.data.notices);
      }

      // Fetch pending notices for admin users
      if (user?.role === 'admin' || user?.role === 'super-admin') {
        const pendingResponse = await api.get('/notices/pending');
        if (pendingResponse.data.success) {
          setPendingNotices(pendingResponse.data.notices);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch boards for ContentScheduler
  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.boards);
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  };

  // Fetch drafts for current user
  const fetchDrafts = async () => {
    try {
      const response = await api.get('/notices/drafts');
      if (response.data.success) {
        setDrafts(response.data.drafts);
      }
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchBoards();
    fetchDrafts(); // Add this line
    // ... rest of useEffect
    const handleNoticeSubmitted = (data: any) => {
      console.log('[MQTT] Notice submitted:', data);
      toast({
        title: 'New Notice Submitted',
        description: `A new notice "${data.notice.title}" has been submitted for approval.`,
      });
      // Refresh notices to show the new submission
      fetchNotices();
    };

    const handleNoticeReviewed = (data: any) => {
      console.log('[MQTT] Notice reviewed:', data);
      toast({
        title: `Notice ${data.action}d`,
        description: `Notice "${data.notice.title}" has been ${data.action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      // Refresh notices to update the status
      fetchNotices();
    };

    const handleNoticePublished = (data: any) => {
      console.log('[MQTT] Notice published:', data);
      toast({
        title: 'Notice Published',
        description: `Notice "${data.notice.title}" is now active and visible to users.`,
      });
      // Refresh notices to show the published notice
      fetchNotices();
    };

    const handleAdminNotification = (data: any) => {
      console.log('[MQTT] Admin notification:', data);
      if (user?.role === 'admin' || user?.role === 'super-admin') {
        toast({
          title: 'Admin Alert',
          description: data.message,
          variant: 'destructive',
        });
      }
    };

    const handlePersonalNotification = (data: any) => {
      console.log('[MQTT] Personal notification:', data);
      toast({
        title: 'Notice Update',
        description: data.message,
      });
    };

    // Subscribe to MQTT topics
    mqttService.on('notices/submitted', handleNoticeSubmitted);
    mqttService.on('notices/reviewed', handleNoticeReviewed);
    mqttService.on('notices/published', handleNoticePublished);
    mqttService.on('notices/admin', handleAdminNotification);

    // Subscribe to user-specific topic if user is logged in
    if (user?.id) {
      mqttService.subscribeToUserTopics(user.id);
      mqttService.on(`notices/user/${user.id}`, handlePersonalNotification);
    }

    // Cleanup function
    return () => {
      mqttService.off('notices/submitted', handleNoticeSubmitted);
      mqttService.off('notices/reviewed', handleNoticeReviewed);
      mqttService.off('notices/published', handleNoticePublished);
      mqttService.off('notices/admin', handleAdminNotification);

      if (user?.id) {
        mqttService.off(`notices/user/${user.id}`, handlePersonalNotification);
        mqttService.unsubscribeFromUserTopics(user.id);
      }
    };
  }, [filters, user, toast]);

  const handleEditNotice = (notice: Notice) => {
    // If notice is approved/active, open ContentScheduler for full editing
    if (notice.status === 'approved' || notice.status === 'published') {
      setNewlyApprovedContentId(notice._id);
      setActiveTab('content-scheduler');
      return;
    }

    // For pending notices, use simple edit dialog
    setEditingNotice(notice);
    setEditContent(notice.content);
    setShowEditForm(true);
  };

  const handleUpdateNotice = async () => {
    if (!editingNotice || !editContent.trim()) {
      setError('Content cannot be empty');
      return;
    }

    try {
      await api.put(`/notices/${editingNotice._id}`, {
        content: editContent.trim()
      });
      setShowEditForm(false);
      setEditingNotice(null);
      setEditContent('');
      fetchNotices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update notice');
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/notices/${noticeId}`);
      fetchNotices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete notice');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notice Board</h1>
          <p className="text-muted-foreground">
            View and manage notices for the institution
          </p>
        </div>
        <Button onClick={() => setShowSubmissionForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Notice
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="live-preview">Live Preview</TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'super-admin') && (
            <>
              <TabsTrigger value="board-management">Board Management</TabsTrigger>
              <TabsTrigger value="content-scheduler">Content Scheduler</TabsTrigger>
              <TabsTrigger value="pending">
                Pending Approval ({pendingNotices.length})
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="my-drafts">
            My Drafts ({drafts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live-preview">
          <LiveScreenPreview />
        </TabsContent>

        {(user?.role === 'admin' || user?.role === 'super-admin') && (
          <TabsContent value="board-management">
            <BoardManager />
          </TabsContent>
        )}

        {(user?.role === 'admin' || user?.role === 'super-admin') && (
          <TabsContent value="content-scheduler">
            <ContentScheduler
              boards={boards}
              onScheduleUpdate={() => fetchNotices()}
              autoEditContentId={newlyApprovedContentId}
              onAutoEditComplete={() => setNewlyApprovedContentId(null)}
              refreshTrigger={contentSchedulerRefreshTrigger}
            />
          </TabsContent>
        )}

        {(user?.role === 'admin' || user?.role === 'super-admin') && (
          <TabsContent value="pending" className="space-y-4">
            {/* Add Filters */}
            <NoticeFilters
              filters={filters}
              onFilterChange={(newFilters) => {
                setFilters(newFilters);
                fetchNotices();
              }}
              onClearFilters={() => {
                setFilters({
                  page: 1,
                  limit: 25,
                  sortBy: 'createdAt',
                  sortOrder: 'desc'
                });
                fetchNotices();
              }}
            />

            {/* Add Bulk Actions */}
            <BulkActions
              selectedNotices={selectedNotices}
              totalNotices={pendingNotices.length}
              onSelectAll={() => setSelectedNotices(pendingNotices.map(n => n._id))}
              onDeselectAll={() => setSelectedNotices([])}
              onActionComplete={() => {
                setSelectedNotices([]);
                fetchNotices();
              }}
            />

            {/* Existing NoticeApprovalPanel */}
            <NoticeApprovalPanel
              notices={pendingNotices}
              onRefresh={fetchNotices}
              onApprove={(scheduledContentId) => {
                // Instead of auto-switching, just refresh and show success
                console.log('[NoticeBoard] Notice approved with scheduled content ID:', scheduledContentId);
                fetchNotices();
                // Optionally show a success message about moving to Content Scheduler
              }}
              onContentSchedulerRefresh={refreshContentScheduler}
            />

            {/* Add Pagination */}
            {pendingNotices.length > 0 && (
              <NoticePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={filters.limit || 25}
                onPageChange={(page) => {
                  setFilters({ ...filters, page });
                  fetchNotices();
                }}
                onItemsPerPageChange={(limit) => {
                  setFilters({ ...filters, limit, page: 1 });
                  fetchNotices();
                }}
              />
            )}
          </TabsContent>
        )}

        <TabsContent value="my-drafts">
          <Card>
            <CardHeader>
              <CardTitle>My Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No drafts saved</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {drafts.map((draft) => (
                    <Card key={draft._id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{draft.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {draft.content.substring(0, 150)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getPriorityColor(draft.priority)}>
                              {draft.priority}
                            </Badge>
                            <Badge variant="secondary">{draft.category}</Badge>
                            <span className="text-xs text-muted-foreground">
                              Last updated: {formatDate(draft.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Open edit dialog with draft data
                              setEditingNotice(draft);
                              setEditContent(draft.content);
                              setShowEditForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (confirm('Delete this draft?')) {
                                try {
                                  await api.delete(`/notices/drafts/${draft._id}`);
                                  toast({
                                    title: 'Draft deleted',
                                    description: 'The draft has been deleted successfully.'
                                  });
                                  fetchDrafts();
                                } catch (err) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to delete draft',
                                    variant: 'destructive'
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showSubmissionForm && (
        <NoticeSubmissionForm
          onClose={() => setShowSubmissionForm(false)}
          onSuccess={() => {
            setShowSubmissionForm(false);
            fetchNotices();
          }}
        />
      )}

      {showEditForm && editingNotice && (
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Notice</DialogTitle>
              <DialogDescription>
                Modify the content of this notice. Changes will be saved immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>Title:</strong> {editingNotice.title}</p>
                <p><strong>Status:</strong> {editingNotice.status}</p>
                <p><strong>Priority:</strong> {editingNotice.priority}</p>
                <p><strong>Category:</strong> {editingNotice.category}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[200px]"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter notice content..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowEditForm(false);
                  setEditingNotice(null);
                  setEditContent('');
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateNotice}>
                  Update Notice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default NoticeBoard;
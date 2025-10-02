import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Eye, AlertTriangle, Edit, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { Notice, NoticeReviewData } from '@/types';
import { config } from '@/config/env';

interface NoticeApprovalPanelProps {
  notices: Notice[];
  onRefresh: () => void;
  onApprove?: (scheduledContentId?: string) => void; // Callback to switch to Content Scheduler tab with content ID
  onContentSchedulerRefresh?: () => void; // Callback to refresh ContentScheduler
}

const NoticeApprovalPanel: React.FC<NoticeApprovalPanelProps> = ({ notices, onRefresh, onApprove, onContentSchedulerRefresh }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    notice: Notice | null;
    action: 'approve' | 'reject' | null;
  }>({
    open: false,
    notice: null,
    action: null
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [schedulingDialog, setSchedulingDialog] = useState<{
    open: boolean;
    notice: Notice | null;
    scheduledContentId: string | null;
  }>({
    open: false,
    notice: null,
    scheduledContentId: null
  });
  const [scheduleData, setScheduleData] = useState({
    duration: 30,
    scheduleType: 'recurring' as 'always' | 'recurring' | 'fixed',
    selectedDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    startTime: '09:00',
    endTime: '17:00',
    assignedBoards: [] as string[]
  });
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    content: '',
    contentType: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');

  // Debug logging for scheduling dialog
  useEffect(() => {
    if (schedulingDialog.open) {
      console.log('[NoticeApprovalPanel] Scheduling dialog opened for notice:', schedulingDialog.notice?.title);
      console.log('[NoticeApprovalPanel] ScheduledContentId:', schedulingDialog.scheduledContentId);
    }
  }, [schedulingDialog.open, schedulingDialog.notice, schedulingDialog.scheduledContentId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
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

  const handleReview = async (noticeId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(noticeId);

    try {
      const reviewData: NoticeReviewData = {
        action,
        ...(action === 'reject' && { rejectionReason })
      };

      const response = await api.patch(`/notices/${noticeId}/review`, reviewData);

      if (response.data.success) {
        console.log('[NoticeApprovalPanel] Approval successful, action:', action);
        console.log('[NoticeApprovalPanel] onApprove callback exists:', !!onApprove);
        console.log('[NoticeApprovalPanel] ScheduledContent ID:', response.data.scheduledContentId);
        
        toast({
          title: `Notice ${action}d successfully`,
          description: action === 'approve'
            ? 'Notice approved! Configure display schedule below.'
            : 'The notice has been rejected and the submitter has been notified.'
        });
        
        if (action === 'approve') {
          // Show scheduling dialog instead of auto-switching
          const scheduledContentId = response.data.scheduledContentId;
          console.log('[NoticeApprovalPanel] Opening scheduling dialog for notice:', reviewDialog.notice?.title);
          console.log('[NoticeApprovalPanel] ScheduledContentId:', scheduledContentId);
          setScheduleData({
            duration: 30,
            scheduleType: 'recurring' as 'always' | 'recurring' | 'fixed',
            selectedDays: [1, 2, 3, 4, 5], // Monday to Friday by default
            startTime: '09:00',
            endTime: '17:00',
            assignedBoards: [] as string[]
          });
          fetchBoards(); // Fetch available boards
          setSchedulingDialog({
            open: true,
            notice: reviewDialog.notice,
            scheduledContentId
          });
          console.log('[NoticeApprovalPanel] Scheduling dialog state set to open');
        }
        
        setReviewDialog({ open: false, notice: null, action: null });
        setRejectionReason('');
        onRefresh();
      }
    } catch (err: any) {
      toast({
        title: 'Review failed',
        description: err.response?.data?.message || 'Failed to review notice',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setEditData({
      title: notice.title,
      content: notice.content,
      contentType: notice.contentType || '',
      tags: notice.tags || []
    });
    setTagInput('');
  };

  const handleSaveEdit = async () => {
    if (!editingNotice) return;

    setLoading(editingNotice._id);

    try {
      const response = await api.patch(`/notices/${editingNotice._id}/edit`, editData);

      if (response.data.success) {
        toast({
          title: 'Notice updated successfully',
          description: 'The notice has been updated and is ready for review.'
        });
        setEditingNotice(null);
        onRefresh();
      }
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.response?.data?.message || 'Failed to update notice',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !editData.tags.includes(tagInput.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const openReviewDialog = (notice: Notice, action: 'approve' | 'reject') => {
    setReviewDialog({ open: true, notice, action });
    setRejectionReason('');
  };

  const handleSkipAndPublish = async () => {
    if (!schedulingDialog.notice) return;

    setLoading(schedulingDialog.notice._id);

    try {
      const response = await api.patch(`/notices/${schedulingDialog.notice._id}/schedule-publish`, {
        skipScheduling: true
      });

      if (response.data.success) {
        toast({
          title: 'Notice published successfully',
          description: 'The notice has been published without scheduling.'
        });
        setSchedulingDialog({ open: false, notice: null, scheduledContentId: null });
        onRefresh();
        onContentSchedulerRefresh?.(); // Refresh ContentScheduler
      }
    } catch (err: any) {
      toast({
        title: 'Publishing failed',
        description: err.response?.data?.message || 'Failed to publish notice',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  const handleSaveScheduleAndPublish = async () => {
    if (!schedulingDialog.notice) return;

    setLoading(schedulingDialog.notice._id);

    try {
      const response = await api.patch(`/notices/${schedulingDialog.notice._id}/schedule-publish`, {
        duration: scheduleData.duration,
        scheduleType: scheduleData.scheduleType,
        selectedDays: scheduleData.selectedDays,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        assignedBoards: scheduleData.assignedBoards,
        skipScheduling: false
      });

      if (response.data.success) {
        toast({
          title: 'Notice scheduled and published successfully',
          description: 'The notice has been configured and published.'
        });
        setSchedulingDialog({ open: false, notice: null, scheduledContentId: null });
        onRefresh();
        onContentSchedulerRefresh?.(); // Refresh ContentScheduler
      }
    } catch (err: any) {
      toast({
        title: 'Scheduling failed',
        description: err.response?.data?.message || 'Failed to schedule and publish notice',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setScheduleData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayIndex)
        ? prev.selectedDays.filter(d => d !== dayIndex)
        : [...prev.selectedDays, dayIndex].sort()
    }));
  };

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setAvailableBoards(response.data.boards);
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  };

  const toggleBoard = (boardId: string) => {
    setScheduleData(prev => ({
      ...prev,
      assignedBoards: prev.assignedBoards.includes(boardId)
        ? prev.assignedBoards.filter(id => id !== boardId)
        : [...prev.assignedBoards, boardId]
    }));
  };

  if (notices.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No pending notices for approval</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Review pending notices. Approved notices will be moved to the "Approved" tab where they can be published to make them active.
            Rejected notices will be returned to the submitter with feedback.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {notices.map((notice) => (
            <Card key={notice._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{notice.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(notice.priority)}>
                        {notice.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{notice.category}</Badge>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>By: {notice.submittedBy.name}</p>
                    <p>{formatDate(notice.createdAt)}</p>
                    {notice.expiryDate && (
                      <p className="text-orange-600">
                        Expires: {formatDate(notice.expiryDate)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Kiosk-Style Preview Section */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 border-2 border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Display Preview</h3>
                      <Badge variant="outline" className="ml-auto bg-blue-500/20 text-blue-300 border-blue-500/50">
                        As users will see it
                      </Badge>
                    </div>
                    
                    {/* Display content based on type */}
                    {notice.contentType === 'image' && notice.attachments && notice.attachments.length > 0 ? (
                      <div className="space-y-4">
                        {notice.content && (
                          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                          </div>
                        )}
                        <div className="grid gap-4">
                          {notice.attachments
                            .filter(att => att.mimetype?.startsWith('image/') || att.originalName?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                            .map((attachment, index) => (
                              <div key={index} className="border-2 border-slate-600 rounded-lg overflow-hidden bg-black">
                                <img
                                  src={`${config.staticBaseUrl}${attachment.url}`}
                                  alt={attachment.originalName}
                                  className="w-full h-auto max-h-[500px] object-contain"
                                  onError={(e) => {
                                    console.error('Image load error:', attachment.url);
                                    console.error('Full URL:', `${config.staticBaseUrl}${attachment.url}`);
                                    console.error('Config staticBaseUrl:', config.staticBaseUrl);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="p-4 text-red-400">Failed to load image</div>';
                                  }}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : notice.contentType === 'video' && notice.attachments && notice.attachments.length > 0 ? (
                      <div className="space-y-4">
                        {notice.content && (
                          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                          </div>
                        )}
                        <div className="grid gap-4">
                          {notice.attachments
                            .filter(att => att.mimetype?.startsWith('video/') || att.originalName?.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i))
                            .map((attachment, index) => (
                              <div key={index} className="border-2 border-slate-600 rounded-lg overflow-hidden bg-black">
                                <video
                                  controls
                                  className="w-full h-auto max-h-[500px]"
                                  onError={(e) => {
                                    console.error('Video load error:', attachment.url);
                                  }}
                                >
                                  <source src={`${config.staticBaseUrl}${attachment.url}`} type={attachment.mimetype} />
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                        <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                      </div>
                    )}

                    {/* Drive Link Preview */}
                    {notice.driveLink && (
                      <div className="mt-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-sm font-medium text-blue-300 mb-2">📁 Cloud Storage Link:</h4>
                        <a 
                          href={notice.driveLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline break-all"
                        >
                          {notice.driveLink}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{notice.content}</p>
                  </div>

                  {notice.attachments && notice.attachments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Attachments:</h4>
                      <div className="grid gap-2">
                        {notice.attachments.map((attachment, index) => {
                          const isImage = attachment.mimetype?.startsWith('image/');
                          const isVideo = attachment.mimetype?.startsWith('video/');
                          const isPDF = attachment.mimetype === 'application/pdf';
                          
                          return (
                            <div key={index} className="border rounded-lg p-3 bg-muted/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isImage && <span className="text-green-600">🖼️</span>}
                                  {isVideo && <span className="text-blue-600">🎥</span>}
                                  {isPDF && <span className="text-red-600">📄</span>}
                                  {!isImage && !isVideo && !isPDF && <span className="text-gray-600">📎</span>}
                                  <span className="font-medium text-sm">{attachment.originalName}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`${config.staticBaseUrl}${attachment.url}`, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                              {isImage && (
                                <div className="mt-2">
                                  <img
                                    src={`${config.staticBaseUrl}${attachment.url}`}
                                    alt={attachment.originalName}
                                    className="max-w-full h-auto max-h-48 rounded border"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleEdit(notice)}
                      disabled={loading === notice._id}
                      variant="outline"
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => openReviewDialog(notice, 'approve')}
                      disabled={loading === notice._id}
                      className="flex-1"
                    >
                      {loading === notice._id && reviewDialog.action === 'approve' && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => openReviewDialog(notice, 'reject')}
                      disabled={loading === notice._id}
                      variant="destructive"
                      className="flex-1"
                    >
                      {loading === notice._id && reviewDialog.action === 'reject' && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve Notice' : 'Reject Notice'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? 'Review the notice details and confirm approval. Approved notices can be published later to make them active.'
                : 'Review the notice details and provide a reason for rejection.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {reviewDialog.action === 'approve'
                ? 'Are you sure you want to approve this notice? It will be moved to the Approved tab for publishing.'
                : 'Please provide a reason for rejecting this notice.'
              }
            </p>

            {reviewDialog.notice && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{reviewDialog.notice.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Submitted by: {reviewDialog.notice.submittedBy.name}
                </p>
              </div>
            )}

            {reviewDialog.action === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this notice is being rejected..."
                  rows={3}
                  required
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewDialog({ open: false, notice: null, action: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reviewDialog.notice && handleReview(reviewDialog.notice._id, reviewDialog.action!)}
              disabled={loading !== null || (reviewDialog.action === 'reject' && !rejectionReason.trim())}
              variant={reviewDialog.action === 'reject' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingNotice !== null}
        onOpenChange={(open) => !open && setEditingNotice(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Notice</DialogTitle>
            <DialogDescription>
              Make changes to the notice content before approving it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Title *</Label>
              <Input
                id="editTitle"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter notice title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editContent">Content *</Label>
              <Textarea
                id="editContent"
                value={editData.content}
                onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter notice content"
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editContentType">Content Type</Label>
              <Select
                value={editData.contentType}
                onValueChange={(value) => setEditData(prev => ({ ...prev, contentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="information">Information</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {editData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors" onClick={() => removeTag(tag)}>
                      {tag}
                      <span className="ml-1 text-xs">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingNotice(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={loading !== null || !editData.title.trim() || !editData.content.trim()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integrated Scheduling Dialog */}
      <Dialog
        open={schedulingDialog.open}
        onOpenChange={(open) => {
          console.log('[NoticeApprovalPanel] Dialog onOpenChange called with:', open);
          setSchedulingDialog(prev => ({ ...prev, open }));
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Notice Display</DialogTitle>
            <DialogDescription>
              Configure when and where this notice should be displayed before publishing.
            </DialogDescription>
          </DialogHeader>

          {schedulingDialog.notice && (
            <div className="space-y-6">
              {/* Notice Preview */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">{schedulingDialog.notice.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {schedulingDialog.notice.content}
                </p>
              </div>

              {/* Quick Schedule Options */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Display Duration (seconds)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    min="5"
                    max="300"
                    value={scheduleData.duration}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Select 
                    value={scheduleData.scheduleType}
                    onValueChange={(value: 'always' | 'recurring' | 'fixed') => 
                      setScheduleData(prev => ({ ...prev, scheduleType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always Display</SelectItem>
                      <SelectItem value="recurring">Recurring Schedule</SelectItem>
                      <SelectItem value="fixed">Fixed Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleData.scheduleType !== 'always' && (
                  <>
                    <div className="space-y-2">
                      <Label>Days of Week</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                          <Button
                            key={day}
                            variant={scheduleData.selectedDays.includes(index) ? "default" : "outline"}
                            size="sm"
                            className="min-w-[60px]"
                            onClick={() => toggleDay(index)}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input 
                          type="time" 
                          value={scheduleData.startTime}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input 
                          type="time" 
                          value={scheduleData.endTime}
                          onChange={(e) => setScheduleData(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Assign to Boards</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                    {availableBoards.length > 0 ? (
                      <div className="space-y-2">
                        {availableBoards.map((board) => (
                          <div key={board._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`board-${board._id}`}
                              checked={scheduleData.assignedBoards.includes(board._id)}
                              onChange={() => toggleBoard(board._id)}
                              className="rounded"
                            />
                            <label
                              htmlFor={`board-${board._id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {board.name} ({board.location || 'No location'})
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading boards...</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which boards should display this notice
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Advanced scheduling options available in Content Scheduler
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSkipAndPublish}
                    disabled={loading === schedulingDialog.notice?._id}
                  >
                    {loading === schedulingDialog.notice?._id && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Skip & Publish Later
                  </Button>
                  <Button
                    onClick={handleSaveScheduleAndPublish}
                    disabled={loading === schedulingDialog.notice?._id}
                  >
                    {loading === schedulingDialog.notice?._id && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Schedule & Publish
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export { NoticeApprovalPanel };

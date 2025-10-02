# Quick Integration Guide - Notice Board Enhancements

## 🚀 Quick Start (Copy-Paste Ready Code)

### 1. Update NoticeBoard.tsx - State Management

Add these imports at the top:
```typescript
import { NoticeFilters } from '@/components/NoticeFilters';
import { NoticePagination } from '@/components/NoticePagination';
import { BulkActions } from '@/components/BulkActions';
```

Add these state variables (replace existing filters state):
```typescript
const [filters, setFilters] = useState<NoticeFilters>({
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
```

### 2. Update fetchNotices Function

Replace the existing fetchNotices with:
```typescript
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
```

### 3. Add Draft Fetching

Add this new function:
```typescript
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
```

Update the useEffect to call it:
```typescript
useEffect(() => {
  fetchNotices();
  fetchBoards();
  fetchDrafts(); // Add this line
  // ... rest of useEffect
}, []);
```

### 4. Add Drafts Tab to TabsList

In the JSX, add this new tab trigger:
```typescript
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
</Tabs List>
```

### 5. Add Filter Component to Pending Tab

Replace the existing pending TabsContent with:
```typescript
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
        setNewlyApprovedContentId(scheduledContentId || null);
        setActiveTab('content-scheduler');
      }}
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
```

### 6. Add Drafts Tab Content

Add this new TabsContent:
```typescript
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
```

---

## ✅ Testing Steps

1. **Test Filters:**
   - Enter text in search box
   - Select different statuses
   - Select different priorities
   - Set date ranges
   - Click "Clear All"

2. **Test Pagination:**
   - Click page numbers
   - Click prev/next
   - Change items per page
   - Verify count is correct

3. **Test Bulk Actions:**
   - Select multiple notices
   - Click "Select All"
   - Try bulk approve
   - Try bulk reject (enter reason)
   - Try bulk archive
   - Try bulk delete

4. **Test Drafts:**
   - Save a draft from submission form
   - View drafts in "My Drafts" tab
   - Edit a draft
   - Delete a draft
   - Verify count updates

---

## 🔧 Troubleshooting

### Issue: "Property 'search' does not exist on type 'NoticeFilters'"
**Fix:** Make sure you updated `src/types/index.ts` with the new fields

### Issue: Components not found
**Fix:** Verify all component files are created in `src/components/`

### Issue: API returns 404
**Fix:** Restart backend server to load new routes

### Issue: Pagination not working
**Fix:** Check that backend returns `totalItems` and `totalPages` in response

### Issue: Bulk actions not showing
**Fix:** Ensure `selectedNotices` state is initialized as empty array

---

## 📝 Additional Enhancements (Optional)

### Add Character Count to Rich Editor

In NoticeSubmissionForm, below RichTextEditor:
```typescript
<div className="text-right text-sm text-muted-foreground">
  {formData.content.length} / 2000 characters
</div>
```

### Add Keyboard Shortcuts

Add this useEffect in NoticeBoard:
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      document.querySelector<HTMLInputElement>('#search')?.focus();
    }
    // Ctrl+N to open new notice form
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      setShowSubmissionForm(true);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

### Add Loading Skeletons

Replace the loading spinner with:
```typescript
{loading && (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-full"></div>
          <div className="h-3 bg-muted rounded w-5/6"></div>
        </div>
      </Card>
    ))}
  </div>
)}
```

---

## 🎯 Feature Completion Status

✅ **Backend**
- [x] Enhanced search with filters
- [x] Bulk operations (approve, reject, archive, delete)
- [x] Draft management (CRUD)
- [x] Pagination metadata
- [x] Input validation
- [x] Error handling

✅ **Components**
- [x] NoticeFilters
- [x] NoticePagination
- [x] BulkActions
- [x] RichTextEditor
- [x] AttachmentPreview

🔄 **Integration** (Copy code above)
- [ ] Add filters to NoticeBoard
- [ ] Add pagination to NoticeBoard
- [ ] Add bulk actions to NoticeBoard
- [ ] Add drafts tab
- [ ] Update NoticeSubmissionForm with RichTextEditor
- [ ] Add draft save functionality
- [ ] Update NoticeApprovalPanel with AttachmentPreview

---

## 📞 Support

If you encounter any issues:
1. Check console for errors
2. Verify all dependencies installed
3. Restart both backend and frontend
4. Clear browser cache
5. Check network tab for failed API calls

For additional help, refer to:
- `NOTICE_BOARD_IMPLEMENTATION_SUMMARY.md` - Complete technical documentation
- `NOTICE_BOARD_ENHANCEMENT_PLAN.md` - Feature roadmap
- Backend logs in `backend/` directory
- Browser dev tools console

---

**Happy Coding! 🚀**

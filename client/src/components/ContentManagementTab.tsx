import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Edit,
  FileText,
  Search,
  UserCheck,
  UserX,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ContentManagementTab() {
  const [contentType, setContentType] = useState<'blogs' | 'forums' | 'events' | 'jobs' | 'gigs' | 'hubs' | 'communities' | 'startups' | 'opportunities' | 'learning'>('blogs');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBlogPost, setSelectedBlogPost] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries for all content types
  const { data: blogs, refetch: refetchBlogs } = trpc.admin.getAllBlogPosts.useQuery();
  const { data: forums, refetch: refetchForums } = trpc.admin.getAllForumThreads.useQuery();
  const { data: events, refetch: refetchEvents } = trpc.admin.getAllEvents.useQuery();
  const { data: jobs, refetch: refetchJobs } = trpc.admin.getAllJobs.useQuery();
  const { data: gigs, refetch: refetchGigs } = trpc.admin.getAllGigs.useQuery();
  const { data: hubs, refetch: refetchHubs } = trpc.admin.getAllHubs.useQuery();
  const { data: communities, refetch: refetchCommunities } = trpc.admin.getAllCommunities.useQuery();
  const { data: startups, refetch: refetchStartups } = trpc.admin.getAllStartups.useQuery();
  const { data: opportunities, refetch: refetchOpportunities } = trpc.admin.getAllOpportunities.useQuery();
  const { data: learning, refetch: refetchLearning } = trpc.admin.getAllLearningResources.useQuery();

  // Blog approval/rejection mutations
  const approveBlogMutation = trpc.admin.approveBlogPost.useMutation({
    onSuccess: () => {
      toast.success("Blog post approved and published! Email sent to author.");
      refetchBlogs();
      setApprovalDialogOpen(false);
      setSelectedBlogPost(null);
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectBlogMutation = trpc.admin.rejectBlogPost.useMutation({
    onSuccess: () => {
      toast.success("Blog post rejected. Email sent to author.");
      refetchBlogs();
      setRejectionDialogOpen(false);
      setSelectedBlogPost(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  // Delete mutations
  const deleteBlogMutation = trpc.admin.deleteBlogPost.useMutation({
    onSuccess: () => {
      toast.success("Blog post deleted");
      refetchBlogs();
    },
    onError: (error) => {
      toast.error(`Failed to delete blog post: ${error.message}`);
    },
  });

  const deleteForumMutation = trpc.admin.deleteForumThread.useMutation({
    onSuccess: () => {
      toast.success("Forum thread deleted");
      refetchForums();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteEventMutation = trpc.admin.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success("Event deleted");
      refetchEvents();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteJobMutation = trpc.admin.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job deleted");
      refetchJobs();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteGigMutation = trpc.admin.deleteGig.useMutation({
    onSuccess: () => {
      toast.success("Gig deleted");
      refetchGigs();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteHubMutation = trpc.admin.deleteHub.useMutation({
    onSuccess: () => {
      toast.success("Hub deleted");
      refetchHubs();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteCommunityMutation = trpc.admin.deleteCommunity.useMutation({
    onSuccess: () => {
      toast.success("Community deleted");
      refetchCommunities();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteStartupMutation = trpc.admin.deleteStartup.useMutation({
    onSuccess: () => {
      toast.success("Startup deleted");
      refetchStartups();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteOpportunityMutation = trpc.admin.deleteOpportunity.useMutation({
    onSuccess: () => {
      toast.success("Opportunity deleted");
      refetchOpportunities();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteLearningMutation = trpc.admin.deleteLearningResource.useMutation({
    onSuccess: () => {
      toast.success("Learning resource deleted");
      refetchLearning();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.admin.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.count} items`);
      setSelectedItems([]);
      // Refetch based on content type
      switch (contentType) {
        case 'blogs': refetchBlogs(); break;
        case 'forums': refetchForums(); break;
        case 'events': refetchEvents(); break;
        case 'jobs': refetchJobs(); break;
        case 'gigs': refetchGigs(); break;
        case 'hubs': refetchHubs(); break;
        case 'communities': refetchCommunities(); break;
        case 'startups': refetchStartups(); break;
        case 'opportunities': refetchOpportunities(); break;
        case 'learning': refetchLearning(); break;
      }
    },
    onError: (error) => {
      toast.error(`Bulk delete failed: ${error.message}`);
    },
  });

  const handleDelete = (id: number, type: string) => {
    switch (type) {
      case 'blogs': deleteBlogMutation.mutate(id); break;
      case 'forums': deleteForumMutation.mutate(id); break;
      case 'events': deleteEventMutation.mutate(id); break;
      case 'jobs': deleteJobMutation.mutate(id); break;
      case 'gigs': deleteGigMutation.mutate(id); break;
      case 'hubs': deleteHubMutation.mutate(id); break;
      case 'communities': deleteCommunityMutation.mutate(id); break;
      case 'startups': deleteStartupMutation.mutate(id); break;
      case 'opportunities': deleteOpportunityMutation.mutate(id); break;
      case 'learning': deleteLearningMutation.mutate(id); break;
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    
    const contentTypeMap: Record<typeof contentType, string> = {
      blogs: 'blog_posts',
      forums: 'forum_threads',
      events: 'events',
      jobs: 'jobs',
      gigs: 'gigs',
      hubs: 'hubs',
      communities: 'communities',
      startups: 'startups',
      opportunities: 'opportunities',
      learning: 'learning_resources',
    };

    bulkDeleteMutation.mutate({
      contentType: contentTypeMap[contentType] as any,
      ids: selectedItems,
    });
  };

  const handleApprove = (blogPost: any) => {
    setSelectedBlogPost(blogPost);
    setApprovalDialogOpen(true);
  };

  const handleReject = (blogPost: any) => {
    setSelectedBlogPost(blogPost);
    setRejectionDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedBlogPost) {
      approveBlogMutation.mutate({
        id: selectedBlogPost.id,
        reason: "Approved by Core Admin",
      });
    }
  };

  const confirmReject = () => {
    if (selectedBlogPost && rejectionReason.trim()) {
      rejectBlogMutation.mutate({
        id: selectedBlogPost.id,
        reason: rejectionReason,
      });
    } else {
      toast.error("Please provide a reason for rejection");
    }
  };

  // Get current data based on content type
  const getCurrentData = () => {
    switch (contentType) {
      case 'blogs': return blogs || [];
      case 'forums': return forums || [];
      case 'events': return events || [];
      case 'jobs': return jobs || [];
      case 'gigs': return gigs || [];
      case 'hubs': return hubs || [];
      case 'communities': return communities || [];
      case 'startups': return startups || [];
      case 'opportunities': return opportunities || [];
      case 'learning': return learning || [];
      default: return [];
    }
  };

  const currentData = getCurrentData();
  const filteredData = currentData.filter((item: any) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count pending items
  const pendingCount = currentData.filter((item: any) => item.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Content Management - Full CRUD Access</h3>
          <p className="text-sm text-muted-foreground">
            {filteredData.length} items total {pendingCount > 0 && `• ${pendingCount} pending approval`}
          </p>
        </div>
        <Badge variant="outline">{filteredData.length} Items</Badge>
      </div>

      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(v) => {
        setContentType(v as any);
        setSelectedItems([]);
      }}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="blogs">
            Blogs ({blogs?.length || 0})
            {(blogs?.filter((b: any) => b.status === 'pending').length || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {blogs?.filter((b: any) => b.status === 'pending').length || 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="forums">Forums ({forums?.length || 0})</TabsTrigger>
          <TabsTrigger value="events">Events ({events?.length || 0})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs?.length || 0})</TabsTrigger>
          <TabsTrigger value="gigs">Gigs ({gigs?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="hubs">Hubs ({hubs?.length || 0})</TabsTrigger>
          <TabsTrigger value="communities">Communities ({communities?.length || 0})</TabsTrigger>
          <TabsTrigger value="startups">Startups ({startups?.length || 0})</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities ({opportunities?.length || 0})</TabsTrigger>
          <TabsTrigger value="learning">Learning ({learning?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Search and Actions */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedItems.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedItems.length} items?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the selected items. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Content List */}
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No {contentType} found</p>
            </Card>
          ) : (
            filteredData.map((item: any) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{item.title || item.name}</p>
                      {item.status && (
                        <Badge variant={
                          item.status === 'published' || item.status === 'approved' ? 'default' :
                          item.status === 'pending' ? 'secondary' :
                          'outline'
                        }>
                          {item.status}
                        </Badge>
                      )}
                      {item.featured && (
                        <Badge variant="default" className="bg-yellow-500">Featured</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(item.createdAt).toLocaleDateString()}
                      {item.authorId && ` • Author ID: ${item.authorId}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Blog-specific view button */}
                    {contentType === 'blogs' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedBlogPost(item);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    
                    {/* Blog-specific approval/rejection buttons */}
                    {contentType === 'blogs' && item.status === 'pending' && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(item)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleReject(item)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditDialogOpen(true);
                        toast.info("Edit functionality coming soon");
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{item.title || item.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id, contentType)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Tabs>

      {/* Blog Approval Dialog */}
      <AlertDialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Blog Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will publish "{selectedBlogPost?.title}" and send an approval email to the author.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve & Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blog Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Blog Post</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{selectedBlogPost?.title}". An email will be sent to the author.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection (required)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReject}
              disabled={!rejectionReason.trim()}
            >
              Reject & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blog View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBlogPost?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={
                  selectedBlogPost?.status === 'published' ? 'default' :
                  selectedBlogPost?.status === 'pending' ? 'secondary' :
                  'outline'
                }>
                  {selectedBlogPost?.status}
                </Badge>
                {selectedBlogPost?.featured && (
                  <Badge className="bg-yellow-500">Featured</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Created: {selectedBlogPost?.createdAt && new Date(selectedBlogPost.createdAt).toLocaleDateString()}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedBlogPost?.excerpt && (
              <div>
                <h4 className="font-semibold mb-2">Excerpt</h4>
                <p className="text-sm text-muted-foreground">{selectedBlogPost.excerpt}</p>
              </div>
            )}
            
            {selectedBlogPost?.category && (
              <div>
                <h4 className="font-semibold mb-2">Category</h4>
                <Badge variant="outline">{selectedBlogPost.category}</Badge>
              </div>
            )}
            
            {selectedBlogPost?.tags && selectedBlogPost.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBlogPost.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-semibold mb-2">Content</h4>
              <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/30">
                <div dangerouslySetInnerHTML={{ __html: selectedBlogPost?.content || 'No content' }} />
              </div>
            </div>

            {selectedBlogPost?.coverImage && (
              <div>
                <h4 className="font-semibold mb-2">Cover Image</h4>
                <img 
                  src={selectedBlogPost.coverImage} 
                  alt="Cover" 
                  className="w-full max-h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Author ID:</span> {selectedBlogPost?.authorId}
              </div>
              <div>
                <span className="font-semibold">Created:</span> {selectedBlogPost?.createdAt && new Date(selectedBlogPost.createdAt).toLocaleString()}
              </div>
              {selectedBlogPost?.publishedAt && (
                <div>
                  <span className="font-semibold">Published:</span> {new Date(selectedBlogPost.publishedAt).toLocaleString()}
                </div>
              )}
              {selectedBlogPost?.approvedBy && (
                <div>
                  <span className="font-semibold">Approved By:</span> User #{selectedBlogPost.approvedBy}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {selectedBlogPost?.status === 'pending' && (
              <>
                <Button 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleApprove(selectedBlogPost);
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleReject(selectedBlogPost);
                  }}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

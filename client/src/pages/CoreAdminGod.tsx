import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  Shield, 
  Users, 
  Settings, 
  Database,
  Activity,
  UserCheck,
  UserX,
  Crown,
  AlertTriangle,
  Trash2,
  Edit,
  Eye,
  BarChart3,
  FileText,
  MessageSquare,
  Calendar,
  Briefcase,
  Search,
  RefreshCw,
  Building2,
  Rocket,
  BookOpen,
  DollarSign,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Upload,
  Code
} from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CoreAdminGod() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sqlQuery, setSqlQuery] = useState("");
  
  // Fetch ALL data
  const { data: users, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();
  const { data: stats } = trpc.stats.getCounts.useQuery();
  const { data: roleHierarchy } = trpc.admin.getRoleHierarchy.useQuery();
  const { data: auditLog, refetch: refetchAuditLog } = trpc.admin.getRoleAuditLog.useQuery();
  const { data: pendingContent } = trpc.admin.getPendingContent.useQuery();
  
  // Fetch all content types
  const { data: blogPosts } = trpc.blog.list.useQuery({ status: undefined });
  const { data: forumThreads } = trpc.forum.listThreads.useQuery({});
  const { data: events } = trpc.events.list.useQuery({ status: undefined });
  const { data: jobs } = trpc.jobs.list.useQuery({ status: undefined });
  const { data: hubs } = trpc.hubs.list.useQuery({ status: undefined });
  const { data: communities } = trpc.communities.list.useQuery({ status: undefined });
  const { data: startups } = trpc.startups.list.useQuery({ status: undefined });
  const { data: opportunities } = trpc.opportunities.list.useQuery({ status: undefined });
  const { data: learningResources } = trpc.learning.list.useQuery({ status: undefined });
  
  // Mutations
  const assignRoleMutation = trpc.admin.assignRole.useMutation({
    onSuccess: () => {
      toast.success("Role assigned successfully");
      refetchUsers();
      refetchAuditLog();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`)
  });
  
  const deactivateUserMutation = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => {
      toast.success("User deactivated");
      refetchUsers();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`)
  });

  // Calculate totals
  const totalUsers = users?.length || 0;
  const totalContent = (blogPosts?.length || 0) + (forumThreads?.length || 0) + 
                      (events?.length || 0) + (jobs?.length || 0);
  const totalEcosystem = (hubs?.length || 0) + (communities?.length || 0) + (startups?.length || 0);
  const totalPending = (pendingContent?.events?.length || 0) + 
                       (pendingContent?.jobs?.length || 0) +
                       (pendingContent?.blogPosts?.length || 0);

  return (
    <ProtectedRoute requireRole="core_admin">
      <div className="min-h-screen bg-background">
        <div className="container py-8 max-w-[1600px]">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Crown className="h-10 w-10 text-yellow-500" />
                <div>
                  <h1 className="text-4xl font-bold text-foreground font-['Space_Grotesk']">
                    God Mode Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Complete platform control • Full database access • Ultimate authority
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  refetchUsers();
                  refetchAuditLog();
                  toast.success("All data refreshed");
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
            </div>
          </motion.div>

          {/* God Mode Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <Users className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
              <FileText className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-2xl font-bold">{blogPosts?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Blogs</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <MessageSquare className="h-6 w-6 text-purple-500 mb-2" />
              <p className="text-2xl font-bold">{forumThreads?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Threads</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
              <Calendar className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{events?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20">
              <Briefcase className="h-6 w-6 text-cyan-500 mb-2" />
              <p className="text-2xl font-bold">{jobs?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Jobs</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/20">
              <Building2 className="h-6 w-6 text-pink-500 mb-2" />
              <p className="text-2xl font-bold">{hubs?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Hubs</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
              <Rocket className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{startups?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Startups</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
              <Clock className="h-6 w-6 text-red-500 mb-2" />
              <p className="text-2xl font-bold">{totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </Card>
          </div>

          {/* Main Tabs */}
          <Card>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="database">Database</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        User Management
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>Total Users: <strong>{totalUsers}</strong></p>
                        <p>Core Admins: <strong>{users?.filter(u => u.role === 'core_admin').length || 0}</strong></p>
                        <p>Admins: <strong>{users?.filter(u => u.role === 'admin').length || 0}</strong></p>
                        <p>Moderators: <strong>{users?.filter(u => u.role === 'moderator').length || 0}</strong></p>
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab("users")}>
                        Manage Users →
                      </Button>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Content Overview
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>Blog Posts: <strong>{blogPosts?.length || 0}</strong></p>
                        <p>Forum Threads: <strong>{forumThreads?.length || 0}</strong></p>
                        <p>Events: <strong>{events?.length || 0}</strong></p>
                        <p>Jobs: <strong>{jobs?.length || 0}</strong></p>
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab("content")}>
                        Manage Content →
                      </Button>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Ecosystem
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p>Tech Hubs: <strong>{hubs?.length || 0}</strong></p>
                        <p>Communities: <strong>{communities?.length || 0}</strong></p>
                        <p>Startups: <strong>{startups?.length || 0}</strong></p>
                        <p>Total: <strong>{totalEcosystem}</strong></p>
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab("ecosystem")}>
                        Manage Ecosystem →
                      </Button>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <Card className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                    <h3 className="font-semibold mb-4">⚡ Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button variant="outline" onClick={() => setActiveTab("pending")}>
                        <Clock className="h-4 w-4 mr-2" />
                        Review Pending ({totalPending})
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab("database")}>
                        <Database className="h-4 w-4 mr-2" />
                        Query Database
                      </Button>
                      <Button variant="outline" onClick={() => setActiveTab("audit")}>
                        <Activity className="h-4 w-4 mr-2" />
                        View Audit Log
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Test Data
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete All Test Data?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all test content. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive"
                              onClick={() => toast.info("Test data deletion coming soon")}
                            >
                              Delete All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                </TabsContent>

                {/* Continue with other tabs... */}
                {/* I'll add the remaining tabs in the next parts */}
                
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

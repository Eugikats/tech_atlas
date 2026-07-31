import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  Edit3, 
  Star, 
  Eye, 
  TrendingUp,
  FileText,
  Calendar,
  Briefcase,
  BookOpen,
  Settings
} from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";

export default function Editor() {
  const [activeTab, setActiveTab] = useState("content");
  
  const { data: stats } = trpc.admin.getStats.useQuery();
  const { data: pendingContent } = trpc.admin.getPendingContent.useQuery();

  return (
    <ProtectedRoute requireRole="editor">
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-2">
              <Edit3 className="h-8 w-8 text-purple-500" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground font-['Space_Grotesk']">
                Editor Dashboard
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Content quality management and editorial oversight
            </p>
          </motion.div>

          {/* Editor Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-['Space_Grotesk'] flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Editorial Management
              </CardTitle>
              <CardDescription>
                Manage content quality and editorial standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="featured" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Featured
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Categories
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content">
                  <div className="space-y-6">
                    {/* Content Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="text-2xl font-bold">{stats?.events || 0}</p>
                            <p className="text-sm text-muted-foreground">Events</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-8 w-8 text-green-500" />
                          <div>
                            <p className="text-2xl font-bold">{stats?.jobs || 0}</p>
                            <p className="text-sm text-muted-foreground">Jobs</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-8 w-8 text-purple-500" />
                          <div>
                            <p className="text-2xl font-bold">{stats?.learningResources || 0}</p>
                            <p className="text-sm text-muted-foreground">Resources</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-orange-500" />
                          <div>
                            <p className="text-2xl font-bold">{stats?.blogPosts || 0}</p>
                            <p className="text-sm text-muted-foreground">Blog Posts</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Recent Content */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Recent Content for Review</h3>
                      <div className="space-y-3">
                        {pendingContent?.events?.slice(0, 3).map((event) => (
                          <Card key={event.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {event.type} • {event.category}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Pending</Badge>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="featured">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Featured Content Management</h3>
                      <Button>
                        <Star className="h-4 w-4 mr-2" />
                        Feature Content
                      </Button>
                    </div>
                    
                    <div className="text-center py-12">
                      <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Featured Content</h3>
                      <p className="text-muted-foreground mb-4">
                        Manage which content appears as featured on the platform
                      </p>
                      <Button variant="outline">
                        View Featured Items
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="categories">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Category Management</h3>
                      <Button>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Categories
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        'Frontend Development',
                        'Backend Development', 
                        'Mobile Development',
                        'Data Science',
                        'DevOps',
                        'UI/UX Design',
                        'Cybersecurity',
                        'AI/ML',
                        'Blockchain'
                      ].map((category) => (
                        <Card key={category} className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{category}</p>
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="analytics">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Content Performance</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <TrendingUp className="h-6 w-6 text-green-500" />
                          <h4 className="text-lg font-semibold">Top Performing</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Most viewed and engaged content
                        </p>
                        <Button variant="outline" className="w-full">
                          View Analytics
                        </Button>
                      </Card>

                      <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Eye className="h-6 w-6 text-blue-500" />
                          <h4 className="text-lg font-semibold">Content Insights</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Detailed content performance metrics
                        </p>
                        <Button variant="outline" className="w-full">
                          View Insights
                        </Button>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Globe, Github, Twitter, Linkedin, Share2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PublicProfile() {
  const [, params] = useRoute("/profile/:id");
  const userId = params?.id ? parseInt(params.id) : null;

  // Fetch public profile
  const { data: user, isLoading, error } = trpc.profiles.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              This profile doesn't exist or is set to private.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profiles">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to People Directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Private Profile</CardTitle>
            <CardDescription>
              This profile is set to private and cannot be viewed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profiles">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to People Directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8 flex items-center justify-between">
            <Link href="/profiles">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Directory
              </Button>
            </Link>
            <Button onClick={handleShare} variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share Profile
            </Button>
          </div>

          <div className="space-y-6">
            {/* Avatar and Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || "Profile"}
                        className="w-32 h-32 rounded-full object-cover border-4 border-border"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <User className="h-16 w-16 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold mb-2">{user.name || "Anonymous User"}</h1>
                    {user.location && (
                      <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mb-3">
                        <MapPin className="h-4 w-4" />
                        {user.location}
                      </p>
                    )}
                    <Badge variant="outline" className="mb-4">{user.role}</Badge>
                    {user.bio && (
                      <p className="text-lg mt-4 whitespace-pre-wrap">{user.bio}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {(user.website || user.github || user.twitter || user.linkedin) && (
              <Card>
                <CardHeader>
                  <CardTitle>Connect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.website && (
                    <a
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-blue-500 hover:text-blue-600 transition-colors p-2 hover:bg-accent rounded-md"
                    >
                      <Globe className="h-5 w-5" />
                      <span className="font-medium">Website</span>
                    </a>
                  )}
                  {user.github && (
                    <a
                      href={user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-blue-500 hover:text-blue-600 transition-colors p-2 hover:bg-accent rounded-md"
                    >
                      <Github className="h-5 w-5" />
                      <span className="font-medium">GitHub</span>
                    </a>
                  )}
                  {user.twitter && (
                    <a
                      href={user.twitter.startsWith('http') ? user.twitter : `https://twitter.com/${user.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-blue-500 hover:text-blue-600 transition-colors p-2 hover:bg-accent rounded-md"
                    >
                      <Twitter className="h-5 w-5" />
                      <span className="font-medium">Twitter/X</span>
                    </a>
                  )}
                  {user.linkedin && (
                    <a
                      href={user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-blue-500 hover:text-blue-600 transition-colors p-2 hover:bg-accent rounded-md"
                    >
                      <Linkedin className="h-5 w-5" />
                      <span className="font-medium">LinkedIn</span>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

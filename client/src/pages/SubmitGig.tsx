import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Briefcase, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const GIG_CATEGORIES = [
  "Web Development",
  "Mobile Development", 
  "UI/UX Design",
  "Graphic Design",
  "Content Writing",
  "Digital Marketing",
  "Data Analysis",
  "Consulting",
  "Other"
];

const CURRENCIES = ["UGX", "USD", "EUR", "GBP"];

export default function SubmitGig() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    category: "",
    budget: "",
    currency: "UGX",
    duration: "",
    location: "",
    remote: true,
    contactEmail: "",
    contactPhone: "",
    expiresAt: "",
  });

  const utils = trpc.useUtils();

  const createGig = trpc.gigs.create.useMutation({
    onSuccess: () => {
      toast.success("Gig posted successfully!", {
        description: "Your gig is now live and visible to potential freelancers.",
        duration: 5000,
      });
      // Invalidate and refetch gigs data
      utils.gigs.list.invalidate();
      setLocation("/jobs");
    },
    onError: (error) => {
      toast.error(`Failed to post gig: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!formData.contactEmail.trim()) {
      toast.error("Contact email is required");
      return;
    }

    createGig.mutate({
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements || undefined,
      category: formData.category || undefined,
      budget: formData.budget ? Number(formData.budget) : undefined,
      currency: formData.currency || undefined,
      duration: formData.duration || undefined,
      location: formData.location || undefined,
      remote: formData.remote,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone || undefined,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/jobs")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs & Gigs
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Post a Gig</h1>
          </div>
          <p className="text-muted-foreground">
            Find freelancers and contractors for your project
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Gig Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Build a mobile app for food delivery"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe your project, goals, and what you're looking for..."
                  rows={4}
                  required
                />
              </div>

              {/* Requirements */}
              <div>
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => handleInputChange("requirements", e.target.value)}
                  placeholder="Skills, experience, or qualifications needed..."
                  rows={3}
                />
              </div>

              {/* Category and Budget */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {GIG_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <div className="flex gap-2">
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => handleInputChange("budget", e.target.value)}
                      placeholder="Amount"
                      className="flex-1"
                    />
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Duration and Location */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Project Duration</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", e.target.value)}
                    placeholder="e.g., 2-3 weeks, 1 month"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Remote Work */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remote"
                  checked={formData.remote}
                  onCheckedChange={(checked) => handleInputChange("remote", checked as boolean)}
                />
                <Label htmlFor="remote">Remote work allowed</Label>
              </div>

              {/* Contact Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                    placeholder="+256 XXX XXX XXX"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <Label htmlFor="expiresAt">Application Deadline</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => handleInputChange("expiresAt", e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Anonymous Submission Notice */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Anonymous Submission:</strong> Your gig will appear immediately on the platform. 
                  Moderators will review and remove any inappropriate, duplicate, or irrelevant content.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit"
                  disabled={createGig.isPending}
                  className="flex-1"
                >
                  {createGig.isPending ? 'Posting...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Post Gig
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/jobs")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

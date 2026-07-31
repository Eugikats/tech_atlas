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

const JOB_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" }
];

const CURRENCIES = ["UGX", "USD", "EUR", "GBP"];

export default function SubmitJob() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    description: "",
    requirements: "",
    responsibilities: "",
    type: "full-time",
    location: "",
    remote: false,
    experienceLevel: "",
    salaryMin: "",
    salaryMax: "",
    currency: "UGX",
    applicationUrl: "",
    applicationEmail: "",
    expiresAt: "",
  });

  const utils = trpc.useUtils();

  const createJob = trpc.jobs.create.useMutation({
    onSuccess: () => {
      toast.success("Job posted successfully!", {
        description: "Your job posting is now live and visible to job seekers.",
        duration: 5000,
      });
      // Invalidate and refetch jobs data
      utils.jobs.list.invalidate();
      setLocation("/jobs");
    },
    onError: (error) => {
      toast.error(`Failed to post job: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Job title is required");
      return;
    }

    if (!formData.company.trim()) {
      toast.error("Company name is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Job description is required");
      return;
    }

    createJob.mutate({
      title: formData.title,
      company: formData.company,
      description: formData.description,
      requirements: formData.requirements || undefined,
      responsibilities: formData.responsibilities || undefined,
      type: formData.type as "full-time" | "part-time" | "internship" | "contract",
      location: formData.location || undefined,
      remote: formData.remote,
      experienceLevel: formData.experienceLevel || undefined,
      salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
      currency: formData.currency || undefined,
      applicationUrl: formData.applicationUrl || undefined,
      applicationEmail: formData.applicationEmail || undefined,
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
            <h1 className="text-3xl font-bold">Post a Job</h1>
          </div>
          <p className="text-muted-foreground">
            Find talented professionals for your team
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Title and Company */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Senior Software Developer"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Company name"
                    required
                  />
                </div>
              </div>

              {/* Job Description */}
              <div>
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
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
                  placeholder="Skills, qualifications, and experience required..."
                  rows={3}
                />
              </div>

              {/* Responsibilities */}
              <div>
                <Label htmlFor="responsibilities">Key Responsibilities</Label>
                <Textarea
                  id="responsibilities"
                  value={formData.responsibilities}
                  onChange={(e) => handleInputChange("responsibilities", e.target.value)}
                  placeholder="Main duties and responsibilities of the role..."
                  rows={3}
                />
              </div>

              {/* Job Type and Experience Level */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Job Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Input
                    id="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={(e) => handleInputChange("experienceLevel", e.target.value)}
                    placeholder="e.g., Entry Level, Mid-Level, Senior"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="City, Country"
                />
              </div>

              {/* Remote Work */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remote"
                  checked={formData.remote}
                  onCheckedChange={(checked) => handleInputChange("remote", checked as boolean)}
                />
                <Label htmlFor="remote">Remote work available</Label>
              </div>

              {/* Salary Range */}
              <div>
                <Label>Salary Range (Optional)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => handleInputChange("salaryMin", e.target.value)}
                    placeholder="Min"
                  />
                  <Input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => handleInputChange("salaryMax", e.target.value)}
                    placeholder="Max"
                  />
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                    <SelectTrigger>
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

              {/* Application Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="applicationEmail">Application Email</Label>
                  <Input
                    id="applicationEmail"
                    type="email"
                    value={formData.applicationEmail}
                    onChange={(e) => handleInputChange("applicationEmail", e.target.value)}
                    placeholder="careers@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="applicationUrl">Application URL</Label>
                  <Input
                    id="applicationUrl"
                    type="url"
                    value={formData.applicationUrl}
                    onChange={(e) => handleInputChange("applicationUrl", e.target.value)}
                    placeholder="https://company.com/careers/apply"
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
                  <strong>Anonymous Submission:</strong> Your job posting will appear immediately on the platform. 
                  Moderators will review and remove any inappropriate, duplicate, or irrelevant content.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit"
                  disabled={createJob.isPending}
                  className="flex-1"
                >
                  {createJob.isPending ? 'Posting...' : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Post Job
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

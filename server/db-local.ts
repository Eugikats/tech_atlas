// Local in-memory database for development when Supabase is not available
// This is a temporary solution for testing purposes

interface LocalEntity {
  id: number;
  name?: string;
  title?: string;
  slug: string;
  description?: string;
  location?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: string;
  createdAt: Date;
  [key: string]: any;
}

class LocalDatabase {
  private hubs: LocalEntity[] = [];
  private communities: LocalEntity[] = [];
  private startups: LocalEntity[] = [];
  private jobs: LocalEntity[] = [];
  private gigs: LocalEntity[] = [];
  private events: LocalEntity[] = [];
  private learningResources: LocalEntity[] = [];
  private opportunities: LocalEntity[] = [];
  private nextId = 1;
  private initialized = false;

  // Sample data
  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    if (this.initialized) return; // Prevent re-initialization
    
    console.log('🗄️ Initializing local database with sample data...');
    
    // Add some sample hubs
    this.hubs = [
      {
        id: 1,
        name: "Outbox Hub",
        slug: "outbox-hub",
        description: "Uganda's premier technology hub fostering innovation and entrepreneurship",
        location: "Kampala",
        email: "info@outbox.co.ug",
        website: "https://outbox.co.ug",
        status: "approved",
        createdAt: new Date(),
        verified: true,
        focusAreas: ["Startups", "Innovation", "Technology"]
      },
      {
        id: 2,
        name: "Hive Colab",
        slug: "hive-colab",
        description: "East Africa's first technology hub supporting tech entrepreneurs",
        location: "Kampala",
        email: "info@hivecolab.org",
        website: "https://hivecolab.org",
        status: "approved",
        createdAt: new Date(),
        verified: true,
        focusAreas: ["Technology", "Entrepreneurship", "Innovation"]
      }
    ];

    // Add some sample communities
    this.communities = [
      {
        id: 1,
        name: "Python Uganda",
        slug: "python-uganda",
        description: "Uganda's Python programming community",
        location: "Kampala",
        email: "info@python.ug",
        website: "https://python.ug",
        status: "approved",
        createdAt: new Date(),
        verified: true,
        focusAreas: ["Python", "Programming", "Software Development"],
        type: "Programming Community"
      }
    ];

    // Add some sample startups
    this.startups = [
      {
        id: 1,
        name: "SafeBoda",
        slug: "safeboda",
        description: "On-demand motorcycle taxi service across Africa",
        location: "Kampala",
        email: "hello@safeboda.com",
        website: "https://safeboda.com",
        status: "approved",
        createdAt: new Date(),
        verified: true,
        focusAreas: ["Transportation", "Mobile App", "Logistics"],
        industry: "Transportation",
        stage: "Growth"
      }
    ];

    this.nextId = 10; // Start from 10 to avoid conflicts
    this.initialized = true;
    
    console.log(`✅ Local database initialized with ${this.hubs.length} hubs, ${this.communities.length} communities, ${this.startups.length} startups`);
  }

  // Hub operations
  createHub(data: any): LocalEntity {
    this.initializeSampleData(); // Ensure initialized
    
    const hub: LocalEntity = {
      id: this.nextId++,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      location: data.location || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      status: data.status || 'approved',
      createdAt: new Date(),
      verified: data.verified || false,
      focusAreas: data.focusAreas || [],
      address: data.address || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      logo: data.logo || null,
      createdBy: data.createdBy || 1,
      approvedBy: data.approvedBy || null,
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : null
    };
    
    this.hubs.push(hub);
    console.log('✅ Created hub locally:', hub.name, '- Total hubs:', this.hubs.length);
    return hub;
  }

  getHubs(filters?: { status?: string }): LocalEntity[] {
    this.initializeSampleData(); // Ensure initialized
    
    let result = [...this.hubs];
    
    if (filters?.status) {
      result = result.filter(h => h.status === filters.status);
    }
    
    console.log(`📋 Returning ${result.length} hubs (filtered by status: ${filters?.status || 'all'})`);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getHubBySlug(slug: string): LocalEntity | undefined {
    this.initializeSampleData(); // Ensure initialized
    const hub = this.hubs.find(h => h.slug === slug);
    console.log(`🔍 Looking for hub with slug "${slug}":`, hub ? 'Found' : 'Not found');
    return hub;
  }

  // Community operations
  createCommunity(data: any): LocalEntity {
    this.initializeSampleData(); // Ensure initialized
    
    const community: LocalEntity = {
      id: this.nextId++,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      location: data.location || null,
      email: data.email || null,
      website: data.website || null,
      status: data.status || 'approved',
      createdAt: new Date(),
      verified: data.verified || false,
      focusAreas: data.focusAreas || [],
      type: data.type || null,
      memberCount: data.memberCount || null,
      slack: data.slack || null,
      discord: data.discord || null,
      telegram: data.telegram || null,
      twitter: data.twitter || null,
      logo: data.logo || null,
      createdBy: data.createdBy || 1,
      approvedBy: data.approvedBy || null,
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : null
    };
    
    this.communities.push(community);
    console.log('✅ Created community locally:', community.name, '- Total communities:', this.communities.length);
    return community;
  }

  getCommunities(filters?: { status?: string }): LocalEntity[] {
    this.initializeSampleData(); // Ensure initialized
    
    let result = [...this.communities];
    
    if (filters?.status) {
      result = result.filter(c => c.status === filters.status);
    }
    
    console.log(`📋 Returning ${result.length} communities (filtered by status: ${filters?.status || 'all'})`);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getCommunityBySlug(slug: string): LocalEntity | undefined {
    this.initializeSampleData(); // Ensure initialized
    const community = this.communities.find(c => c.slug === slug);
    console.log(`🔍 Looking for community with slug "${slug}":`, community ? 'Found' : 'Not found');
    return community;
  }

  // Startup operations
  createStartup(data: any): LocalEntity {
    this.initializeSampleData(); // Ensure initialized
    
    const startup: LocalEntity = {
      id: this.nextId++,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      location: data.location || null,
      email: data.email || null,
      website: data.website || null,
      status: data.status || 'approved',
      createdAt: new Date(),
      verified: data.verified || false,
      focusAreas: data.focusAreas || [],
      industry: data.industry || null,
      stage: data.stage || null,
      founded: data.founded || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      teamSize: data.teamSize || null,
      twitter: data.twitter || null,
      linkedin: data.linkedin || null,
      logo: data.logo || null,
      createdBy: data.createdBy || 1,
      approvedBy: data.approvedBy || null,
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : null
    };
    
    this.startups.push(startup);
    console.log('✅ Created startup locally:', startup.name, '- Total startups:', this.startups.length);
    return startup;
  }

  getStartups(filters?: { status?: string }): LocalEntity[] {
    this.initializeSampleData(); // Ensure initialized
    
    let result = [...this.startups];
    
    if (filters?.status) {
      result = result.filter(s => s.status === filters.status);
    }
    
    console.log(`📋 Returning ${result.length} startups (filtered by status: ${filters?.status || 'all'})`);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getStartupBySlug(slug: string): LocalEntity | undefined {
    this.initializeSampleData(); // Ensure initialized
    const startup = this.startups.find(s => s.slug === slug);
    console.log(`🔍 Looking for startup with slug "${slug}":`, startup ? 'Found' : 'Not found');
    return startup;
  }

  // Debug method
  getStats() {
    this.initializeSampleData();
    return {
      hubs: this.hubs.length,
      communities: this.communities.length,
      startups: this.startups.length,
      jobs: this.jobs.length,
      gigs: this.gigs.length,
      events: this.events.length,
      learningResources: this.learningResources.length,
      opportunities: this.opportunities.length,
      blogPosts: 0,
      forumThreads: 0,
      nextId: this.nextId
    };
  }

  // Job operations
  createJob(data: any): LocalEntity {
    this.initializeSampleData();
    
    const job: LocalEntity = {
      id: this.nextId++,
      title: data.title,
      slug: data.slug,
      company: data.company,
      description: data.description || null,
      type: data.type,
      location: data.location || null,
      remote: data.remote || false,
      currency: data.currency || 'UGX',
      status: data.status || 'approved',
      createdAt: new Date(),
      createdBy: data.createdBy || 1,
      approvedBy: data.approvedBy || null,
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : null
    };
    
    this.jobs.push(job);
    console.log('✅ Created job locally:', job.title, '- Total jobs:', this.jobs.length);
    return job;
  }

  getJobs(filters?: { status?: string }): LocalEntity[] {
    this.initializeSampleData();
    
    let result = [...this.jobs];
    
    if (filters?.status) {
      result = result.filter(j => j.status === filters.status);
    }
    
    console.log(`📋 Returning ${result.length} jobs (filtered by status: ${filters?.status || 'all'})`);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getJobBySlug(slug: string): LocalEntity | undefined {
    this.initializeSampleData();
    const job = this.jobs.find(j => j.slug === slug);
    console.log(`🔍 Looking for job with slug "${slug}":`, job ? 'Found' : 'Not found');
    return job;
  }

  updateHub(id: number, data: Partial<LocalEntity>): LocalEntity {
    this.initializeSampleData();
    const hub = this.hubs.find(h => h.id === id);
    if (!hub) {
      throw new Error(`Hub with id ${id} not found`);
    }

    Object.assign(hub, data, {
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : hub.approvedAt,
    });

    return hub;
  }

  updateJob(id: number, data: Partial<LocalEntity>): LocalEntity {
    this.initializeSampleData();
    const job = this.jobs.find(j => j.id === id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }

    Object.assign(job, data, {
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : job.approvedAt,
    });

    return job;
  }

  // Gig operations
  createGig(data: any): LocalEntity {
    this.initializeSampleData();
    
    const gig: LocalEntity = {
      id: this.nextId++,
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      category: data.category || null,
      budget: data.budget || null,
      currency: data.currency || 'UGX',
      location: data.location || null,
      remote: data.remote || false,
      status: data.status || 'approved',
      createdAt: new Date(),
      createdBy: data.createdBy || 1,
      approvedBy: data.approvedBy || null,
      updatedAt: new Date(),
      approvedAt: data.status === 'approved' ? new Date() : null
    };
    
    this.gigs.push(gig);
    console.log('✅ Created gig locally:', gig.title, '- Total gigs:', this.gigs.length);
    return gig;
  }

  getGigs(filters?: { status?: string }): LocalEntity[] {
    this.initializeSampleData();
    
    let result = [...this.gigs];
    
    if (filters?.status) {
      result = result.filter(g => g.status === filters.status);
    }
    
    console.log(`📋 Returning ${result.length} gigs (filtered by status: ${filters?.status || 'all'})`);
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getGigBySlug(slug: string): LocalEntity | undefined {
    this.initializeSampleData();
    const gig = this.gigs.find(g => g.slug === slug);
    console.log(`🔍 Looking for gig with slug "${slug}":`, gig ? 'Found' : 'Not found');
    return gig;
  }
}

// Singleton instance
const localDB = new LocalDatabase();

export {
  localDB,
  type LocalEntity
};

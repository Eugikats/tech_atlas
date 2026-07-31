import { eq, and, or, like, desc, asc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  InsertUser, users,
  hubs, InsertHub, Hub,
  communities, InsertCommunity, Community,
  startups, InsertStartup, Startup,
  jobs, InsertJob, Job,
  gigs, InsertGig, Gig,
  learningResources, InsertLearningResource, LearningResource,
  forumThreads, InsertForumThread, ForumThread,
  forumReplies, InsertForumReply, ForumReply,
  forumVotes, InsertForumVote, ForumVote,
  events, InsertEvent, Event,
  opportunities, InsertOpportunity, Opportunity,
  blogPosts, InsertBlogPost, BlogPost
} from "../drizzle/schema-simple";
import { ENV } from './_core/env';

// Helper function to get or create anonymous user ID
async function getAnonymousUserId(db: any): Promise<number> {
  try {
    const anonymousUser = await db.select().from(users).where(eq(users.email, 'anonymous@techatlas.ug')).limit(1);
    
    if (anonymousUser.length === 0) {
      // Create anonymous user
      await db.insert(users).values({
        openId: 'anonymous-user',
        name: 'Anonymous User',
        email: 'anonymous@techatlas.ug',
        role: 'user',
        loginMethod: 'anonymous',
      });
      
      const newAnonymousUser = await db.select().from(users).where(eq(users.email, 'anonymous@techatlas.ug')).limit(1);
      return newAnonymousUser[0]?.id || 1;
    } else {
      return anonymousUser[0].id;
    }
  } catch (error) {
    console.warn('Could not create/find anonymous user, using ID 1:', error);
    return 1; // Fallback to user ID 1
  }
}

// Helper function to resolve createdBy for anonymous submissions
async function resolveCreatedBy(db: any, createdBy: number | null | undefined): Promise<number> {
  if (createdBy === 0 || createdBy === null || createdBy === undefined) {
    return await getAnonymousUserId(db);
  }
  return createdBy;
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log('[Database] Attempting to connect to Supabase...');
      const client = postgres(process.env.DATABASE_URL, {
        ssl: 'require',
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(client);
      console.log('[Database] Successfully connected to Supabase');
    } catch (error) {
      console.error("[Database] Failed to connect to Supabase:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER OPERATIONS =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "bio", "location", "website", "github", "twitter", "linkedin"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.skills !== undefined) {
      values.skills = user.skills;
      updateSet.skills = user.skills;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Error in getUserByOpenId:", error);
    throw error;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getPublicUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      bio: users.bio,
      skills: users.skills,
      location: users.location,
      website: users.website,
      github: users.github,
      twitter: users.twitter,
      linkedin: users.linkedin,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.isPublic, true))
    .orderBy(desc(users.createdAt));
  
  return result;
}

// ===== HUB OPERATIONS =====

export async function createHub(data: InsertHub) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating hub with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    focusAreas: data.focusAreas || null,
    location: data.location || null,
    address: data.address || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    email: data.email || null,
    phone: data.phone || null,
    website: data.website || null,
    logo: data.logo || null,
    verified: data.verified ?? false,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final hub data:', cleanData);
  
  try {
    const result = await db.insert(hubs).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getHubs(filters?: { status?: string; verified?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(hubs);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(hubs.status, filters.status as any));
  }
  if (filters?.verified !== undefined) {
    conditions.push(eq(hubs.verified, filters.verified));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(hubs.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getHubBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(hubs).where(eq(hubs.slug, slug)).limit(1);
  return result[0];
}

export async function updateHub(id: number, data: Partial<InsertHub>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hubs).set(data).where(eq(hubs.id, id));
}

export async function deleteHub(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hubs).where(eq(hubs.id, id));
}

// ===== COMMUNITY OPERATIONS =====

export async function createCommunity(data: InsertCommunity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating community with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    focusAreas: data.focusAreas || null,
    type: data.type || null,
    location: data.location || null,
    memberCount: data.memberCount || null,
    email: data.email || null,
    website: data.website || null,
    slack: data.slack || null,
    discord: data.discord || null,
    telegram: data.telegram || null,
    twitter: data.twitter || null,
    logo: data.logo || null,
    verified: data.verified ?? false,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final community data:', cleanData);
  
  try {
    const result = await db.insert(communities).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getCommunities(filters?: { status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(communities);
  
  if (filters?.status) {
    query = query.where(eq(communities.status, filters.status as any)) as any;
  }
  
  query = query.orderBy(desc(communities.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getCommunityBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
  return result[0];
}

export async function updateCommunity(id: number, data: Partial<InsertCommunity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(communities).set(data).where(eq(communities.id, id));
}

export async function deleteCommunity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(communities).where(eq(communities.id, id));
}

// ===== STARTUP OPERATIONS =====

export async function createStartup(data: InsertStartup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating startup with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    industry: data.industry || null,
    focusAreas: data.focusAreas || null,
    stage: data.stage || null,
    founded: data.founded || null,
    location: data.location || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    teamSize: data.teamSize || null,
    email: data.email || null,
    website: data.website || null,
    twitter: data.twitter || null,
    linkedin: data.linkedin || null,
    logo: data.logo || null,
    verified: data.verified ?? false,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final startup data:', cleanData);
  
  try {
    const result = await db.insert(startups).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getStartups(filters?: { status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(startups);
  
  if (filters?.status) {
    query = query.where(eq(startups.status, filters.status as any)) as any;
  }
  
  query = query.orderBy(desc(startups.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getStartupBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(startups).where(eq(startups.slug, slug)).limit(1);
  return result[0];
}

export async function updateStartup(id: number, data: Partial<InsertStartup>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(startups).set(data).where(eq(startups.id, id));
}

export async function deleteStartup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(startups).where(eq(startups.id, id));
}

// ===== JOB OPERATIONS =====

export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating job with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    title: data.title,
    slug: data.slug,
    company: data.company,
    description: data.description || null,
    requirements: data.requirements || null,
    responsibilities: data.responsibilities || null,
    type: data.type,
    location: data.location || null,
    remote: data.remote ?? false,
    skills: data.skills || null,
    experienceLevel: data.experienceLevel || null,
    salaryMin: data.salaryMin || null,
    salaryMax: data.salaryMax || null,
    currency: data.currency || 'UGX',
    applicationUrl: data.applicationUrl || null,
    applicationEmail: data.applicationEmail || null,
    featured: data.featured ?? false,
    expiresAt: data.expiresAt || null,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final job data:', cleanData);
  
  try {
    const result = await db.insert(jobs).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getJobs(filters?: { status?: string; type?: string; remote?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(jobs);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(jobs.status, filters.status as any));
  }
  if (filters?.type) {
    conditions.push(eq(jobs.type, filters.type as any));
  }
  if (filters?.remote !== undefined) {
    conditions.push(eq(jobs.remote, filters.remote));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(jobs.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getJobBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.slug, slug)).limit(1);
  return result[0];
}

export async function updateJob(id: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set(data).where(eq(jobs.id, id));
}

export async function deleteJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobs).where(eq(jobs.id, id));
}

// ===== GIG OPERATIONS =====

export async function createGig(data: InsertGig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating gig with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    requirements: data.requirements || null,
    category: data.category || null,
    budget: data.budget || null,
    currency: data.currency || 'UGX',
    duration: data.duration || null,
    skills: data.skills || null,
    remote: data.remote ?? true,
    location: data.location || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    featured: data.featured ?? false,
    expiresAt: data.expiresAt || null,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final gig data:', cleanData);
  
  try {
    const result = await db.insert(gigs).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getGigs(filters?: { status?: string; category?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(gigs);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(gigs.status, filters.status as any));
  }
  if (filters?.category) {
    conditions.push(eq(gigs.category, filters.category));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(gigs.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getGigBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gigs).where(eq(gigs.slug, slug)).limit(1);
  return result[0];
}

export async function updateGig(id: number, data: Partial<InsertGig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(gigs).set(data).where(eq(gigs.id, id));
}

export async function deleteGig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gigs).where(eq(gigs.id, id));
}

// ===== LEARNING RESOURCE OPERATIONS =====

export async function createLearningResource(data: InsertLearningResource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating learning resource with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    type: data.type || null,
    category: data.category || null,
    level: data.level || null,
    url: data.url || null,
    provider: data.provider || null,
    cost: data.cost || null,
    duration: data.duration || null,
    tags: data.tags || null,
    featured: data.featured ?? false,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final learning resource data:', cleanData);
  
  try {
    const result = await db.insert(learningResources).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getLearningResources(filters?: { status?: string; category?: string; level?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(learningResources);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(learningResources.status, filters.status as any));
  }
  if (filters?.category) {
    conditions.push(eq(learningResources.category, filters.category));
  }
  if (filters?.level) {
    conditions.push(eq(learningResources.level, filters.level));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(learningResources.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getLearningResourceBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(learningResources).where(eq(learningResources.slug, slug)).limit(1);
  return result[0];
}

export async function updateLearningResource(id: number, data: Partial<InsertLearningResource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(learningResources).set(data).where(eq(learningResources.id, id));
}

export async function deleteLearningResource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(learningResources).where(eq(learningResources.id, id));
}

// ===== EVENT OPERATIONS =====

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating event with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    type: data.type || null,
    category: data.category || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    location: data.location || null,
    address: data.address || null,
    virtual: data.virtual ?? false,
    meetingUrl: data.meetingUrl || null,
    registrationUrl: data.registrationUrl || null,
    organizer: data.organizer || null,
    organizerEmail: data.organizerEmail || null,
    capacity: data.capacity || null,
    tags: data.tags || null,
    imageUrl: data.imageUrl || null,
    featured: data.featured ?? false,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final event data:', cleanData);
  
  try {
    const result = await db.insert(events).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getEvents(filters?: { status?: string; type?: string; upcoming?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(events);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(events.status, filters.status as any));
  }
  if (filters?.type) {
    conditions.push(eq(events.type, filters.type));
  }
  if (filters?.upcoming) {
    conditions.push(gte(events.startDate, new Date()));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(events.startDate)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getEventBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return result[0];
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(events).where(eq(events.id, id));
}

// ===== OPPORTUNITY OPERATIONS =====

export async function createOpportunity(data: InsertOpportunity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  console.log('Creating opportunity with data:', data);
  
  // Clean the data to remove undefined values and ensure proper types
  const cleanData: any = {
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    type: data.type || null,
    category: data.category || null,
    provider: data.provider || null,
    amount: data.amount || null,
    currency: data.currency || 'USD',
    eligibility: data.eligibility || null,
    applicationUrl: data.applicationUrl || null,
    deadline: data.deadline || null,
    tags: data.tags || null,
    imageUrl: data.imageUrl || null,
    featured: data.featured ?? false,
    status: data.status || 'pending',
    createdBy: await resolveCreatedBy(db, data.createdBy),
    approvedBy: data.approvedBy || null,
  };
  
  // Remove any undefined values
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });
  
  console.log('Final opportunity data:', cleanData);
  
  try {
    const result = await db.insert(opportunities).values(cleanData);
    return result;
  } catch (error) {
    console.error('Database insert error:', error);
    throw error;
  }
}

export async function getOpportunities(filters?: { status?: string; type?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(opportunities);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(opportunities.status, filters.status as any));
  }
  if (filters?.type) {
    conditions.push(eq(opportunities.type, filters.type));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(opportunities.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getOpportunityBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(opportunities).where(eq(opportunities.slug, slug)).limit(1);
  return result[0];
}

export async function updateOpportunity(id: number, data: Partial<InsertOpportunity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(opportunities).set(data).where(eq(opportunities.id, id));
}

export async function deleteOpportunity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(opportunities).where(eq(opportunities.id, id));
}

// ===== BLOG POST OPERATIONS =====

export async function createBlogPost(data: InsertBlogPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(blogPosts).values(data).returning();
  return result;
}

export async function getBlogPosts(filters?: { status?: string; category?: string; authorId?: number; featured?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(blogPosts);
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(blogPosts.status, filters.status as any));
  }
  if (filters?.category) {
    conditions.push(eq(blogPosts.category, filters.category));
  }
  if (filters?.authorId) {
    conditions.push(eq(blogPosts.authorId, filters.authorId));
  }
  if (filters?.featured !== undefined) {
    conditions.push(eq(blogPosts.featured, filters.featured));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(blogPosts.publishedAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return result[0];
}

export async function updateBlogPost(id: number, data: Partial<InsertBlogPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogPosts).set(data).where(eq(blogPosts.id, id));
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

// ===== ADMIN & MODERATION HELPERS =====

export async function getPendingContent() {
  const db = await getDb();
  if (!db) return { hubs: [], communities: [], startups: [], jobs: [], gigs: [], learningResources: [], events: [], opportunities: [], blogPosts: [] };
  
  const [pendingHubs, pendingCommunities, pendingStartups, pendingJobs, pendingGigs, pendingResources, pendingEvents, pendingOpportunities, pendingBlogPosts] = await Promise.all([
    db.select().from(hubs).where(eq(hubs.status, 'pending')).orderBy(desc(hubs.createdAt)),
    db.select().from(communities).where(eq(communities.status, 'pending')).orderBy(desc(communities.createdAt)),
    db.select().from(startups).where(eq(startups.status, 'pending')).orderBy(desc(startups.createdAt)),
    db.select().from(jobs).where(eq(jobs.status, 'pending')).orderBy(desc(jobs.createdAt)),
    db.select().from(gigs).where(eq(gigs.status, 'pending')).orderBy(desc(gigs.createdAt)),
    db.select().from(learningResources).where(eq(learningResources.status, 'pending')).orderBy(desc(learningResources.createdAt)),
    db.select().from(events).where(eq(events.status, 'pending')).orderBy(desc(events.createdAt)),
    db.select().from(opportunities).where(eq(opportunities.status, 'pending')).orderBy(desc(opportunities.createdAt)),
    db.select().from(blogPosts).where(eq(blogPosts.status, 'pending')).orderBy(desc(blogPosts.createdAt)),
  ]);
  
  return {
    hubs: pendingHubs,
    communities: pendingCommunities,
    startups: pendingStartups,
    jobs: pendingJobs,
    gigs: pendingGigs,
    learningResources: pendingResources,
    events: pendingEvents,
    opportunities: pendingOpportunities,
    blogPosts: pendingBlogPosts,
  };
}

export async function getContentStats() {
  const db = await getDb();
  if (!db) return null;
  
  const [hubsCount, communitiesCount, startupsCount, jobsCount, gigsCount, resourcesCount, eventsCount, opportunitiesCount, blogPostsCount, forumThreadsCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(hubs).where(eq(hubs.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(communities).where(eq(communities.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(startups).where(eq(startups.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(gigs).where(eq(gigs.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(learningResources).where(eq(learningResources.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(events).where(eq(events.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.status, 'approved')),
    db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.status, 'published')),
    db.select({ count: sql<number>`count(*)` }).from(forumThreads),
  ]);
  
  return {
    hubs: hubsCount[0]?.count || 0,
    communities: communitiesCount[0]?.count || 0,
    startups: startupsCount[0]?.count || 0,
    jobs: jobsCount[0]?.count || 0,
    gigs: gigsCount[0]?.count || 0,
    learningResources: resourcesCount[0]?.count || 0,
    events: eventsCount[0]?.count || 0,
    opportunities: opportunitiesCount[0]?.count || 0,
    blogPosts: blogPostsCount[0]?.count || 0,
    forumThreads: forumThreadsCount[0]?.count || 0,
  };
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(users);
  return result;
}

// ===== ROLE MANAGEMENT =====

export async function getRoleHierarchy() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(sql`
      SELECT roleName, displayName, description, level, permissions, canAssignRoles
      FROM role_hierarchy
      ORDER BY level ASC
    `);
    return Array.from(result as unknown as any[]);
  } catch (error) {
    console.warn("Role hierarchy table not found, returning default roles:", error);
    // Return default role hierarchy if table doesn't exist
    return [
      { roleName: 'user', displayName: 'Community Member', level: 1 },
      { roleName: 'contributor', displayName: 'Content Contributor', level: 2 },
      { roleName: 'moderator', displayName: 'Content Moderator', level: 3 },
      { roleName: 'editor', displayName: 'Content Editor', level: 4 },
      { roleName: 'admin', displayName: 'Platform Administrator', level: 5 },
      { roleName: 'core_admin', displayName: 'Core Administrator', level: 6 },
    ];
  }
}

export async function getAllUsersWithRoles(filters?: { role?: string; isActive?: boolean; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [sql`1=1`];
    
    if (filters?.role) {
      conditions.push(sql`role = ${filters.role}`);
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(sql`isActive = ${filters.isActive}`);
    }

    const limit = filters?.limit ? sql` LIMIT ${filters.limit}` : sql``;
    const result = await db.execute(sql`
      SELECT id, name, email, role, isActive, roleAssignedAt, assignedBy, createdAt
      FROM users
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY createdAt DESC
      ${limit}
    `);
    return Array.from(result as unknown as any[]);
  } catch (error) {
    console.warn("Error fetching users with roles:", error);
    // Fallback to basic user query
    const result = await db.select().from(users);
    return result.map(user => ({
      ...user,
      isActive: true, // Default to active if column doesn't exist
    }));
  }
}

export async function logRoleChange(data: {
  userId: number;
  newRole: string;
  assignedBy: number;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current user data
  const currentUser = await getUserById(data.userId);
  if (!currentUser) throw new Error("User not found");

  try {
    await db.execute(sql`
      INSERT INTO role_audit_log (userId, previousRole, newRole, assignedBy, reason, createdAt)
      VALUES (${data.userId}, ${currentUser.role}, ${data.newRole}, ${data.assignedBy}, ${data.reason || null}, NOW())
    `);
  } catch (error) {
    console.warn("Could not log role change - audit table may not exist:", error);
  }

  return { success: true };
}

export async function updateUserRole(userId: number, newRole: string, assignedBy: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current user data
  const currentUser = await getUserById(userId);
  if (!currentUser) throw new Error("User not found");

  // Update user role
  await db.update(users).set({
    role: newRole as any,
  }).where(eq(users.id, userId));

  // Try to update additional role fields if they exist
  try {
    await db.execute(sql`
      UPDATE users SET 
        roleAssignedAt = NOW(),
        assignedBy = ${assignedBy}
      WHERE id = ${userId}
    `);
  } catch (error) {
    console.warn("Could not update role metadata - columns may not exist:", error);
  }

  // Log the role change
  await logRoleChange({
    userId,
    newRole,
    assignedBy,
    reason,
  });

  return { success: true };
}

// Alias for updateUserRole for consistency
export async function assignRole(userId: number, newRole: string, assignedBy: number, reason?: string) {
  return await updateUserRole(userId, newRole, assignedBy, reason);
}

export async function deactivateUser(userId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.execute(sql`
      UPDATE users SET isActive = false WHERE id = ${userId}
    `);
  } catch (error) {
    console.warn("Could not deactivate user - isActive column may not exist:", error);
    // For now, we could change their role to 'inactive' or similar
    await db.update(users).set({
      role: 'inactive' as any,
    }).where(eq(users.id, userId));
  }

  return { success: true };
}

export async function getRoleAuditLog(filters?: { userId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [sql`1=1`];
    
    if (filters?.userId) {
      conditions.push(sql`userId = ${filters.userId}`);
    }

    const limit = filters?.limit ? sql` LIMIT ${filters.limit}` : sql``;
    const result = await db.execute(sql`
      SELECT id, userId, previousRole, newRole, assignedBy, reason, createdAt
      FROM role_audit_log
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY createdAt DESC
      ${limit}
    `);
    return Array.from(result as unknown as any[]);
  } catch (error) {
    console.warn("Role audit log table not found:", error);
    return [];
  }
}

export async function getModerationLog(filters?: { moderatorId?: number; targetType?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [sql`1=1`];
    
    if (filters?.moderatorId) {
      conditions.push(sql`moderatorId = ${filters.moderatorId}`);
    }
    
    if (filters?.targetType) {
      conditions.push(sql`targetType = ${filters.targetType}`);
    }

    const limit = filters?.limit ? sql` LIMIT ${filters.limit}` : sql``;
    const result = await db.execute(sql`
      SELECT id, moderatorId, action, targetType, targetId, reason, metadata, createdAt
      FROM moderation_log
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY createdAt DESC
      ${limit}
    `);
    return Array.from(result as unknown as any[]);
  } catch (error) {
    console.warn("Moderation log table not found:", error);
    return [];
  }
}

export async function logModerationAction(data: {
  moderatorId: number;
  action: string;
  targetType: string;
  targetId: number;
  reason?: string;
  metadata?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.execute(sql`
      INSERT INTO moderation_log (moderatorId, action, targetType, targetId, reason, metadata, createdAt)
      VALUES (${data.moderatorId}, ${data.action}, ${data.targetType}, ${data.targetId}, ${data.reason || null}, ${JSON.stringify(data.metadata) || null}, NOW())
    `);
  } catch (error) {
    console.warn("Could not log moderation action - table may not exist:", error);
  }

  return { success: true };
}



// ===== Forum Functions =====

export async function getAllForumThreads(category?: string) {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    const result = await db.select().from(forumThreads)
      .where(eq(forumThreads.category, category as any))
      .orderBy(desc(forumThreads.lastActivityAt));
    return result;
  }
  
  const result = await db.select().from(forumThreads).orderBy(desc(forumThreads.lastActivityAt));
  return result;
}

export async function getForumThreadBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(forumThreads).where(eq(forumThreads.slug, slug)).limit(1);
  return result[0];
}

export async function createForumThread(thread: InsertForumThread) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(forumThreads).values(thread);
  return getForumThreadBySlug(thread.slug);
}

export async function updateForumThread(id: number, updates: Partial<InsertForumThread>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(forumThreads).set(updates).where(eq(forumThreads.id, id));
  return { success: true };
}

export async function deleteForumThread(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(forumThreads).where(eq(forumThreads.id, id));
  return { success: true };
}

export async function getForumRepliesByThreadId(threadId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(forumReplies).where(eq(forumReplies.threadId, threadId)).orderBy(asc(forumReplies.createdAt));
  return result;
}

export async function createForumReply(reply: InsertForumReply) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(forumReplies).values(reply);
  
  // Update thread reply count and last activity
  await db.update(forumThreads)
    .set({ 
      replyCount: sql`${forumThreads.replyCount} + 1`,
      lastActivityAt: new Date()
    })
    .where(eq(forumThreads.id, reply.threadId));
  
  const result = await db.select().from(forumReplies).where(eq(forumReplies.threadId, reply.threadId)).orderBy(desc(forumReplies.id)).limit(1);
  return result[0];
}

export async function voteOnForumContent(vote: InsertForumVote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already voted
  const existing = await db.select().from(forumVotes)
    .where(
      and(
        eq(forumVotes.userId, vote.userId),
        eq(forumVotes.targetType, vote.targetType),
        eq(forumVotes.targetId, vote.targetId)
      )
    ).limit(1);

  if (existing.length > 0) {
    // Update existing vote
    await db.update(forumVotes).set({ voteType: vote.voteType }).where(eq(forumVotes.id, existing[0].id));
  } else {
    // Create new vote
    await db.insert(forumVotes).values(vote);
  }

  // Update vote counts
  const votes = await db.select().from(forumVotes)
    .where(
      and(
        eq(forumVotes.targetType, vote.targetType),
        eq(forumVotes.targetId, vote.targetId)
      )
    );

  const upvotes = votes.filter(v => v.voteType === "up").length;
  const downvotes = votes.filter(v => v.voteType === "down").length;

  if (vote.targetType === "thread") {
    await db.update(forumThreads).set({ upvotes, downvotes }).where(eq(forumThreads.id, vote.targetId));
  } else {
    await db.update(forumReplies).set({ upvotes, downvotes }).where(eq(forumReplies.id, vote.targetId));
  }

  return { success: true, upvotes, downvotes };
}

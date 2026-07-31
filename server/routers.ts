import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { analyticsService } from "./_core/analytics";
import { emailService } from "./_core/email";
import * as db from "./db";
import * as dbSupabase from "./db-supabase";
import { localDB } from "./db-local";

// Helper to generate URL-friendly slugs
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const localForumThreads: any[] = [];
const localForumReplies: any[] = [];

// Role-based procedures
const moderatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowedRoles = ['moderator', 'editor', 'admin', 'core_admin'];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator access or higher required' });
  }
  return next({ ctx });
});

const editorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowedRoles = ['editor', 'admin', 'core_admin'];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Editor access or higher required' });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowedRoles = ['admin', 'core_admin'];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

const coreAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'core_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Core Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // User profile management
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        skills: z.array(z.string()).optional(),
        location: z.string().optional(),
        website: z.string().optional(),
        github: z.string().optional(),
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        isPublic: z.boolean().optional(),
        avatar: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Use Supabase client directly instead of Drizzle
        const { error } = await dbSupabase.supabase
          .from('users')
          .update({
            name: input.name,
            bio: input.bio,
            skills: input.skills,
            location: input.location,
            website: input.website,
            github: input.github,
            twitter: input.twitter,
            linkedin: input.linkedin,
            isPublic: input.isPublic,
            avatar: input.avatar,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', ctx.user.id);
        
        if (error) {
          console.error('[Profile] Update error:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to update profile: ${error.message}` 
          });
        }
        
        return { success: true };
      }),
    listPublicProfiles: publicProcedure.query(async () => {
      return await db.getPublicUsers();
    }),
  }),

  // Hub management
  hubs: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        verified: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching hubs with filters:', input);
        
        // Try primary database first
        try {
          console.log('📊 Trying primary database for hubs...');
          const primaryResult = await db.getHubs(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'hubs');
          
          if (primaryResult && primaryResult.length > 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Try Supabase client as fallback
        try {
          console.log('📊 Trying Supabase client for hubs...');
          const supabaseResult = await dbSupabase.getHubsSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'hubs');
          
          if (supabaseResult && supabaseResult.length > 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database as final fallback...');
        const localResult = localDB.getHubs(input);
        console.log('📊 Local database returned:', localResult?.length || 0, 'hubs');
        return localResult;
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getHubBySlug(input);
      }),
    
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        focusAreas: z.array(z.string()).optional(),
        location: z.string().optional(),
        address: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        logo: z.string().optional(),
        verified: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.name);
        const hubData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0,
          status: 'pending',
        };
        
        console.log('🏢 Creating hub:', hubData.name);
        
        // Try primary database first
        try {
          console.log('📊 Trying primary database for hub creation...');
          await db.createHub(hubData);
          const result = await db.getHubBySlug(slug);
          console.log('✅ Hub created in primary database:', result?.name);
          return result;
        } catch (primaryError) {
          console.warn('❌ Primary database failed for hub creation:', primaryError);
        }
        
        // Try Supabase client as fallback
        try {
          console.log('📊 Trying Supabase client for hub creation...');
          const result = await dbSupabase.createHubSupabase(hubData);
          console.log('✅ Hub created in Supabase:', result?.name);
          return result;
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed for hub creation:', supabaseError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for hub creation...');
        const result = localDB.createHub(hubData);
        console.log('✅ Hub created in local database:', result?.name);
        return result;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        focusAreas: z.array(z.string()).optional(),
        location: z.string().optional(),
        address: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        logo: z.string().optional(),
        verified: z.boolean().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        try {
          await db.updateHub(id, updateData);
          const updated = await db.getHubBySlug((await db.getHubs({ limit: 1 }))[0]?.slug || '');
          return updated;
        } catch (error) {
          console.warn('❌ Primary database failed for hub update, trying local database:', error);
          return localDB.updateHub(id, updateData);
        }
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteHub(input);
        return { success: true };
      }),
  }),

  // Community management
  communities: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching communities with filters:', input);
        
        // Try primary database first
        try {
          console.log('📊 Trying primary database for communities...');
          const primaryResult = await db.getCommunities(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'communities');
          
          if (primaryResult && primaryResult.length > 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Try Supabase client as fallback
        try {
          console.log('📊 Trying Supabase client for communities...');
          const supabaseResult = await dbSupabase.getCommunitiesSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'communities');
          
          if (supabaseResult && supabaseResult.length > 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for communities...');
        const localResult = localDB.getCommunities(input);
        console.log('📊 Local database returned:', localResult?.length || 0, 'communities');
        return localResult;
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getCommunityBySlug(input);
      }),
    
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        focusAreas: z.array(z.string()).optional(),
        type: z.string().optional(),
        location: z.string().optional(),
        memberCount: z.number().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        slack: z.string().optional(),
        discord: z.string().optional(),
        telegram: z.string().optional(),
        twitter: z.string().optional(),
        logo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.name);
        const communityData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0,
          status: 'pending',
        };
        
        console.log('👥 Creating community:', communityData.name);
        
        // Try primary database first
        try {
          console.log('📊 Trying primary database for community creation...');
          await db.createCommunity(communityData);
          const result = await db.getCommunityBySlug(slug);
          console.log('✅ Community created in primary database:', result?.name);
          return result;
        } catch (primaryError) {
          console.warn('❌ Primary database failed for community creation:', primaryError);
        }
        
        // Try Supabase client as fallback
        try {
          console.log('📊 Trying Supabase client for community creation...');
          const result = await dbSupabase.createCommunitySupabase(communityData);
          console.log('✅ Community created in Supabase:', result?.name);
          return result;
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed for community creation:', supabaseError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for community creation...');
        const result = localDB.createCommunity(communityData);
        console.log('✅ Community created in local database:', result?.name);
        return result;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        verified: z.boolean().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        await db.updateCommunity(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteCommunity(input);
        return { success: true };
      }),
  }),

  // Startup management
  startups: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching startups with filters:', input);
        
        // Try primary database first
        try {
          console.log('📊 Trying primary database for startups...');
          const primaryResult = await db.getStartups(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'startups');
          
          if (primaryResult && primaryResult.length > 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Try Supabase client as fallback
        try {
          console.log('📊 Trying Supabase client for startups...');
          const supabaseResult = await dbSupabase.getStartupsSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'startups');
          
          if (supabaseResult && supabaseResult.length > 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for startups...');
        const localResult = localDB.getStartups(input);
        console.log('📊 Local database returned:', localResult?.length || 0, 'startups');
        return localResult;
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getStartupBySlug(input);
      }),
    
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional(),
        focusAreas: z.array(z.string()).optional(),
        stage: z.string().optional(),
        founded: z.number().optional(),
        location: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        teamSize: z.number().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        logo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.name);
        const startupData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0,
          status: 'pending',
        };
        
        console.log('🚀 Creating startup:', startupData.name);
        
        // Try primary database first
        try {
          console.log('📊 Trying primary database for startup creation...');
          await db.createStartup(startupData);
          const result = await db.getStartupBySlug(slug);
          console.log('✅ Startup created in primary database:', result?.name);
          return result;
        } catch (primaryError) {
          console.warn('❌ Primary database failed for startup creation:', primaryError);
        }
        
        // Try Supabase client as fallback
        try {
          console.log('📊 Trying Supabase client for startup creation...');
          const result = await dbSupabase.createStartupSupabase(startupData);
          console.log('✅ Startup created in Supabase:', result?.name);
          return result;
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed for startup creation:', supabaseError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for startup creation...');
        const result = localDB.createStartup(startupData);
        console.log('✅ Startup created in local database:', result?.name);
        return result;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        verified: z.boolean().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        await db.updateStartup(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteStartup(input);
        return { success: true };
      }),
  }),

  // Job management
  jobs: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
        type: z.enum(['full-time', 'part-time', 'internship', 'contract']).optional(),
        remote: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching jobs with filters:', input);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for jobs...');
          const supabaseResult = await dbSupabase.getJobsSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'jobs');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for jobs...');
          const primaryResult = await db.getJobs(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'jobs');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for jobs...');
        const localResult = localDB.getJobs(input);
        console.log('📊 Local database returned:', localResult?.length || 0, 'jobs');
        return localResult;
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        try {
          return await db.getJobBySlug(input);
        } catch (error) {
          console.warn('❌ Failed to get job by slug, trying local:', error);
          return localDB.getJobBySlug(input);
        }
      }),
    
    create: publicProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string().optional(),
        company: z.string(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        responsibilities: z.string().optional(),
        type: z.enum(['full-time', 'part-time', 'internship', 'contract']),
        location: z.string().optional(),
        remote: z.boolean().optional(),
        skills: z.array(z.string()).optional(),
        experienceLevel: z.string().optional(),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        currency: z.string().optional(),
        applicationUrl: z.string().optional(),
        applicationEmail: z.string().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.title + '-' + input.company);
        const jobData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0, // Use 0 for anonymous submissions
          status: 'pending', // Public submissions require moderation
        };
        
        console.log('💼 Creating job:', jobData.title);
        
        // Try primary Supabase database first
        try {
          console.log('📊 Trying primary Supabase database for job creation...');
          await db.createJob(jobData);
          const result = await db.getJobBySlug(slug);
          if (result) {
            console.log('✅ Job created in PRIMARY SUPABASE database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY SUPABASE database failed for job creation:', primaryError);
        }
        
        // Try Supabase client as backup
        try {
          console.log('📊 Trying Supabase client for job creation...');
          const result = await dbSupabase.createJobSupabase(jobData);
          console.log('✅ Job created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for job creation:', supabaseError);
        }
        
        // Only use local database as absolute last resort
        console.warn('⚠️ USING LOCAL DATABASE - DATA WILL NOT BE PERSISTENT!');
        const result = localDB.createJob(jobData);
        console.log('✅ Job created in LOCAL database (NOT PERSISTENT):', result?.title);
        return result;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        try {
          await db.updateJob(id, updateData);
          return { id, ...updateData };
        } catch (error) {
          console.warn('❌ Primary database failed for job update, trying local database:', error);
          return localDB.updateJob(id, updateData);
        }
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteJob(input);
        return { success: true };
      }),
  }),

  // Gig management
  gigs: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'completed', 'expired']).optional(),
        category: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching gigs with filters:', input);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for gigs...');
          const supabaseResult = await dbSupabase.getGigsSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'gigs');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for gigs...');
          const primaryResult = await db.getGigs(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'gigs');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using local database for gigs...');
        const localResult = localDB.getGigs(input);
        console.log('📊 Local database returned:', localResult?.length || 0, 'gigs');
        return localResult;
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        try {
          return await db.getGigBySlug(input);
        } catch (error) {
          console.warn('❌ Failed to get gig by slug, trying local:', error);
          return localDB.getGigBySlug(input);
        }
      }),
    
    create: publicProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        category: z.string().optional(),
        budget: z.number().optional(),
        currency: z.string().optional(),
        duration: z.string().optional(),
        skills: z.array(z.string()).optional(),
        remote: z.boolean().optional(),
        location: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.title);
        const gigData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0, // Use 0 for anonymous submissions
          status: 'pending', // Public submissions require moderation
        };
        
        console.log('🎯 Creating gig:', gigData.title);
        
        // Try primary Supabase database first
        try {
          console.log('📊 Trying primary Supabase database for gig creation...');
          await db.createGig(gigData);
          const result = await db.getGigBySlug(slug);
          if (result) {
            console.log('✅ Gig created in PRIMARY SUPABASE database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY SUPABASE database failed for gig creation:', primaryError);
        }
        
        // Try Supabase client as backup
        try {
          console.log('📊 Trying Supabase client for gig creation...');
          const result = await dbSupabase.createGigSupabase(gigData);
          console.log('✅ Gig created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for gig creation:', supabaseError);
        }
        
        // Only use local database as absolute last resort
        console.warn('⚠️ USING LOCAL DATABASE - DATA WILL NOT BE PERSISTENT!');
        const result = localDB.createGig(gigData);
        console.log('✅ Gig created in LOCAL database (NOT PERSISTENT):', result?.title);
        return result;
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected', 'completed', 'expired']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        await db.updateGig(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteGig(input);
        return { success: true };
      }),
  }),

  // Learning resources
  learning: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        category: z.string().optional(),
        level: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching learning resources with filters:', input);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for learning resources...');
          const supabaseResult = await dbSupabase.getLearningResourcesSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'learning resources');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for learning resources...');
          const primaryResult = await db.getLearningResources(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'learning resources');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Use local database as final fallback
        console.log('⚠️ Using empty fallback for learning resources...');
        return [];
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        try {
          return await db.getLearningResourceBySlug(input);
        } catch (error) {
          console.warn('❌ Failed to get learning resource by slug:', error);
          return undefined;
        }
      }),
    
    create: publicProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        level: z.string().optional(),
        provider: z.string().optional(),
        url: z.string().optional(),
        cost: z.string().optional(),
        duration: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.title);
        const resourceData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0, // Use 0 for anonymous submissions
          status: 'pending', // Public submissions require moderation
        };
        
        console.log('📚 Creating learning resource:', resourceData.title);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for learning resource creation...');
          const result = await dbSupabase.createLearningResourceSupabase(resourceData);
          console.log('✅ Learning resource created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for learning resource creation:', supabaseError);
        }
        
        // Try primary Supabase database as backup
        try {
          console.log('📊 Trying primary Supabase database for learning resource creation...');
          await db.createLearningResource(resourceData);
          const result = await db.getLearningResourceBySlug(slug);
          if (result) {
            console.log('✅ Learning resource created in PRIMARY SUPABASE database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY SUPABASE database failed for learning resource creation:', primaryError);
        }
        
        // Return mock success response as final fallback
        console.warn('⚠️ USING MOCK RESPONSE - DATA WILL NOT BE PERSISTENT!');
        return {
          id: Date.now(),
          ...resourceData,
          createdAt: new Date(),
          updatedAt: new Date(),
          approvedAt: new Date(),
          featured: false,
          approvedBy: null,
        };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        await db.updateLearningResource(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteLearningResource(input);
        return { success: true };
      }),
  }),

  // Event management
  events: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        upcoming: z.boolean().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching events with filters:', input);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for events...');
          const supabaseResult = await dbSupabase.getEventsSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'events');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for events...');
          const primaryResult = await db.getEvents(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'events');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Use empty array as final fallback
        console.log('⚠️ Using empty fallback for events...');
        return [];
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        try {
          return await db.getEventBySlug(input);
        } catch (error) {
          console.warn('❌ Failed to get event by slug:', error);
          return undefined;
        }
      }),
    
    create: publicProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        location: z.string().optional(),
        address: z.string().optional(),
        virtual: z.boolean().optional(),
        meetingUrl: z.string().optional(),
        registrationUrl: z.string().optional(),
        organizer: z.string().optional(),
        organizerEmail: z.string().optional(),
        capacity: z.number().optional(),
        tags: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.title);
        const eventData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0, // Use 0 for anonymous submissions
          status: 'pending', // Public submissions require moderation
        };
        
        console.log('📅 Creating event:', eventData.title);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for event creation...');
          const result = await dbSupabase.createEventSupabase(eventData);
          console.log('✅ Event created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for event creation:', supabaseError);
        }
        
        // Try primary Supabase database as backup
        try {
          console.log('📊 Trying primary Supabase database for event creation...');
          await db.createEvent(eventData);
          const result = await db.getEventBySlug(slug);
          if (result) {
            console.log('✅ Event created in PRIMARY SUPABASE database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY SUPABASE database failed for event creation:', primaryError);
        }
        
        // Return mock success response as final fallback
        console.warn('⚠️ USING MOCK RESPONSE - DATA WILL NOT BE PERSISTENT!');
        return {
          id: Date.now(),
          ...eventData,
          createdAt: new Date(),
          updatedAt: new Date(),
          approvedAt: new Date(),
          featured: false,
          approvedBy: null,
        };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        await db.updateEvent(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteEvent(input);
        return { success: true };
      }),
  }),

  // Opportunity management
  opportunities: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        type: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching opportunities with filters:', input);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for opportunities...');
          const supabaseResult = await dbSupabase.getOpportunitiesSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'opportunities');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for opportunities...');
          const primaryResult = await db.getOpportunities(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'opportunities');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Use empty array as final fallback
        console.log('⚠️ Using empty fallback for opportunities...');
        return [];
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        try {
          return await db.getOpportunityBySlug(input);
        } catch (error) {
          console.warn('❌ Failed to get opportunity by slug:', error);
          return undefined;
        }
      }),
    
    create: publicProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        category: z.string().optional(),
        provider: z.string().optional(),
        amount: z.string().optional(),
        currency: z.string().optional(),
        eligibility: z.string().optional(),
        applicationUrl: z.string().optional(),
        deadline: z.date().optional(),
        tags: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.title);
        const opportunityData = {
          ...input,
          slug,
          createdBy: ctx.user?.id ?? 0, // Use 0 for anonymous submissions
          status: 'pending', // Public submissions require moderation
        };
        
        console.log('🎯 Creating opportunity:', opportunityData.title);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for opportunity creation...');
          const result = await dbSupabase.createOpportunitySupabase(opportunityData);
          console.log('✅ Opportunity created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for opportunity creation:', supabaseError);
        }
        
        // Try primary Supabase database as backup
        try {
          console.log('📊 Trying primary Supabase database for opportunity creation...');
          await db.createOpportunity(opportunityData);
          const result = await db.getOpportunityBySlug(slug);
          if (result) {
            console.log('✅ Opportunity created in PRIMARY SUPABASE database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY SUPABASE database failed for opportunity creation:', primaryError);
        }
        
        // Return mock success response as final fallback
        console.warn('⚠️ USING MOCK RESPONSE - DATA WILL NOT BE PERSISTENT!');
        return {
          id: Date.now(),
          ...opportunityData,
          createdAt: new Date(),
          updatedAt: new Date(),
          approvedAt: new Date(),
          featured: false,
          approvedBy: null,
        };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'approved') {
          updateData.approvedBy = ctx.user.id;
          updateData.approvedAt = new Date();
        }
        await db.updateOpportunity(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteOpportunity(input);
        return { success: true };
      }),
  }),

  // Blog management
  blog: router({
    list: publicProcedure
      .input(z.object({
        status: z.enum(['draft', 'pending', 'published', 'archived']).optional(),
        category: z.string().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching blog posts with filters:', input);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for blog posts...');
          const supabaseResult = await dbSupabase.getBlogPostsSupabase(input);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'blog posts');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for blog posts...');
          const primaryResult = await db.getBlogPosts(input);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'blog posts');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        // Use empty array as final fallback
        console.log('⚠️ Using empty fallback for blog posts...');
        return [];
      }),
    
    getBySlug: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getBlogPostBySlug(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        slug: z.string().optional(),
        excerpt: z.string().optional(),
        content: z.string(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        coverImage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = input.slug || generateSlug(input.title);
        
        console.log('📝 Creating blog post:', input.title);
        
        const blogData = {
          title: input.title,
          slug,
          excerpt: input.excerpt,
          content: input.content,
          category: input.category,
          tags: input.tags,
          coverImage: input.coverImage,
          authorId: ctx.user.id,
          createdBy: ctx.user.id,
          status: 'pending',
        };
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for blog post creation...');
          const result = await dbSupabase.createBlogPostSupabase(blogData);
          console.log('✅ Blog post created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for blog post creation:', supabaseError);
        }

        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for blog post creation...');
          const result = await db.createBlogPost(blogData);
          if (result) {
            console.log('✅ Blog post created in PRIMARY database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY database failed for blog post creation:', primaryError);
        }

        // Return mock success response as final fallback for local tests/dev.
        console.warn('⚠️ USING MOCK RESPONSE - BLOG POST WILL NOT BE PERSISTENT!');
        return {
          id: Date.now(),
          ...blogData,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          featured: false,
        };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['draft', 'pending', 'published', 'archived']).optional(),
        featured: z.boolean().optional(),
        publishedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.status === 'published' && !data.publishedAt) {
          updateData.publishedAt = new Date();
        }
        await db.updateBlogPost(id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.deleteBlogPost(input);
        return { success: true };
      }),
  }),

  // Public profiles directory
  profiles: router({
    list: publicProcedure.query(async () => {
      // Use Supabase to get only public users
      const { data, error } = await dbSupabase.supabase
        .from('users')
        .select('*')
        .eq('isPublic', true)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('[Profiles] Error fetching public profiles:', error);
        return [];
      }
      
      return data || [];
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        // Get user by ID (only if public)
        const { data, error } = await dbSupabase.supabase
          .from('users')
          .select('*')
          .eq('id', input.id)
          .single();
        
        if (error) {
          console.error('[Profiles] Error fetching profile:', error);
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });
        }
        
        return data;
      }),
  }),

  // Community forum
  forum: router({
    listThreads: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        console.log('🔍 Fetching forum threads with category:', input?.category);
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for forum threads...');
          const supabaseResult = await dbSupabase.getForumThreadsSupabase(input?.category);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'threads');
          
          if (supabaseResult && supabaseResult.length >= 0) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for forum threads...');
          const primaryResult = await db.getAllForumThreads(input?.category);
          console.log('📊 Primary database returned:', primaryResult?.length || 0, 'threads');
          
          if (primaryResult && primaryResult.length >= 0) {
            return primaryResult;
          }
        } catch (primaryError) {
          console.warn('❌ Primary database failed:', primaryError);
        }
        
        console.log('⚠️ Using local in-memory fallback for forum threads...');
        const localThreads = input?.category
          ? localForumThreads.filter(thread => thread.category === input.category)
          : localForumThreads;
        return [...localThreads].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }),
    
    getThread: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        console.log('🔍 Fetching forum thread by slug:', input.slug);
        
        // Try Supabase client first
        try {
          const supabaseResult = await dbSupabase.getForumThreadBySlugSupabase(input.slug);
          if (supabaseResult) {
            return supabaseResult;
          }
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          const primaryResult = await db.getForumThreadBySlug(input.slug);
          if (primaryResult) {
            return primaryResult;
          }
        } catch (error) {
          console.warn('❌ Failed to get forum thread by slug:', error);
        }

        return localForumThreads.find(thread => thread.slug === input.slug) || null;
      }),
    
    createThread: publicProcedure
      .input(z.object({
        title: z.string().min(5).max(500),
        content: z.string().min(10),
        category: z.enum(["general", "jobs", "events", "help", "showcase", "feedback"]),
        authorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const slug = generateSlug(input.title) + '-' + Date.now();
        
        console.log('💬 Creating forum thread:', input.title);
        
        const threadData = {
          ...input,
          slug,
          authorId: ctx.user?.id || null,
          authorName: input.authorName || ctx.user?.name || 'Anonymous',
        };
        
        // Try Supabase client first (most reliable)
        try {
          console.log('📊 Trying Supabase client for thread creation...');
          const result = await dbSupabase.createForumThreadSupabase(threadData);
          console.log('✅ Thread created in SUPABASE CLIENT:', result?.title);
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for thread creation:', supabaseError);
        }
        
        // Try primary Supabase database as backup
        try {
          console.log('📊 Trying primary Supabase database for thread creation...');
          const result = await db.createForumThread(threadData);
          if (result) {
            console.log('✅ Thread created in PRIMARY SUPABASE database:', result?.title);
            return result;
          }
        } catch (primaryError) {
          console.error('❌ PRIMARY SUPABASE database failed for thread creation:', primaryError);
        }
        
        console.warn('⚠️ USING LOCAL IN-MEMORY FORUM FALLBACK - DATA WILL NOT BE PERSISTENT!');
        const localThread = {
          id: Date.now(),
          ...threadData,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPinned: false,
          isLocked: false,
          viewCount: 0,
          replyCount: 0,
        };
        localForumThreads.push(localThread);
        return localThread;
      }),
    
    getReplies: publicProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ input }) => {
        console.log('🔍 Fetching forum replies for thread:', input.threadId);
        
        // Try Supabase client first
        try {
          console.log('📊 Trying Supabase client for forum replies...');
          const supabaseResult = await dbSupabase.getForumRepliesSupabase(input.threadId);
          console.log('📊 Supabase client returned:', supabaseResult?.length || 0, 'replies');
          return supabaseResult;
        } catch (supabaseError) {
          console.warn('❌ Supabase client failed:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          return await db.getForumRepliesByThreadId(input.threadId);
        } catch (error) {
          console.warn('❌ Failed to get forum replies:', error);
        }

        return localForumReplies
          .filter(reply => reply.threadId === input.threadId)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }),
    
    createReply: protectedProcedure
      .input(z.object({
        threadId: z.number(),
        content: z.string().min(1),
        parentReplyId: z.number().optional(),
        authorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log('💬 Creating forum reply for thread:', input.threadId);
        
        const replyData = {
          ...input,
          authorId: ctx.user.id,
          authorName: input.authorName || ctx.user.name || ctx.user.email?.split('@')[0] || 'User',
          parentReplyId: input.parentReplyId || null,
        };
        
        // Try Supabase client first
        try {
          console.log('📊 Trying Supabase client for reply creation...');
          const result = await dbSupabase.createForumReplySupabase(replyData);
          console.log('✅ Reply created in SUPABASE CLIENT');
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for reply creation:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for reply creation...');
          const result = await db.createForumReply(replyData);
          console.log('✅ Reply created in PRIMARY database');
          return result;
        } catch (primaryError) {
          console.error('❌ PRIMARY database failed for reply creation:', primaryError);
        }
        
        console.warn('⚠️ USING LOCAL IN-MEMORY REPLY FALLBACK - DATA WILL NOT BE PERSISTENT!');
        const localReply = {
          id: Date.now(),
          ...replyData,
          createdAt: new Date(),
          updatedAt: new Date(),
          upvotes: 0,
          downvotes: 0,
        };
        localForumReplies.push(localReply);
        const thread = localForumThreads.find(thread => thread.id === input.threadId);
        if (thread) {
          thread.replyCount = (thread.replyCount || 0) + 1;
          thread.updatedAt = new Date();
        }
        return localReply;
      }),
    
    vote: protectedProcedure
      .input(z.object({
        targetType: z.enum(["thread", "reply"]),
        targetId: z.number(),
        voteType: z.enum(["up", "down"]),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log('👍 Processing vote:', input);
        
        const voteData = {
          ...input,
          userId: ctx.user.id,
        };
        
        // Try Supabase client first
        try {
          console.log('📊 Trying Supabase client for voting...');
          const result = await dbSupabase.voteOnForumContentSupabase(voteData);
          console.log('✅ Vote processed in SUPABASE CLIENT');
          return result;
        } catch (supabaseError) {
          console.error('❌ SUPABASE CLIENT failed for voting:', supabaseError);
        }
        
        // Try primary database as backup
        try {
          console.log('📊 Trying primary database for voting...');
          const result = await db.voteOnForumContent(voteData);
          console.log('✅ Vote processed in PRIMARY database');
          return result;
        } catch (primaryError) {
          console.error('❌ PRIMARY database failed for voting:', primaryError);
        }
        
        console.warn('⚠️ Vote recorded locally only');
        const collection = input.targetType === 'thread' ? localForumThreads : localForumReplies;
        const target = collection.find(item => item.id === input.targetId);
        const column = input.voteType === 'up' ? 'upvotes' : 'downvotes';
        if (target) {
          target[column] = (target[column] || 0) + 1;
          target.updatedAt = new Date();
        }
        return { success: true, [column]: target?.[column] || 1 };
      }),
    
    updateThread: adminProcedure
      .input(z.object({
        id: z.number(),
        isPinned: z.boolean().optional(),
        isLocked: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateForumThread(id, updates);
      }),
    
    deleteThread: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteForumThread(input.id);
      }),
  }),

  // Dashboard statistics (public)
  stats: router({
    getCounts: publicProcedure.query(async () => {
      console.log('📊 Fetching platform statistics...');
      
      // Try primary database first
      try {
        const stats = await db.getContentStats();
        if (stats) {
          console.log('✅ Stats from primary database:', stats);
          return stats;
        }
      } catch (primaryError) {
        console.warn('❌ Primary database failed for stats:', primaryError);
      }
      
      // Try Supabase client as fallback
      try {
        console.log('📊 Trying Supabase client for stats...');
        const [
          hubsResult,
          communitiesResult,
          startupsResult,
          jobsResult,
          gigsResult,
          eventsResult,
          opportunitiesResult,
          learningResult
        ] = await Promise.all([
          dbSupabase.getHubsSupabase({ status: 'approved' }),
          dbSupabase.getCommunitiesSupabase({ status: 'approved' }),
          dbSupabase.getStartupsSupabase({ status: 'approved' }),
          dbSupabase.getJobsSupabase({ status: 'approved' }),
          dbSupabase.getGigsSupabase({ status: 'approved' }),
          dbSupabase.getEventsSupabase({ status: 'approved' }),
          dbSupabase.getOpportunitiesSupabase({ status: 'approved' }),
          dbSupabase.getLearningResourcesSupabase({ status: 'approved' })
        ]);
        
        const supabaseStats = {
          hubs: hubsResult?.length || 0,
          communities: communitiesResult?.length || 0,
          startups: startupsResult?.length || 0,
          jobs: jobsResult?.length || 0,
          gigs: gigsResult?.length || 0,
          events: eventsResult?.length || 0,
          opportunities: opportunitiesResult?.length || 0,
          learningResources: learningResult?.length || 0,
          blogPosts: 0, // Blog posts not implemented yet
          forumThreads: 0,
        };
        
        console.log('✅ Stats from Supabase client:', supabaseStats);
        return supabaseStats;
      } catch (supabaseError) {
        console.warn('❌ Supabase client failed for stats:', supabaseError);
      }
      
      // Use local database as final fallback
      console.log('⚠️ Using local database for stats...');
      const localStats = localDB.getStats();
      return {
        hubs: localStats.hubs,
        communities: localStats.communities,
        startups: localStats.startups,
        jobs: localStats.jobs,
        gigs: localStats.gigs,
        events: localStats.events,
        learningResources: localStats.learningResources,
        opportunities: localStats.opportunities,
        blogPosts: localStats.blogPosts,
        forumThreads: localStats.forumThreads,
      };
    }),

    // Debug endpoint to check database status
    debug: publicProcedure.query(async () => {
      const localStats = localDB.getStats();
      return {
        message: 'Database status check',
        localDatabase: localStats,
        timestamp: new Date().toISOString()
      };
    }),
  }),

  // Admin functions
  admin: router({
    // Moderator level - Content moderation
    getPendingContent: moderatorProcedure.query(async () => {
      return await db.getPendingContent();
    }),
    
    getStats: moderatorProcedure.query(async () => {
      const stats = await db.getContentStats();
      if (stats) {
        return stats;
      }

      const localStats = localDB.getStats();
      return {
        hubs: localStats.hubs,
        communities: localStats.communities,
        startups: localStats.startups,
        jobs: localStats.jobs,
        gigs: localStats.gigs,
        learningResources: localStats.learningResources,
        events: localStats.events,
        opportunities: localStats.opportunities,
        blogPosts: localStats.blogPosts,
        forumThreads: localStats.forumThreads,
      };
    }),

    getModerationLog: moderatorProcedure.query(async ({ ctx }) => {
      return await db.getModerationLog({ moderatorId: ctx.user.id, limit: 50 });
    }),

    logModerationAction: moderatorProcedure
      .input(z.object({
        action: z.string(),
        targetType: z.string(),
        targetId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.logModerationAction({
          moderatorId: ctx.user.id,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
        });
        return { success: true };
      }),

    // Admin level - User and platform management
    getRoleHierarchy: adminProcedure.query(async () => {
      return await db.getRoleHierarchy();
    }),

    getAllUsers: adminProcedure.query(async () => {
      return await db.getAllUsersWithRoles();
    }),

    assignRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        newRole: z.enum(['user', 'contributor', 'moderator', 'editor', 'admin', 'core_admin']),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if admin is trying to assign a role higher than their own
        const roleLevels = {
          'user': 1,
          'contributor': 2,
          'moderator': 3,
          'editor': 4,
          'admin': 5,
          'core_admin': 6
        };
        
        const adminLevel = roleLevels[ctx.user.role as keyof typeof roleLevels] || 0;
        const targetLevel = roleLevels[input.newRole];
        
        // Only core_admin can assign admin and core_admin roles
        if (ctx.user.role !== 'core_admin' && (input.newRole === 'admin' || input.newRole === 'core_admin')) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Only Core Admins can assign Admin or Core Admin roles' 
          });
        }
        
        // Admins cannot assign roles higher than their own
        if (targetLevel > adminLevel) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Cannot assign a role higher than your own' 
          });
        }
        
        await db.assignRole(input.userId, input.newRole, ctx.user.id, input.reason);
        return { success: true };
      }),

    deactivateUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Prevent deactivating yourself
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Cannot deactivate your own account' 
          });
        }
        
        await db.deactivateUser(input.userId, input.reason);
        return { success: true };
      }),

    getRoleAuditLog: adminProcedure.query(async () => {
      return await db.getRoleAuditLog({ limit: 100 });
    }),

    // Analytics dashboard
    getAnalytics: adminProcedure
      .input(z.object({
        period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
      }))
      .query(async ({ input }) => {
        const now = Date.now();
        const periodMs = {
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000,
        };
        
        const startAt = now - periodMs[input.period];
        
        return await analyticsService.getStats({
          startAt,
          endAt: now,
          unit: input.period === '7d' ? 'day' : 'day'
        });
      }),

    getTopPages: adminProcedure
      .input(z.object({
        period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
      }))
      .query(async ({ input }) => {
        const now = Date.now();
        const periodMs = {
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000,
        };
        
        const startAt = now - periodMs[input.period];
        
        return await analyticsService.getTopPages({
          startAt,
          endAt: now
        });
      }),

    sendTestEmail: adminProcedure
      .input(z.object({
        to: z.string().email(),
        type: z.enum(['welcome', 'approval']).optional().default('welcome'),
      }))
      .mutation(async ({ input }) => {
        if (input.type === 'welcome') {
          return await emailService.sendWelcomeEmail(input.to, 'Test User');
        } else {
          return await emailService.sendContentApprovalEmail(
            input.to, 
            'test content', 
            'Test Submission', 
            true
          );
        }
      }),

    // Core Admin Content Management - Full CRUD for all content types
    getAllBlogPosts: coreAdminProcedure.query(async () => {
      // Get ALL blog posts regardless of status
      try {
        const result = await dbSupabase.supabase
          .from('blog_posts')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all blog posts:', error);
        return [];
      }
    }),

    updateBlogPost: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        status: z.enum(['draft', 'pending', 'published', 'archived']).optional(),
        featured: z.boolean().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateBlogPost(id, updates);
        return { success: true };
      }),

    deleteBlogPost: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          // Use Supabase directly to avoid Drizzle issues
          const { error } = await dbSupabase.supabase
            .from('blog_posts')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete blog post:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete blog post: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    // Blog approval/rejection with email notifications
    approveBlogPost: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Get blog post details
          const { data: blogPost, error: fetchError } = await dbSupabase.supabase
            .from('blog_posts')
            .select('*, users!inner(email, name)')
            .eq('id', input.id)
            .single();

          if (fetchError || !blogPost) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
          }

          // Update status to published
          const { error: updateError } = await dbSupabase.supabase
            .from('blog_posts')
            .update({
              status: 'published',
              publishedAt: new Date().toISOString(),
              approvedBy: ctx.user.id,
              approvedAt: new Date().toISOString(),
            })
            .eq('id', input.id);

          if (updateError) throw updateError;

          // Send approval email to author
          try {
            const authorEmail = (blogPost as any).users?.email;
            const authorName = (blogPost as any).users?.name || 'Author';
            
            if (authorEmail) {
              await emailService.sendContentApprovalEmail(
                authorEmail,
                'blog post',
                blogPost.title,
                true,
                input.reason
              );
            }
          } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't fail the approval if email fails
          }

          return { success: true, message: 'Blog post approved and published' };
        } catch (error) {
          console.error('Failed to approve blog post:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to approve blog post' });
        }
      }),

    rejectBlogPost: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Get blog post details
          const { data: blogPost, error: fetchError } = await dbSupabase.supabase
            .from('blog_posts')
            .select('*, users!inner(email, name)')
            .eq('id', input.id)
            .single();

          if (fetchError || !blogPost) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Blog post not found' });
          }

          // Update status to rejected
          const { error: updateError } = await dbSupabase.supabase
            .from('blog_posts')
            .update({
              status: 'archived',
              approvedBy: ctx.user.id,
              approvedAt: new Date().toISOString(),
            })
            .eq('id', input.id);

          if (updateError) throw updateError;

          // Send rejection email to author
          try {
            const authorEmail = (blogPost as any).users?.email;
            const authorName = (blogPost as any).users?.name || 'Author';
            
            if (authorEmail) {
              await emailService.sendContentApprovalEmail(
                authorEmail,
                'blog post',
                blogPost.title,
                false,
                input.reason
              );
            }
          } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
            // Don't fail the rejection if email fails
          }

          return { success: true, message: 'Blog post rejected' };
        } catch (error) {
          console.error('Failed to reject blog post:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reject blog post' });
        }
      }),

    // Get blog post by ID with author details
    getBlogPostById: coreAdminProcedure
      .input(z.number())
      .query(async ({ input }) => {
        try {
          const { data, error } = await dbSupabase.supabase
            .from('blog_posts')
            .select('*, users!inner(id, email, name)')
            .eq('id', input)
            .single();

          if (error) throw error;
          return data;
        } catch (error) {
          console.error('Failed to get blog post:', error);
          return null;
        }
      }),

    getAllForumThreads: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('forum_threads')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all forum threads:', error);
        return [];
      }
    }),

    updateForumThread: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        isPinned: z.boolean().optional(),
        isLocked: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateForumThread(id, updates);
        return { success: true };
      }),

    deleteForumThread: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('forum_threads')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete forum thread:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllEvents: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('events')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all events:', error);
        return [];
      }
    }),

    updateEvent: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateEvent(id, updates);
        return { success: true };
      }),

    deleteEvent: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('events')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete event:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllJobs: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('jobs')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all jobs:', error);
        return [];
      }
    }),

    updateJob: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        company: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateJob(id, updates);
        return { success: true };
      }),

    deleteJob: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('jobs')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete job:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllGigs: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('gigs')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all gigs:', error);
        return [];
      }
    }),

    updateGig: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected', 'completed', 'expired']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateGig(id, updates);
        return { success: true };
      }),

    deleteGig: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('gigs')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete gig:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllHubs: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('hubs')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all hubs:', error);
        return [];
      }
    }),

    updateHub: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        verified: z.boolean().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateHub(id, updates);
        return { success: true };
      }),

    deleteHub: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('hubs')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete hub:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllCommunities: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('communities')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all communities:', error);
        return [];
      }
    }),

    updateCommunity: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        verified: z.boolean().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateCommunity(id, updates);
        return { success: true };
      }),

    deleteCommunity: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('communities')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete community:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllStartups: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('startups')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all startups:', error);
        return [];
      }
    }),

    updateStartup: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        verified: z.boolean().optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateStartup(id, updates);
        return { success: true };
      }),

    deleteStartup: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('startups')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete startup:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllOpportunities: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('opportunities')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all opportunities:', error);
        return [];
      }
    }),

    updateOpportunity: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateOpportunity(id, updates);
        return { success: true };
      }),

    deleteOpportunity: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('opportunities')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete opportunity:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    getAllLearningResources: coreAdminProcedure.query(async () => {
      try {
        const result = await dbSupabase.supabase
          .from('learning_resources')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (result.error) throw result.error;
        return result.data || [];
      } catch (error) {
        console.error('Failed to get all learning resources:', error);
        return [];
      }
    }),

    updateLearningResource: coreAdminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional(),
        featured: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateLearningResource(id, updates);
        return { success: true };
      }),

    deleteLearningResource: coreAdminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from('learning_resources')
            .delete()
            .eq('id', input);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Failed to delete learning resource:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }),

    // Get all pending content across all types
    getAllPendingContent: coreAdminProcedure.query(async () => {
      try {
        const [blogs, events, jobs, gigs, hubs, communities, startups, opportunities, learning] = await Promise.all([
          dbSupabase.supabase.from('blog_posts').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('events').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('jobs').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('gigs').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('hubs').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('communities').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('startups').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('opportunities').select('*').eq('status', 'pending'),
          dbSupabase.supabase.from('learning_resources').select('*').eq('status', 'pending'),
        ]);

        return {
          blogPosts: blogs.data || [],
          events: events.data || [],
          jobs: jobs.data || [],
          gigs: gigs.data || [],
          hubs: hubs.data || [],
          communities: communities.data || [],
          startups: startups.data || [],
          opportunities: opportunities.data || [],
          learningResources: learning.data || [],
        };
      } catch (error) {
        console.error('Failed to get pending content:', error);
        return {
          blogPosts: [],
          events: [],
          jobs: [],
          gigs: [],
          hubs: [],
          communities: [],
          startups: [],
          opportunities: [],
          learningResources: [],
        };
      }
    }),

    // Bulk approve content
    bulkApprove: coreAdminProcedure
      .input(z.object({
        contentType: z.enum(['blog_posts', 'events', 'jobs', 'gigs', 'hubs', 'communities', 'startups', 'opportunities', 'learning_resources']),
        ids: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from(input.contentType)
            .update({ status: 'approved', approvedAt: new Date().toISOString() })
            .in('id', input.ids);
          
          if (error) throw error;
          return { success: true, count: input.ids.length };
        } catch (error) {
          console.error('Bulk approve failed:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Bulk approve failed' });
        }
      }),

    // Bulk delete content
    bulkDelete: coreAdminProcedure
      .input(z.object({
        contentType: z.enum(['blog_posts', 'events', 'jobs', 'gigs', 'hubs', 'communities', 'startups', 'opportunities', 'learning_resources', 'forum_threads']),
        ids: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        try {
          const { error } = await dbSupabase.supabase
            .from(input.contentType)
            .delete()
            .in('id', input.ids);
          
          if (error) throw error;
          return { success: true, count: input.ids.length };
        } catch (error) {
          console.error('Bulk delete failed:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Bulk delete failed' });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

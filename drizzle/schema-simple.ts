import { integer, pgTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/pg-core";

/**
 * Simple schema that matches the varchar-based database tables
 * This avoids ENUM type conflicts
 */

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  bio: text("bio"),
  skills: json("skills").$type<string[]>(),
  categories: json("categories").$type<string[]>(),
  location: varchar("location", { length: 255 }),
  website: varchar("website", { length: 500 }),
  github: varchar("github", { length: 255 }),
  twitter: varchar("twitter", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  isPublic: boolean("isPublic").default(false).notNull(),
  avatar: varchar("avatar", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  type: varchar("type", { length: 100 }),
  category: varchar("category", { length: 100 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  location: varchar("location", { length: 255 }),
  address: text("address"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  virtual: boolean("virtual").default(false).notNull(),
  meetingUrl: varchar("meetingUrl", { length: 500 }),
  registrationUrl: varchar("registrationUrl", { length: 500 }),
  imageUrl: varchar("imageUrl", { length: 500 }),
  organizer: varchar("organizer", { length: 255 }),
  organizerEmail: varchar("organizerEmail", { length: 320 }),
  capacity: integer("capacity"),
  tags: json("tags").$type<string[]>(),
  featured: boolean("featured").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  company: varchar("company", { length: 255 }).notNull(),
  description: text("description"),
  requirements: text("requirements"),
  responsibilities: text("responsibilities"),
  type: varchar("type", { length: 20 }).notNull(),
  location: varchar("location", { length: 255 }),
  remote: boolean("remote").default(false).notNull(),
  skills: json("skills").$type<string[]>(),
  experienceLevel: varchar("experienceLevel", { length: 100 }),
  salaryMin: integer("salaryMin"),
  salaryMax: integer("salaryMax"),
  currency: varchar("currency", { length: 10 }).default("UGX"),
  applicationUrl: varchar("applicationUrl", { length: 500 }),
  applicationEmail: varchar("applicationEmail", { length: 320 }),
  featured: boolean("featured").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const opportunities = pgTable("opportunities", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  type: varchar("type", { length: 100 }),
  category: varchar("category", { length: 100 }),
  provider: varchar("provider", { length: 255 }),
  amount: varchar("amount", { length: 100 }),
  currency: varchar("currency", { length: 10 }),
  eligibility: text("eligibility"),
  applicationUrl: varchar("applicationUrl", { length: 500 }),
  deadline: timestamp("deadline"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  tags: json("tags").$type<string[]>(),
  featured: boolean("featured").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = typeof opportunities.$inferInsert;

export const hubs = pgTable("hubs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  focusAreas: json("focusAreas").$type<string[]>(),
  location: varchar("location", { length: 255 }),
  address: text("address"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  logo: varchar("logo", { length: 500 }),
  verified: boolean("verified").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Hub = typeof hubs.$inferSelect;
export type InsertHub = typeof hubs.$inferInsert;

export const communities = pgTable("communities", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  focusAreas: json("focusAreas").$type<string[]>(),
  type: varchar("type", { length: 100 }),
  location: varchar("location", { length: 255 }),
  memberCount: integer("memberCount"),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 500 }),
  slack: varchar("slack", { length: 500 }),
  discord: varchar("discord", { length: 500 }),
  telegram: varchar("telegram", { length: 500 }),
  twitter: varchar("twitter", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  verified: boolean("verified").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Community = typeof communities.$inferSelect;
export type InsertCommunity = typeof communities.$inferInsert;

export const startups = pgTable("startups", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  industry: varchar("industry", { length: 100 }),
  focusAreas: json("focusAreas").$type<string[]>(),
  stage: varchar("stage", { length: 100 }),
  founded: integer("founded"),
  location: varchar("location", { length: 255 }),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  teamSize: integer("teamSize"),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 500 }),
  twitter: varchar("twitter", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  verified: boolean("verified").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Startup = typeof startups.$inferSelect;
export type InsertStartup = typeof startups.$inferInsert;

// Add other tables as needed...
export const gigs = pgTable("gigs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  requirements: text("requirements"),
  category: varchar("category", { length: 100 }),
  budget: integer("budget"),
  currency: varchar("currency", { length: 10 }).default("UGX"),
  duration: varchar("duration", { length: 100 }),
  skills: json("skills").$type<string[]>(),
  remote: boolean("remote").default(true).notNull(),
  location: varchar("location", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  featured: boolean("featured").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type Gig = typeof gigs.$inferSelect;
export type InsertGig = typeof gigs.$inferInsert;

export const learningResources = pgTable("learning_resources", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  type: varchar("type", { length: 100 }),
  category: varchar("category", { length: 100 }),
  level: varchar("level", { length: 50 }),
  url: varchar("url", { length: 500 }),
  provider: varchar("provider", { length: 255 }),
  cost: varchar("cost", { length: 100 }),
  duration: varchar("duration", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  featured: boolean("featured").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type LearningResource = typeof learningResources.$inferSelect;
export type InsertLearningResource = typeof learningResources.$inferInsert;

export const blogPosts = pgTable("blog_posts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: varchar("coverImage", { length: 500 }),
  category: varchar("category", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  authorId: integer("authorId").notNull(),
  featured: boolean("featured").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  createdBy: integer("createdBy").notNull(),
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

export const forumThreads = pgTable("forum_threads", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  content: text("content").notNull(),
  category: varchar("category", { length: 20 }).default("general").notNull(),
  authorId: integer("authorId"),
  authorName: varchar("authorName", { length: 255 }),
  isPinned: boolean("isPinned").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  replyCount: integer("replyCount").default(0).notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
});

export type ForumThread = typeof forumThreads.$inferSelect;
export type InsertForumThread = typeof forumThreads.$inferInsert;

export const forumReplies = pgTable("forum_replies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  threadId: integer("threadId").notNull(),
  content: text("content").notNull(),
  authorId: integer("authorId"),
  authorName: varchar("authorName", { length: 255 }),
  parentReplyId: integer("parentReplyId"),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = typeof forumReplies.$inferInsert;

export const forumVotes = pgTable("forum_votes", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  targetType: varchar("targetType", { length: 10 }).notNull(),
  targetId: integer("targetId").notNull(),
  voteType: varchar("voteType", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumVote = typeof forumVotes.$inferSelect;
export type InsertForumVote = typeof forumVotes.$inferInsert;

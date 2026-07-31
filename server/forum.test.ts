import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "oauth",
    role: "user",
    bio: null,
    skills: null,
    categories: null,
    location: null,
    website: null,
    github: null,
    twitter: null,
    linkedin: null,
    isPublic: false,
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("forum", () => {
  it("lists all forum threads", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.forum.listThreads({ category: undefined });

    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a new forum thread", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const thread = await caller.forum.createThread({
      title: "Test Thread",
      content: "This is a test thread",
      category: "general",
    });

    expect(thread).toHaveProperty("id");
    expect(thread.title).toBe("Test Thread");
    expect(thread.category).toBe("general");
  });

  it("gets thread by ID with replies", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a thread first
    const thread = await caller.forum.createThread({
      title: "Thread for Detail Test",
      content: "Content for detail test",
      category: "general",
    });

    // Get the thread details
    const result = await caller.forum.getThread({ slug: thread.slug });

    expect(result).toHaveProperty("id");
    expect(result.id).toBe(thread.id);
    expect(result.title).toBe("Thread for Detail Test");
  });

  it("adds a reply to a thread", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a thread first
    const thread = await caller.forum.createThread({
      title: "Thread for Reply Test",
      content: "Content for reply test",
      category: "general",
    });

    // Add a reply
    const reply = await caller.forum.createReply({
      threadId: thread.id,
      content: "This is a test reply",
    });

    expect(reply).toHaveProperty("id");
    expect(reply.threadId).toBe(thread.id);
    expect(reply.content).toBe("This is a test reply");
  });

  it("upvotes a thread", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a thread first
    const thread = await caller.forum.createThread({
      title: "Thread for Upvote Test",
      content: "Content for upvote test",
      category: "general",
    });

    // Upvote the thread
    const result = await caller.forum.vote({
      targetType: "thread",
      targetId: thread.id,
      voteType: "up",
    });

    expect(result.success).toBe(true);
  });
});

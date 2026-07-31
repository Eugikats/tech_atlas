import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema-simple";
import { sdk } from "./sdk";
import { supabase } from "../db-supabase";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // First, try Supabase authentication
    const authHeader = opts.req.headers.authorization;
    console.log('[Auth] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[Auth] Validating Supabase token...');
      
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('[Auth] Supabase token validation error:', error.message);
      }
      
      if (!error && supabaseUser) {
        console.log('[Auth] Supabase user found:', supabaseUser.email);
        
        try {
          // Try to get user from database using Supabase client directly
          console.log('[Auth] Querying database for user with openId:', supabaseUser.id);
          
          const { data: existingUser, error: queryError } = await supabase
            .from('users')
            .select('*')
            .eq('openId', supabaseUser.id)
            .single();
          
          if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = not found
            console.error('[Auth] Database query error:', queryError);
          }
          
          if (existingUser) {
            console.log('[Auth] User found in database:', existingUser.email);
            user = existingUser as User;
          } else {
            console.log('[Auth] User not found, creating new user...');
            
            // Create new user
            const newUser = {
              openId: supabaseUser.id,
              name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || null,
              email: supabaseUser.email || null,
              loginMethod: 'supabase',
              role: 'user',
              isPublic: false,
              lastSignedIn: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            const { data: createdUser, error: insertError } = await supabase
              .from('users')
              .insert(newUser)
              .select()
              .single();
            
            if (insertError) {
              console.error('[Auth] Failed to create user:', insertError);
            } else {
              console.log('[Auth] User created successfully:', createdUser.email);
              user = createdUser as User;
            }
          }
        } catch (dbError) {
          console.error('[Auth] Database error:', dbError);
          // Don't throw - let it fall through to OAuth fallback
        }
      }
    }
    
    // Fallback to old OAuth authentication if Supabase auth failed
    if (!user) {
      console.log('[Auth] Trying OAuth fallback...');
      try {
        user = await sdk.authenticateRequest(opts.req);
      } catch (oauthError) {
        console.log('[Auth] OAuth fallback failed:', oauthError instanceof Error ? oauthError.message : 'Unknown error');
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log('[Auth] Authentication failed:', error instanceof Error ? error.message : 'Unknown error');
    user = null;
  }

  console.log('[Auth] Final user:', user ? user.email : 'null');
  
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

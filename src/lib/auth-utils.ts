import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { verifyToken } from './jwt-utils.js';

export async function getUserFromRequest(req: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    let user: any = null;
    console.log('[AUTH-UTILS] Verifying token...');

    // 1. Try verifying as custom JWT first
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      console.log('[AUTH-UTILS] Token decoded, fetching admin user...');
      const { data: { user: adminUser }, error: adminError } = await Promise.race([
        supabaseAdmin.auth.admin.getUserById(decoded.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Admin getUserById timeout')), 3000))
      ]) as any;
      if (adminUser && !adminError) {
        user = adminUser;
      }
    }

    // 2. Fallback to Supabase token verification if custom JWT didn't work
    if (!user) {
      console.log('[AUTH-UTILS] Verifying with Supabase auth...');
      const { data: { user: authUser }, error: authError } = await Promise.race([
        supabaseAdmin.auth.getUser(token),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase getUser timeout')), 3000))
      ]) as any;
      
      if (authUser && !authError) {
        user = authUser;
      }
    }

    if (!user) return null;

    console.log('[AUTH-UTILS] Checking if user is blocked...');
    // 3. Check if user is blocked in the profiles table (Single query for both cases)
    const { data: profile, error: profileError } = await Promise.race([
      supabaseAdmin.from('profiles').select('is_blocked, block_code, email').eq('id', user.id).single(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 3000))
    ]) as any;

    if (profileError) {
      console.warn('[AUTH-UTILS] Error fetching profile for block check:', profileError);
    }

    // Special bypass for the super owner email and roles
    const isSuperOwner = profile?.email === 'ongyuze1401@gmail.com' || 
                         profile?.email === 'admin@sleepsomno.com' ||
                         profile?.is_super_owner === true ||
                         profile?.role === 'super_owner' ||
                         profile?.role === 'owner';

    if (profile?.is_blocked && !isSuperOwner) {
      console.warn(`[AUTH-UTILS] Blocked user ${user.id} attempted to access API`);
      return null;
    }

    console.log('[AUTH-UTILS] User authenticated successfully.');
    return user;
  } catch (error) {
    console.error('[AUTH-UTILS] Unexpected error in getUserFromRequest:', error);
    return null;
  }
}

export async function requireUserFromRequest(req: any) {
  const user = await getUserFromRequest(req);
  if (!user) {
    // If we have a token but no user, it might be expired or blocked
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
       // We already checked block status in getUserFromRequest and returned null if blocked.
       // To provide a specific error message, we could re-check, but let's keep it simple for speed.
       throw new Error('Unauthorized: Authentication required or Account Blocked');
    }
    throw new Error('Unauthorized: Authentication required');
  }
  return user;
}

export async function isAdmin(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, is_super_owner')
    .eq('id', userId)
    .single();

  return profile?.role === 'admin' || profile?.is_super_owner;
}

export async function requireUserMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  console.log(`[AUTH-UTILS] Middleware starting for ${req.path}`);
  try {
    const user = await requireUserFromRequest(req);
    req.user = user;
    console.log(`[AUTH-UTILS] Middleware success for ${req.path} in ${Date.now() - start}ms`);
    next();
  } catch (error: any) {
    console.error(`[AUTH-UTILS] Middleware error for ${req.path} after ${Date.now() - start}ms:`, error);
    res.status(401).json({ error: error.message || 'Unauthorized' });
  }
}

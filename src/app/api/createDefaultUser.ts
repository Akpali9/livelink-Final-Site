import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key — server-only
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Create Auth user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'default@business.com',
      password: 'Password123!',
      email_confirm: true
    });

    if (userError) return res.status(500).json({ error: userError.message });

    // 2. Insert business record
    const { error: dbError } = await supabase
      .from('businesses')
      .insert({
        user_id: user.id,
        business_name: 'Default Business',
        created_at: new Date()
      });

    if (dbError) return res.status(500).json({ error: dbError.message });

    return res.status(200).json({ message: 'Default user created', user_id: user.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

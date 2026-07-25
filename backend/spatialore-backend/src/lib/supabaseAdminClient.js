import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://lvodmlfhbchogmkdgooy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn(
    '⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.'
  );
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY successfully loaded in supabaseAdminClient');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'dummy-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

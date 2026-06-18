// /src/lib/supabaseClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// Singleton Supabase client.
// Import this everywhere you need to query the database — never call
// createClient() a second time anywhere else in the codebase.
//
// Credentials are pulled from utils/supabase/info.tsx, which is the
// auto-generated file written by Figma Make when the Supabase project
// was connected. Do NOT hard-code the keys here; always import from that file.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

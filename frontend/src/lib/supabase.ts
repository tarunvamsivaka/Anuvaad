import { createClient } from "@supabase/supabase-js";

// NOTE: The anon key is PUBLIC by design (Supabase architecture).
// Row Level Security (RLS) policies enforce data access control.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lbqgvehjtbfkxawbznwd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicWd2ZWhqdGJma3hhd2J6bndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTA5ODAsImV4cCI6MjA5MTgyNjk4MH0.Qz8n3jrmnSFfhkLdyAqaQJVR-Yw1Mnr8Y_4QbaZy8vY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

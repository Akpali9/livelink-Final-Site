import { createClient } from "@supabase/supabase-js";

// 1️⃣ Supabase credentials
const supabaseUrl = "https://sivlvqpkgilbpvzuuwzc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdmx2cXBrZ2lsYnB2enV1d3pjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1OTY4NywiZXhwIjoyMDg4MDM1Njg3fQ.hQIyxNUkJbacJ9K2PW65YYVjHZQzTibcH9Hj6XR0nV4"; // must be service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAuthUsersToProfiles() {
  try {
    // 2️⃣ Get all Auth users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers(); // service role key required
    if (usersError) throw usersError;

    console.log(`Found ${users.length} users in Auth.`);

    // 3️⃣ Loop through users
    for (const user of users) {
      const userId = user.id;

      // 4️⃣ Check if user already has a profile
      const { data: existing, error: checkError } = await supabase
        .from("creator_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking profile for ${userId}:`, checkError);
        continue;
      }

      if (existing) {
        console.log(`User ${userId} already has a profile. Skipping.`);
        continue;
      }

      // 5️⃣ Insert default profile
      const fullName = user.user_metadata?.full_name || "Creator";
      const { data: newProfile, error: insertError } = await supabase
        .from("creator_profiles")
        .insert([
          {
            user_id: userId,
            full_name: fullName,
            avatar_url: "",
            bio: "",
            location: "",
            verified: false,
            category: "",
            niches: [],
          },
        ])
        .select()
        .maybeSingle();

      if (insertError) {
        console.error(`Error creating profile for ${userId}:`, insertError);
      } else {
        console.log(`Created profile for ${fullName} (${userId})`);
      }
    }

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

// Run the migration
migrateAuthUsersToProfiles();

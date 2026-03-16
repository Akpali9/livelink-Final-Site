import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role key)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = req.body.formData;
  const idFileUrl = req.body.idFileUrl;

  try {
    // 1️⃣ Create user in Supabase Auth
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true
    });
    if (userError) return res.status(400).json({ error: userError.message });

    // 2️⃣ Insert full business info
    const { error: dbError } = await supabaseAdmin.from("businesses").insert({
      user_id: user.id,
      full_name: form.fullName,
      job_title: form.jobTitle,
      phone_number: form.phoneNumber,
      phone_country_code: form.phoneCountryCode,
      business_name: form.businessName,
      business_type: form.businessType,
      industry: form.industry,
      description: form.description,
      website: form.website,
      socials: form.socials,
      country: form.country,
      city: form.city,
      postcode: form.postcode,
      operating_time: form.operatingTime,
      goals: form.goals,
      campaign_type: form.campaignType,
      budget: form.budget,
      age_min: form.ageMin,
      age_max: form.ageMax,
      gender: form.gender,
      target_location: form.targetLocation,
      referral: form.referral,
      agree_to_terms: form.agreeToTerms,
      government_id: idFileUrl,
      created_at: new Date()
    });
    if (dbError) return res.status(400).json({ error: dbError.message });

    res.status(200).json({ message: "User and business created!", user_id: user.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

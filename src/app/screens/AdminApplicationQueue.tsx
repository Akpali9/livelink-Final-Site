import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/contexts/AuthContext";
import { supabase } from "../lib/supabase";


interface Application {
  id: string;
  user_id: string;
  full_name: string;
  application_status: string;
  submitted_at: string;
  creator_platforms: Array<{
    platform_type: string;
    username: string;
    followers_count: number;
  }>;
  avg_concurrent: number;
}

export function AdminApplicationQueue() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select(`
          id,
          user_id,
          full_name,
          application_status,
          submitted_at,
          avg_concurrent,
          creator_platforms (
            platform_type,
            username,
            followers_count
          )
        `)
        .eq('application_status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, applicationId: string) => {
    try {
      const { error } = await supabase
        .from('creator_profiles')
        .update({ 
          application_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Update user metadata
      const { error: userError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { creator_status: 'approved' } }
      );

      if (userError) throw userError;

      // Remove from list
      setApplications(applications.filter(app => app.id !== applicationId));
      
    } catch (error) {
      console.error("Error approving application:", error);
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('creator_profiles')
        .update({ 
          application_status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      setApplications(applications.filter(app => app.id !== applicationId));
      
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1D1D1D]">
     
      <main className="p-8 max-w-[800px] mx-auto w-full">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-8">
          Pending Applications ({applications.length})
        </h1>
        
        {applications.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[#1D1D1D]/20">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
              No pending applications
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-[#F8F8F8] border-2 border-[#1D1D1D] p-6 flex flex-col gap-4 rounded-none">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg italic">{app.full_name}</h3>
                    <div className="flex gap-4 mt-2">
                      {app.creator_platforms?.map(platform => (
                        <p key={platform.platform_type} className="text-[10px] font-bold uppercase tracking-widest text-[#389C9A]">
                          {platform.platform_type} · {platform.followers_count || 0} followers
                        </p>
                      ))}
                    </div>
                    <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 mt-2">
                      Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[8px] font-black uppercase border border-[#1D1D1D]/10">
                    {app.avg_concurrent || 0} avg viewers
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(app.user_id, app.id)}
                    className="flex-1 bg-[#1D1D1D] text-white p-3 text-[10px] font-black uppercase tracking-widest italic border-2 border-[#1D1D1D] hover:bg-[#389C9A] transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(app.id)}
                    className="flex-1 border-2 border-[#1D1D1D] text-[#1D1D1D] p-3 text-[10px] font-black uppercase tracking-widest italic hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

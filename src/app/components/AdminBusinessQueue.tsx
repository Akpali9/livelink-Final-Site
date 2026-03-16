import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle2, XCircle, Eye, Download } from 'lucide-react';

export function AdminBusinessQueue() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          business_socials (*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      
      // Send approval email via edge function
      await supabase.functions.invoke('send-business-approval', {
        body: { 
          userId,
          email: userData?.user?.email 
        }
      });

      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving application:', error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ 
          status: 'rejected', 
          reviewed_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (error) throw error;
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error rejecting application:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">
          Business Applications
        </h1>
        <p className="text-[#1D1D1D]/60 mb-8">
          {applications.length} pending applications
        </p>

        <div className="grid grid-cols-1 gap-6">
          {applications.map(app => (
            <div key={app.id} className="border-2 border-[#1D1D1D] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight italic">
                    {app.business_name}
                  </h2>
                  <p className="text-[#389C9A] text-xs font-bold uppercase tracking-widest">
                    {app.industry} · {app.country}
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[10px] font-black uppercase">
                  Pending Review
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-[10px]">
                <div>
                  <span className="opacity-40 uppercase tracking-widest block">Contact</span>
                  <span className="font-bold uppercase">{app.full_name}</span>
                </div>
                <div>
                  <span className="opacity-40 uppercase tracking-widest block">Campaign</span>
                  <span className="font-bold uppercase">{app.campaign_type}</span>
                </div>
                <div>
                  <span className="opacity-40 uppercase tracking-widest block">Budget</span>
                  <span className="font-bold uppercase">{app.budget}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="px-4 py-2 border border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => window.open(app.id_verification_url, '_blank')}
                  className="px-4 py-2 border border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> View ID
                </button>
                <button
                  onClick={() => handleApprove(app.user_id)}
                  className="px-4 py-2 bg-[#1D1D1D] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => handleReject(app.user_id)}
                  className="px-4 py-2 border-2 border-red-500 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}

          {applications.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-[#1D1D1D]/20">
              <p className="text-[#1D1D1D]/40 text-sm font-bold uppercase tracking-widest">
                No pending applications
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic">
                Application Details
              </h3>
              <button onClick={() => setSelectedApp(null)}>
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  Business Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Name</p>
                    <p className="font-bold uppercase">{selectedApp.business_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Type</p>
                    <p className="font-bold uppercase">{selectedApp.business_type}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Industry</p>
                    <p className="font-bold uppercase">{selectedApp.industry}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Website</p>
                    <p className="font-bold uppercase">{selectedApp.website || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  Contact Person
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Name</p>
                    <p className="font-bold uppercase">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Job Title</p>
                    <p className="font-bold uppercase">{selectedApp.job_title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Phone</p>
                    <p className="font-bold uppercase">{selectedApp.phone_country_code} {selectedApp.phone_number}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  Campaign Goals
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.goals?.map((goal: string) => (
                    <span key={goal} className="px-2 py-1 bg-[#F8F8F8] text-[9px] font-black uppercase">
                      {goal}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                  Target Audience
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Age Range</p>
                    <p className="font-bold">{selectedApp.age_min} - {selectedApp.age_max}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Gender</p>
                    <p className="font-bold">{selectedApp.gender_target?.join(', ') || 'All'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Location</p>
                    <p className="font-bold">{selectedApp.target_location || 'Any'}</p>
                  </div>
                </div>
              </div>

              {selectedApp.business_socials?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    Social Media
                  </h4>
                  <div className="space-y-1">
                    {selectedApp.business_socials.map((social: any) => (
                      <div key={social.id} className="text-[10px]">
                        <span className="opacity-40">{social.platform}:</span>{' '}
                        <span className="font-bold">{social.handle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t-2">
              <button
                onClick={() => handleApprove(selectedApp.user_id)}
                className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest"
              >
                Approve Application
              </button>
              <button
                onClick={() => handleReject(selectedApp.user_id)}
                className="flex-1 border-2 border-red-500 text-red-500 py-4 text-[10px] font-black uppercase tracking-widest"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

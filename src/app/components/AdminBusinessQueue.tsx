import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, Eye, Download, Clock, Users, Briefcase, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessApplication {
  id: string;
  user_id: string;
  business_name: string;
  full_name: string;
  email: string;
  phone_number: string;
  industry: string;
  description: string | null;
  website: string | null;
  country: string;
  city: string | null;
  postcode: string | null;
  operating_since: string | null;
  verification_document_url: string | null;
  verification_status: string;
  application_status: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function AdminBusinessQueue() {
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<BusinessApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('businesses') // ✅ Fixed: correct table name
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'pending') {
          query = query.or(`status.eq.pending_review,application_status.eq.pending`);
        } else if (filter === 'approved') {
          query = query.or(`status.eq.active,application_status.eq.approved`);
        } else if (filter === 'rejected') {
          query = query.or(`status.eq.rejected,application_status.eq.rejected`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: BusinessApplication) => {
    setActionLoading(true);
    try {
      // Update business profile
      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'active',
          application_status: 'approved',
          verification_status: 'verified',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          business_approved: true,
          approved_at: new Date().toISOString()
        }
      });

      if (metadataError) console.error('Error updating metadata:', metadataError);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'business_approved',
        title: '🎉 Business Application Approved!',
        message: `Congratulations! Your business "${application.business_name}" has been approved. You can now start creating campaigns.`,
        data: { business_id: application.id },
        created_at: new Date().toISOString()
      });

      toast.success(`${application.business_name} approved successfully`);
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (application: BusinessApplication) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          status: 'rejected',
          application_status: 'rejected',
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'business_rejected',
        title: 'Application Update',
        message: `After review, your business application for "${application.business_name}" was not approved at this time.`,
        data: { business_id: application.id },
        created_at: new Date().toISOString()
      });

      toast.success(`${application.business_name} rejected`);
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (app: BusinessApplication) => {
    const status = app.application_status || app.status;
    
    switch(status) {
      case 'pending':
      case 'pending_review':
        return <span className="px-3 py-1 bg-[#FEDB71] text-[#1D1D1D] text-[9px] font-black uppercase rounded-full">Pending Review</span>;
      case 'approved':
      case 'active':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded-full">Rejected</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded-full">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic mb-2">
              Business Applications
            </h1>
            <p className="text-[#1D1D1D]/60 text-sm">
              {applications.length} {filter === 'all' ? 'total' : filter} applications
            </p>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 transition-colors ${
                  filter === tab
                    ? 'bg-[#1D1D1D] text-white border-[#1D1D1D]'
                    : 'bg-white text-[#1D1D1D]/40 border-[#1D1D1D]/10 hover:border-[#1D1D1D]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 gap-6">
          {applications.map(app => (
            <div key={app.id} className="border-2 border-[#1D1D1D] p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-black uppercase tracking-tight italic">
                      {app.business_name}
                    </h2>
                    {getStatusBadge(app)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#1D1D1D]/40">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {app.industry}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {app.city || app.country}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Applied {formatDate(app.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-[10px]">
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Contact</span>
                  <span className="font-black uppercase">{app.full_name}</span>
                  <span className="text-[8px] text-gray-500 block">{app.email}</span>
                </div>
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Phone</span>
                  <span className="font-black uppercase">{app.phone_number || 'Not provided'}</span>
                </div>
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Operating Since</span>
                  <span className="font-black uppercase">{app.operating_since || 'Not specified'}</span>
                </div>
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Verification</span>
                  <span className={`font-black uppercase ${app.verification_document_url ? 'text-green-600' : 'text-red-600'}`}>
                    {app.verification_document_url ? 'ID Uploaded' : 'No ID'}
                  </span>
                </div>
              </div>

              {app.description && (
                <p className="text-xs text-gray-600 mb-6 line-clamp-2">
                  {app.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedApp(app)}
                  className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                
                {app.verification_document_url && (
                  <a
                    href={app.verification_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> View ID
                  </a>
                )}

                {(app.status === 'pending_review' || app.application_status === 'pending') && (
                  <>
                    <button
                      onClick={() => handleApprove(app)}
                      disabled={actionLoading}
                      className="px-6 py-2 bg-[#1D1D1D] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(app)}
                      disabled={actionLoading}
                      className="px-6 py-2 border-2 border-red-500 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {applications.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-[#1D1D1D]/20 rounded-xl">
              <Briefcase className="w-12 h-12 text-[#1D1D1D]/20 mx-auto mb-4" />
              <p className="text-[#1D1D1D]/40 text-sm font-black uppercase tracking-widest">
                No {filter !== 'all' ? filter : ''} applications found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 rounded-xl">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic">
                {selectedApp.business_name}
              </h3>
              <button 
                onClick={() => setSelectedApp(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Business Information */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 border-b pb-1">
                  Business Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Business Name</p>
                    <p className="font-black uppercase">{selectedApp.business_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Industry</p>
                    <p className="font-black uppercase">{selectedApp.industry}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Location</p>
                    <p className="font-black uppercase">
                      {[selectedApp.city, selectedApp.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  {selectedApp.website && (
                    <div>
                      <p className="text-[9px] uppercase opacity-40">Website</p>
                      <a 
                        href={selectedApp.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-black uppercase text-[#389C9A] hover:underline"
                      >
                        {selectedApp.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 border-b pb-1">
                  Contact Person
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Name</p>
                    <p className="font-black uppercase">{selectedApp.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Email</p>
                    <p className="font-black uppercase">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Phone</p>
                    <p className="font-black uppercase">{selectedApp.phone_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedApp.description && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 border-b pb-1">
                    Business Description
                  </h4>
                  <p className="text-sm leading-relaxed">{selectedApp.description}</p>
                </div>
              )}

              {/* Verification Document */}
              {selectedApp.verification_document_url && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 border-b pb-1">
                    Verification Document
                  </h4>
                  <a
                    href={selectedApp.verification_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#1D1D1D] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" /> View ID Document
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(selectedApp.status === 'pending_review' || selectedApp.application_status === 'pending') && (
              <div className="flex gap-4 mt-8 pt-6 border-t-2">
                <button
                  onClick={() => handleApprove(selectedApp)}
                  disabled={actionLoading}
                  className="flex-1 bg-[#1D1D1D] text-white py-4 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#389C9A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Application
                </button>
                <button
                  onClick={() => handleReject(selectedApp)}
                  disabled={actionLoading}
                  className="flex-1 border-2 border-red-500 text-red-500 py-4 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject Application
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

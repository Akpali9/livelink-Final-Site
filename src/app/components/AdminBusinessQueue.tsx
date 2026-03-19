import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Download, 
  Clock, 
  Users, 
  Briefcase, 
  MapPin,
  Mail,
  Phone,
  Globe,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Square,
  User,
  Building2,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppHeader } from '../components/app-header';

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
  job_title?: string;
  approved_at?: string;
  rejected_at?: string;
}

export function AdminBusinessQueue() {
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<BusinessApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const getAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user);
    };
    getAdmin();
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [filter, searchTerm]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('businesses')
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

      if (searchTerm) {
        query = query.or(`business_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
      setSelectedItems([]);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const handleApprove = async (application: BusinessApplication) => {
    if (!confirm(`Approve ${application.business_name}?`)) return;
    
    setActionLoading(true);
    try {
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
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        application.user_id,
        {
          user_metadata: {
            business_approved: true,
            application_status: 'approved',
            approved_at: new Date().toISOString()
          }
        }
      );

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

      // Log admin action
      await supabase.from('admin_actions').insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: 'APPROVE_BUSINESS',
        resource_type: 'business',
        resource_id: application.id,
        details: { business_name: application.business_name },
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
    if (!confirm(`Reject ${application.business_name}?`)) return;
    
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

      // Update user metadata
      await supabase.auth.admin.updateUserById(
        application.user_id,
        {
          user_metadata: {
            application_status: 'rejected',
            rejected_at: new Date().toISOString()
          }
        }
      );

      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'business_rejected',
        title: 'Application Update',
        message: `After review, your business application for "${application.business_name}" was not approved at this time.`,
        data: { business_id: application.id },
        created_at: new Date().toISOString()
      });

      await supabase.from('admin_actions').insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: 'REJECT_BUSINESS',
        resource_type: 'business',
        resource_id: application.id,
        details: { business_name: application.business_name },
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

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!confirm(`Approve ${selectedItems.length} selected businesses?`)) return;
    
    setActionLoading(true);
    try {
      const { data: businesses, error: fetchError } = await supabase
        .from('businesses')
        .select('id, user_id, business_name')
        .in('id', selectedItems);

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('businesses')
        .update({ 
          status: 'active',
          application_status: 'approved',
          verification_status: 'verified',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', selectedItems);

      if (updateError) throw updateError;

      for (const business of businesses || []) {
        await supabase.auth.admin.updateUserById(business.user_id, {
          user_metadata: {
            business_approved: true,
            approved_at: new Date().toISOString()
          }
        });

        await supabase.from('notifications').insert({
          user_id: business.user_id,
          type: 'business_approved',
          title: '🎉 Business Application Approved!',
          message: `Congratulations! Your business "${business.business_name}" has been approved.`,
          data: { business_id: business.id },
          created_at: new Date().toISOString()
        });
      }

      await supabase.from('admin_actions').insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: 'BULK_APPROVE_BUSINESSES',
        resource_type: 'businesses',
        details: { count: selectedItems.length, ids: selectedItems },
        created_at: new Date().toISOString()
      });

      toast.success(`✅ Approved ${selectedItems.length} businesses`);
      setSelectedItems([]);
      fetchApplications();
    } catch (error) {
      console.error('Error in bulk approve:', error);
      toast.error('Failed to approve selected businesses');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    if (!confirm(`Reject ${selectedItems.length} selected businesses?`)) return;
    
    setActionLoading(true);
    try {
      const { data: businesses, error: fetchError } = await supabase
        .from('businesses')
        .select('id, user_id, business_name')
        .in('id', selectedItems);

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('businesses')
        .update({ 
          status: 'rejected',
          application_status: 'rejected',
          verification_status: 'rejected',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', selectedItems);

      if (updateError) throw updateError;

      for (const business of businesses || []) {
        await supabase.from('notifications').insert({
          user_id: business.user_id,
          type: 'business_rejected',
          title: 'Application Update',
          message: `After review, your business application for "${business.business_name}" was not approved at this time.`,
          data: { business_id: business.id },
          created_at: new Date().toISOString()
        });
      }

      await supabase.from('admin_actions').insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        action_type: 'BULK_REJECT_BUSINESSES',
        resource_type: 'businesses',
        details: { count: selectedItems.length, ids: selectedItems },
        created_at: new Date().toISOString()
      });

      toast.success(`Rejected ${selectedItems.length} businesses`);
      setSelectedItems([]);
      fetchApplications();
    } catch (error) {
      console.error('Error in bulk reject:', error);
      toast.error('Failed to reject selected businesses');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === applications.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(applications.map(app => app.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (app: BusinessApplication) => {
    const status = app.application_status || app.status;
    
    switch(status) {
      case 'pending':
      case 'pending_review':
        return (
          <span className="px-3 py-1 bg-[#FEDB71]/20 text-[#1D1D1D] text-[9px] font-black uppercase rounded-full border border-[#FEDB71] flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'approved':
      case 'active':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-full border border-green-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded-full border border-red-200 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded-full">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'pending') {
      return app.status === 'pending_review' || app.application_status === 'pending';
    }
    if (filter === 'approved') {
      return app.status === 'active' || app.application_status === 'approved';
    }
    if (filter === 'rejected') {
      return app.status === 'rejected' || app.application_status === 'rejected';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1D1D1D] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading applications...</p>
        </div>
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
              {filteredApplications.length} {filter === 'all' ? 'total' : filter} applications
            </p>
          </div>
          
          <div className="flex gap-3">
            {selectedItems.length > 0 && (
              <>
                <button
                  onClick={handleBulkApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-500 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve {selectedItems.length}
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject {selectedItems.length}
                </button>
              </>
            )}
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border-2 border-[#1D1D1D]/10 focus:border-[#1D1D1D] outline-none text-sm rounded-lg w-64"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 border-2 border-[#1D1D1D]/10 hover:border-[#1D1D1D] rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#1D1D1D]/10">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-3 text-[9px] font-black uppercase tracking-widest transition-colors ${
                filter === tab
                  ? 'border-b-2 border-[#1D1D1D] text-[#1D1D1D]'
                  : 'text-gray-400 hover:text-[#1D1D1D]'
              }`}
            >
              {tab} ({applications.filter(a => {
                if (tab === 'pending') return a.status === 'pending_review' || a.application_status === 'pending';
                if (tab === 'approved') return a.status === 'active' || a.application_status === 'approved';
                if (tab === 'rejected') return a.status === 'rejected' || a.application_status === 'rejected';
                return true;
              }).length})
            </button>
          ))}
        </div>

        {/* Select All Bar - Only show for pending filter */}
        {filter === 'pending' && filteredApplications.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <button onClick={toggleSelectAll} className="flex items-center gap-2">
              {selectedItems.length === filteredApplications.length ? (
                <CheckSquare className="w-5 h-5 text-[#389C9A]" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-xs font-black uppercase tracking-widest">
                {selectedItems.length === filteredApplications.length ? "Deselect All" : "Select All Pending"}
              </span>
            </button>
            {selectedItems.length > 0 && (
              <span className="text-xs text-gray-500">
                {selectedItems.length} of {filteredApplications.length} selected
              </span>
            )}
          </div>
        )}

        {/* Applications Grid */}
        <div className="grid grid-cols-1 gap-6">
          {filteredApplications.map(app => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 p-6 rounded-xl hover:shadow-lg transition-shadow ${
                selectedItems.includes(app.id) 
                  ? 'border-[#389C9A] bg-[#389C9A]/5' 
                  : 'border-[#1D1D1D]'
              }`}
            >
              {filter === 'pending' && (
                <div className="flex items-start gap-3 mb-3">
                  <button
                    onClick={() => toggleSelectItem(app.id)}
                    className="mt-1"
                  >
                    {selectedItems.includes(app.id) ? (
                      <CheckSquare className="w-5 h-5 text-[#389C9A]" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1">
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
                      <Calendar className="w-3 h-3" />
                      Applied {formatDate(app.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-[10px]">
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Contact Person</span>
                  <span className="font-black uppercase">{app.full_name}</span>
                  {app.job_title && (
                    <span className="text-[8px] text-gray-500 block">{app.job_title}</span>
                  )}
                </div>
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Email</span>
                  <span className="font-black text-[#389C9A]">{app.email}</span>
                </div>
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Phone</span>
                  <span className="font-black uppercase">{app.phone_number || 'Not provided'}</span>
                </div>
                <div className="bg-[#F8F8F8] p-3 rounded-lg">
                  <span className="opacity-40 uppercase tracking-widest block mb-1">Verification</span>
                  <span className={`font-black uppercase flex items-center gap-1 ${
                    app.verification_document_url ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {app.verification_document_url ? '✅ ID Uploaded' : '❌ No ID'}
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
            </div>
          );
              )
              }

          {filteredApplications.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-[#1D1D1D]/20 rounded-xl">
              <Building2 className="w-12 h-12 text-[#1D1D1D]/20 mx-auto mb-4" />
              <p className="text-[#1D1D1D]/40 text-sm font-black uppercase tracking-widest">
                No {filter !== 'all' ? filter : ''} applications found
              </p>
              {searchTerm && (
                <p className="text-xs text-gray-400 mt-2">
                  Try adjusting your search terms
                </p>
              )}
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
                  {selectedApp.operating_since && (
                    <div>
                      <p className="text-[9px] uppercase opacity-40">Operating Since</p>
                      <p className="font-black uppercase">{selectedApp.operating_since}</p>
                    </div>
                  )}
                  {selectedApp.website && (
                    <div className="col-span-2">
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
                  {selectedApp.job_title && (
                    <div>
                      <p className="text-[9px] uppercase opacity-40">Job Title</p>
                      <p className="font-black uppercase">{selectedApp.job_title}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] uppercase opacity-40">Email</p>
                    <p className="font-black text-[#389C9A]">{selectedApp.email}</p>
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

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-[9px] text-gray-500">
                <div>
                  <p className="opacity-40">Submitted</p>
                  <p>{new Date(selectedApp.created_at).toLocaleString()}</p>
                </div>
                {selectedApp.approved_at && (
                  <div>
                    <p className="opacity-40">Approved</p>
                    <p>{new Date(selectedApp.approved_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
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

            {/* View Only for non-pending */}
            {(selectedApp.status !== 'pending_review' && selectedApp.application_status !== 'pending') && (
              <div className="mt-8 pt-6 border-t-2">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="w-full py-4 border-2 border-[#1D1D1D] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#1D1D1D] hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

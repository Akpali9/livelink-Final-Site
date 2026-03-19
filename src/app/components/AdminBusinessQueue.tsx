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

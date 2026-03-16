// src/app/hooks/useMessages.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at?: string;
  sender?: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export function useMessages(receiverId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user?.id && receiverId) {
      fetchMessages();
    }
  }, [user?.id, receiverId]);

  const fetchMessages = async () => {
    if (!user?.id || !receiverId) return;

    try {
      setLoading(true);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', receiverId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;

      if (messagesData && messagesData.length > 0) {
        // Get unique sender IDs
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];

        // Try to get sender info from profiles tables
        const senderProfiles: Record<string, any> = {};

        // Check creator_profiles first
        const { data: creators } = await supabase
          .from('creator_profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', senderIds);

        creators?.forEach(creator => {
          senderProfiles[creator.id] = creator;
        });

        // Check businesses for remaining IDs
        const remainingIds = senderIds.filter(id => !senderProfiles[id]);
        if (remainingIds.length > 0) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, business_name as full_name, email, logo_url as avatar_url')
            .in('id', remainingIds);

          businesses?.forEach(business => {
            senderProfiles[business.id] = business;
          });
        }

        // Combine messages with sender info
        const messagesWithSenders = messagesData.map(message => ({
          ...message,
          sender: senderProfiles[message.sender_id]
        }));

        setMessages(messagesWithSenders);
      } else {
        setMessages([]);
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, toUserId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          content,
          sender_id: user.id,
          receiver_id: toUserId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to messages list
      setMessages(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    refresh: fetchMessages,
    sendMessage
  };
}

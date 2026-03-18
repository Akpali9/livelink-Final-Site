// src/app/hooks/useMessages.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  attachments?: {
    url: string;
    type: string;
    name: string;
  }[];
  sender?: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    user_type?: 'creator' | 'business';
  };
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  participant1_type: 'creator' | 'business';
  participant2_type: 'creator' | 'business';
  campaign_id?: string;
  last_message_at: string;
  created_at: string;
  other_participant?: {
    id: string;
    full_name: string;
    avatar_url: string;
    user_type: 'creator' | 'business';
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

export function useMessages(conversationId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all conversations for the current user
  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
  }, [user?.id]);

  // Fetch messages for a specific conversation
  useEffect(() => {
    if (conversationId && user?.id) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [conversationId, user?.id]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if it's from other participant
          if (newMessage.sender_id !== user?.id) {
            markMessageAsRead(newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const fetchConversations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all conversations where user is a participant
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      if (conversationsData) {
        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conv) => {
            // Determine the other participant
            const otherParticipantId = conv.participant1_id === user.id
              ? conv.participant2_id
              : conv.participant1_id;
            
            const otherParticipantType = conv.participant1_id === user.id
              ? conv.participant2_type
              : conv.participant1_type;

            // Fetch participant details
            const table = otherParticipantType === 'creator' ? 'creator_profiles' : 'businesses';
            const { data: participantData } = await supabase
              .from(table)
              .select(otherParticipantType === 'creator' 
                ? 'id, full_name, avatar_url, email' 
                : 'id, business_name as full_name, logo_url as avatar_url, email'
              )
              .eq('user_id', otherParticipantId)
              .maybeSingle();

            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Get unread count
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('sender_id', otherParticipantId)
              .eq('is_read', false);

            return {
              ...conv,
              other_participant: {
                id: otherParticipantId,
                full_name: participantData?.full_name || 'Unknown',
                avatar_url: participantData?.avatar_url || participantData?.logo_url || '',
                user_type: otherParticipantType
              },
              last_message: lastMessage ? {
                content: lastMessage.content,
                created_at: lastMessage.created_at,
                sender_id: lastMessage.sender_id
              } : undefined,
              unread_count: count || 0
            };
          })
        );

        setConversations(conversationsWithDetails);
      }

    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch conversations'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId || !user?.id) return;

    try {
      setLoading(true);

      // Fetch conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setConversation(convData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (messagesData) {
        // Get unique sender IDs
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];

        // Get sender profiles
        const senderProfiles: Record<string, any> = {};

        // Check creator_profiles
        const { data: creators } = await supabase
          .from('creator_profiles')
          .select('id, full_name, email, avatar_url, user_id')
          .in('user_id', senderIds);

        creators?.forEach(creator => {
          senderProfiles[creator.user_id] = {
            ...creator,
            user_type: 'creator'
          };
        });

        // Check businesses for remaining IDs
        const remainingIds = senderIds.filter(id => !senderProfiles[id]);
        if (remainingIds.length > 0) {
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, business_name as full_name, email, logo_url as avatar_url, user_id')
            .in('user_id', remainingIds);

          businesses?.forEach(business => {
            senderProfiles[business.user_id] = {
              ...business,
              user_type: 'business'
            };
          });
        }

        // Combine messages with sender info
        const messagesWithSenders = messagesData.map(message => ({
          ...message,
          sender: senderProfiles[message.sender_id]
        }));

        setMessages(messagesWithSenders);
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!conversationId || !user?.id) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('sender_id', conversation?.participant1_id === user.id 
          ? conversation.participant2_id 
          : conversation.participant1_id
        )
        .eq('is_read', false);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  const sendMessage = async (content: string, attachments?: File[]) => {
    if (!user?.id) throw new Error('User not authenticated');
    if (!conversationId) throw new Error('No conversation selected');

    try {
      // Upload attachments if any
      const attachmentUrls = [];
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${conversationId}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(fileName);

          attachmentUrls.push({
            url: publicUrl,
            type: file.type,
            name: file.name
          });
        }
      }

      // Insert message
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          attachments: attachmentUrls,
          is_read: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Add to messages list
      setMessages(prev => [...prev, data]);
      return data;

    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const startConversation = async (
    otherUserId: string,
    otherUserType: 'creator' | 'business',
    campaignId?: string
  ) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Determine user's own type from metadata
      const { data: { user: userData } } = await supabase.auth.getUser();
      const userType = userData?.user_metadata?.user_type || 'creator';

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          participant1_id: user.id,
          participant2_id: otherUserId,
          participant1_type: userType,
          participant2_type: otherUserType,
          campaign_id: campaignId,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id;

    } catch (err) {
      console.error('Error starting conversation:', err);
      throw err;
    }
  };

  return {
    messages,
    conversation,
    conversations,
    loading,
    error,
    refresh: fetchMessages,
    refreshConversations: fetchConversations,
    sendMessage,
    startConversation,
    markMessagesAsRead
  };
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUserData } from '../screens/useUserData';
import { ProtectedRoute } from "../components/ProtectedRoute";

export function SettingsPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p>Only visible if logged in</p>
      </div>
    </ProtectedRoute>
  );
}
interface Props {
  userId: string;
}

export function Settings() {
  const { data, loading } = useUserData(userId);

  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);

  if (loading) return <p>Loading...</p>;

  // Save basic fields
  const handleSaveEmail = async () => {
    const { error } = await supabase
      .from('users')
      .update({ email, updated_at: new Date() })
      .eq('id', userId);
    if (error) console.error(error);
  };

  const handleSaveBio = async () => {
    const { error } = await supabase
      .from('users')
      .update({ bio, updated_at: new Date() })
      .eq('id', userId);
    if (!error) setEditingBio(false);
    else console.error(error);
  };

  // Notifications toggle
  const toggleNotification = async (field: string) => {
    const currentValue = data.user_notifications?.[0]?.[field];
    const { error } = await supabase
      .from('user_notifications')
      .update({ [field]: !currentValue })
      .eq('user_id', userId);
    if (!error) data.user_notifications[0][field] = !currentValue;
    else console.error(error);
  };

  // Add new niche
  const addNiche = async (niche: string) => {
    const { data: newNiche, error } = await supabase
      .from('user_niches')
      .insert({ user_id: userId, niche })
      .select()
      .single();
    if (!error) data.user_niches.push(newNiche);
    else console.error(error);
  };

  // Add platform
  const addPlatform = async (platform_name: string, handle: string) => {
    const { data: newPlatform, error } = await supabase
      .from('user_platforms')
      .insert({ user_id: userId, platform_name, handle })
      .select()
      .single();
    if (!error) data.user_platforms.push(newPlatform);
    else console.error(error);
  };

  // Toggle account status
  const toggleAccountStatus = async (field: 'paused' | 'deleted') => {
    const currentValue = data.user_status?.[field];
    const { error } = await supabase
      .from('user_status')
      .update({ [field]: !currentValue })
      .eq('user_id', userId);
    if (!error) data.user_status[field] = !currentValue;
    else console.error(error);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>User Settings</h2>

      <div>
        <label>Email:</label>
        <input
          type="email"
          defaultValue={data.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={handleSaveEmail}>Save Email</button>
      </div>

      <div>
        <label>Bio:</label>
        {editingBio ? (
          <>
            <textarea
              defaultValue={data.bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <button onClick={handleSaveBio}>Save Bio</button>
          </>
        ) : (
          <p>{data.bio || 'No bio set'}</p>
        )}
        <button onClick={() => setEditingBio(true)}>Edit Bio</button>
      </div>

      <div>
        <h3>Notifications</h3>
        {['campaigns','messages','payments','announcements'].map((field) => (
          <div key={field}>
            <label>{field}</label>
            <input
              type="checkbox"
              checked={data.user_notifications?.[0]?.[field]}
              onChange={() => toggleNotification(field)}
            />
          </div>
        ))}
      </div>

      <div>
        <h3>Account Status</h3>
        {['paused','deleted'].map((field) => (
          <div key={field}>
            <label>{field}</label>
            <input
              type="checkbox"
              checked={data.user_status?.[field]}
              onChange={() => toggleAccountStatus(field as 'paused' | 'deleted')}
            />
          </div>
        ))}
      </div>

      <div>
        <h3>Niches</h3>
        {data.user_niches.map((n: any) => <p key={n.id}>{n.niche}</p>)}
        <button onClick={() => addNiche(prompt('Enter new niche') || '')}>
          Add Niche
        </button>
      </div>

      <div>
        <h3>Platforms</h3>
        {data.user_platforms.map((p: any) => (
          <p key={p.id}>{p.platform_name}: {p.handle}</p>
        ))}
        <button onClick={() => {
          const name = prompt('Platform name') || '';
          const handle = prompt('Handle') || '';
          addPlatform(name, handle);
        }}>
          Add Platform
        </button>
      </div>
    </div>
  );
}
// Route-compatible wrapper (no props required)
// The Settings export above takes userId; this re-export works without it

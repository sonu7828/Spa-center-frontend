/**
 * SocialContext — In-memory state & API-ready architecture for Social Media Automation
 *
 * Manages:
 *   - Connected accounts (Facebook, Instagram, TikTok)
 *   - Social posts (Scheduled & Published)
 *   - Create Post workflow (Immediate publish or Schedule with date/time)
 *   - Share to Social Media link from Client Before/After
 *
 * Frontend/in-memory only. Ready for future backend/OAuth API connections.
 */

import { createContext, useContext, useState, useCallback } from 'react';

const SocialContext = createContext();

const INITIAL_ACCOUNTS = [
  { id: 'facebook', name: 'Facebook', handle: 'Omega Spa Douala', connected: true, iconColor: '#1877F2' },
  { id: 'instagram', name: 'Instagram', handle: '@omegaspadouala', connected: true, iconColor: '#E1306C' },
  { id: 'tiktok', name: 'TikTok', handle: '@omegaspadouala', connected: false, iconColor: '#000000' },
];

// Clean initial state for real backend integration
const INITIAL_POSTS = [];

export function SocialProvider({ children }) {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [draftPost, setDraftPost] = useState(null);

  // Toggle account connection (UI-ready for future OAuth)
  const toggleAccountConnection = useCallback((platformId) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === platformId ? { ...acc, connected: !acc.connected } : acc
      )
    );
  }, []);

  // Create new post (Post Now or Schedule)
  const createPost = useCallback(
    ({ media, mediaType = 'photo', caption, platforms, isScheduled, scheduledDate, scheduledTime }) => {
      const newId = Date.now();
      const now = new Date();
      const todayStr = 'Today, ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let scheduledStr = null;
      if (isScheduled && scheduledDate && scheduledTime) {
        const d = new Date(`${scheduledDate}T${scheduledTime}`);
        scheduledStr = isNaN(d.getTime())
          ? `${scheduledDate} at ${scheduledTime}`
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + scheduledTime;
      }

      const newPost = {
        id: newId,
        media: media || null,
        mediaType: mediaType || 'photo',
        caption: (caption || '').trim(),
        platforms: platforms && platforms.length > 0 ? platforms : ['facebook'],
        status: isScheduled ? 'scheduled' : 'published',
        publishedAt: isScheduled ? null : todayStr,
        scheduledAt: isScheduled ? scheduledStr : null,
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
        createdAt: todayStr,
      };

      setPosts((prev) => [newPost, ...prev]);
      setDraftPost(null);
      return newPost;
    },
    []
  );

  // Publish a scheduled post now
  const publishScheduledPostNow = useCallback((postId) => {
    const now = new Date();
    const todayStr = 'Today, ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, status: 'published', publishedAt: todayStr, scheduledAt: null }
          : p
      )
    );
  }, []);

  // Cancel / Delete a post
  const deletePost = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  // Prepare a draft from client Before/After
  const prepareSocialDraft = useCallback(({ media, caption, serviceName, clientName }) => {
    setDraftPost({
      media: media || null,
      mediaType: 'photo',
      caption:
        caption ||
        `✨ Amazing ${serviceName || 'treatment'} transformation for our lovely client at Omega Spa Douala! 💖 Book your appointment now. #OmegaSpa #Douala #SelfCare`,
      platforms: ['facebook', 'instagram'],
    });
  }, []);

  const clearDraft = useCallback(() => {
    setDraftPost(null);
  }, []);

  return (
    <SocialContext.Provider
      value={{
        accounts,
        posts,
        draftPost,
        toggleAccountConnection,
        createPost,
        publishScheduledPostNow,
        deletePost,
        prepareSocialDraft,
        clearDraft,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  return useContext(SocialContext);
}

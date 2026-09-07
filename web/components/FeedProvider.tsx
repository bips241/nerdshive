'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type CockpitTab = 'pulse' | 'chat' | 'comments';

interface FeedContextType {
  posts: any[];
  setPosts: React.Dispatch<React.SetStateAction<any[]>>;
  isRevalidating: boolean;
  refreshFeed: () => Promise<void>;
  updatePostOptimistic: (postId: string, updater: (prevPost: any) => any) => void;
  cockpitTab: CockpitTab;
  setCockpitTab: (tab: CockpitTab) => void;
  activeDiscussionPost: any | null;
  focusPostDiscussion: (post: any) => void;
}

const FeedContext = createContext<FeedContextType | null>(null);

// In-memory module-level cache that survives route transitions
let globalCachedPosts: any[] | null = null;

export const FeedProvider: React.FC<{
  initialPosts?: any[];
  children: React.ReactNode;
}> = ({ initialPosts = [], children }) => {
  const [posts, setPosts] = useState<any[]>(() => {
    if (globalCachedPosts && globalCachedPosts.length > 0) {
      return globalCachedPosts;
    }
    return initialPosts;
  });

  const [isRevalidating, setIsRevalidating] = useState(false);
  const [cockpitTab, setCockpitTab] = useState<CockpitTab>('pulse');
  const [activeDiscussionPost, setActiveDiscussionPost] = useState<any | null>(null);

  const focusPostDiscussion = useCallback((post: any) => {
    setActiveDiscussionPost(post);
    setCockpitTab('comments');
  }, []);

  // Sync module cache whenever posts state updates
  useEffect(() => {
    if (posts.length > 0) {
      globalCachedPosts = posts;
    }
  }, [posts]);

  // If initialPosts is provided on server render and we don't have cached posts yet, seed it
  useEffect(() => {
    if ((!globalCachedPosts || globalCachedPosts.length === 0) && initialPosts.length > 0) {
      setPosts(initialPosts);
      globalCachedPosts = initialPosts;
    }
  }, [initialPosts]);

  // Background silent revalidation (Stale-While-Revalidate)
  const refreshFeed = useCallback(async () => {
    try {
      setIsRevalidating(true);
      const res = await fetch('/api/posts?limit=20');
      if (res.ok) {
        const freshPosts = await res.json();
        if (Array.isArray(freshPosts) && freshPosts.length > 0) {
          setPosts(freshPosts);
          globalCachedPosts = freshPosts;
        }
      }
    } catch (err) {
      console.error('Failed to background revalidate feed:', err);
    } finally {
      setIsRevalidating(false);
    }
  }, []);

  // 0ms Optimistic Post Updater
  const updatePostOptimistic = useCallback((postId: string, updater: (prevPost: any) => any) => {
    setPosts((prev) => {
      const updated = prev.map((p) => {
        const id = p._id?.toString() || p.id?.toString();
        if (id === postId) {
          return updater(p);
        }
        return p;
      });
      globalCachedPosts = updated;
      return updated;
    });
  }, []);

  return (
    <FeedContext.Provider
      value={{
        posts,
        setPosts,
        isRevalidating,
        refreshFeed,
        updatePostOptimistic,
        cockpitTab,
        setCockpitTab,
        activeDiscussionPost,
        focusPostDiscussion,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
};

export const useOptionalFeed = (): FeedContextType | null => {
  return useContext(FeedContext);
};

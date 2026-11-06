import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../context/AuthProvider";
import PostService, { Post } from "../../services/post.service";
import RequestService, { RequestStatus } from "../../services/request.service";

export interface PendingRequestsSummary {
  total: number;
  perPost: Map<number, number>;
}

export function usePendingRequestsSummary(): {
  summary: PendingRequestsSummary;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PendingRequestsSummary>({ total: 0, perPost: new Map() });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSummary({ total: 0, perPost: new Map() });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const myPosts = await PostService.getMyPosts();
      const postIds = myPosts.map((p: Post) => p.id);

      let total = 0;
      const perPost = new Map<number, number>();

      for (const postId of postIds) {
        const reqs = await RequestService.getRequestsForPost(postId);
        const pending = reqs.filter((r) => r.status === RequestStatus.PENDING).length;
        if (pending > 0) {
          perPost.set(postId, pending);
          total += pending;
        }
      }

      setSummary({ total, perPost });
    } catch (e) {
      console.log("Failed to load pending requests summary:", e);
      setSummary({ total: 0, perPost: new Map() });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch when screen focuses
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { summary, loading, refresh: load };
}

export default usePendingRequestsSummary;
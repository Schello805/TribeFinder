export { useDebounce } from "./useDebounce";

import useSWR from "swr";

interface Post {
  id: string;
  content: string;
  image: string | null;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePosts() {
  const { data, error, isLoading, mutate } = useSWR<Post[]>("/api/posts", fetcher);

  const createPost = async (content: string, image?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, image }),
      });

      if (res.ok) {
        mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        mutate();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    posts: data || [],
    isLoading,
    isError: !!error,
    createPost,
    deletePost,
  };
}

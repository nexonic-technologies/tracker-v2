import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useGenericAPI from '../../components/useGenericAPI';
import PostCard from '../../components/Feeds/PostCard';
import { FiChevronLeft, FiLoader } from 'react-icons/fi';

export default function FeedPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { readPaginated, loading } = useGenericAPI();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  const fetchPost = async () => {
    try {
      const res = await readPaginated('feed_posts', 1, 1, {
        filter: JSON.stringify({ _id: id }),
        populateFields: 'author,group,channel'
      });
      if (res?.data && res.data.length > 0) {
        setPost(res.data[0]);
      } else {
        setError("Post not found");
      }
    } catch (err) {
      setError("Failed to load post");
    }
  };

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto py-6 px-4" data-module="hr">
      <button
        onClick={() => navigate('/feed')}
        className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors pb-2"
      >
        <FiChevronLeft className="text-sm" /> Back to Feed
      </button>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <FiLoader className="animate-spin text-2xl text-[var(--module-accent)]" />
          <span className="text-xs text-ink-subtle">Loading post details...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-dashed rounded-[14px] bg-surface border-hairline">
          <p className="text-sm font-semibold text-ink">{error}</p>
          <p className="text-xs text-ink-subtle mt-1">This post may have been deleted or you don't have access.</p>
        </div>
      ) : post ? (
        <PostCard post={post} onRefresh={fetchPost} />
      ) : null}
    </div>
  );
}

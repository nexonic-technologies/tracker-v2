'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface CommentThreadProps {
  ticketId: string;
}

export default function CommentThread({ ticketId }: CommentThreadProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [reads, setReads] = useState<Record<string, any[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentAgentId = typeof window !== 'undefined' ? localStorage.getItem('agentId') || 'temp-agent-id' : '';

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      // Fetch comments
      const token = localStorage.getItem('agentToken') || '';
      const res = await fetch('/api/populate/read/ticket_comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filter: { ticketId, isPublic: true },
          populateFields: { commentedBy: 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,name,firstName,lastName' }
        })
      });
      const data = await res.json();
      if (data.data) {
        setComments(data.data);
        const myComments = data.data.filter((c: any) => c.commentedBy?._id === currentAgentId || c.commentedBy === currentAgentId);
        if (myComments.length > 0) {
          fetchReadReceipts(myComments.map((c: any) => c._id));
        }
        markOthersAsRead(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadReceipts = async (commentIds: string[]) => {
    try {
      const token = localStorage.getItem('agentToken') || '';
      const res = await fetch('/api/populate/read/ticket_comment_reads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filter: { commentId: { $in: commentIds } },
          populateFields: { userId: 'basicInfo.firstName,basicInfo.lastName,name,firstName,lastName' }
        })
      });
      const data = await res.json();
      if (data.data) {
        const readsMap: Record<string, any[]> = {};
        data.data.forEach((read: any) => {
          if (!readsMap[read.commentId]) readsMap[read.commentId] = [];
          readsMap[read.commentId].push(read);
        });
        setReads(readsMap);
      }
    } catch (err) {
      console.error('Failed to fetch read receipts', err);
    }
  };

  const markOthersAsRead = async (allComments: any[]) => {
    // Comments not written by me
    const othersComments = allComments.filter((c: any) => {
      const authorId = c.commentedBy?._id || c.commentedBy;
      return authorId && authorId !== currentAgentId;
    });

    for (const comment of othersComments) {
      try {
        const token = localStorage.getItem('agentToken') || '';
        await fetch('/api/populate/create/ticket_comment_reads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payload: {
              commentId: comment._id,
              userId: currentAgentId,
              userModel: 'agents'
            }
          })
        });
      } catch (err) {
        // Silently fail if already read or network error
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('agentToken') || '';
      const res = await fetch('/api/populate/create/ticket_comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payload: {
            ticketId,
            message: newMessage,
            commentedBy: currentAgentId,
            commenterModel: 'agents',
            isPublic: true
          }
        })
      });
      
      if (res.ok) {
        setNewMessage('');
        fetchComments();
      } else {
        toast.error('Failed to send comment');
      }
    } catch (err) {
      toast.error('Error sending comment');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const getName = (userObj: any) => {
    if (!userObj) return 'Unknown';
    if (userObj.basicInfo) return `${userObj.basicInfo.firstName || ''} ${userObj.basicInfo.lastName || ''}`.trim();
    if (userObj.firstName || userObj.lastName) return `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim();
    if (userObj.name) return userObj.name;
    return 'User';
  };

  if (loading && comments.length === 0) {
    return <div className="text-sm text-ink-subtle p-4 text-center">Loading comments...</div>;
  }

  return (
    <div className="lmx-section-card flex flex-col h-[500px]">
      <div className="flex items-center gap-3 pb-4 mb-2" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
        <h3 className="text-[18px] font-semibold text-ink">Comments & Activity</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
        {comments.length === 0 ? (
          <div className="text-center text-[13px] text-ink-subtle italic mt-8">No comments yet. Start the conversation!</div>
        ) : (
          comments.map((comment) => {
            const authorId = comment.commentedBy?._id || comment.commentedBy;
            const isMe = authorId === currentAgentId;
            const commentReads = reads[comment._id] || [];

            return (
              <div key={comment._id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end ml-auto items-end' : 'self-start items-start'}`}>
                <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center overflow-hidden border border-gray-300">
                    {comment.commentedBy?.basicInfo?.profileImage ? (
                      <img src={comment.commentedBy.basicInfo.profileImage.startsWith('http') || comment.commentedBy.basicInfo.profileImage.startsWith('/') ? comment.commentedBy.basicInfo.profileImage : `/api/files/${comment.commentedBy.basicInfo.profileImage}`} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-gray-500" />
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-2xl ${isMe ? 'bg-[var(--lmx-accent)] text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200'}`}>
                    {!isMe && (
                      <p className="text-[11px] font-bold mb-1 opacity-70">
                        {getName(comment.commentedBy)}
                      </p>
                    )}
                    <div 
                      className="text-[13.5px] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: comment.message }}
                    />
                    <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${isMe ? 'text-white/70 justify-end' : 'text-gray-500'}`}>
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                
                {/* Read Receipts */}
                {isMe && commentReads.length > 0 && (
                  <div className="text-[10.5px] text-gray-400 mt-1 mr-10 flex items-center gap-1">
                    <CheckCheck size={12} className="text-blue-500" />
                    Read by {commentReads.map(r => getName(r.userId)).join(', ')}
                  </div>
                )}
                {isMe && commentReads.length === 0 && (
                  <div className="text-[10.5px] text-gray-400 mt-1 mr-10 flex items-center gap-1">
                    <CheckCheck size={12} />
                    Sent
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-3" style={{ borderTop: '1px solid var(--lmx-border-soft)' }}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a comment..."
            className="lmx-textarea flex-1 min-h-[44px] max-h-[120px] py-3 rounded-xl resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || submitting}
            className="w-11 h-11 shrink-0 rounded-xl bg-[var(--lmx-accent)] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {submitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}

/* Composant pour les réactions et commentaires en direct */
'use client';

import React, { useState } from 'react';
import useVideoCallStore from '@/store/videoCallStore';
import { useAuthStore } from '@/store/authStore';
import { videoCallEventPublishers } from '@/lib/videoCallRealtime';
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveInteractionsPanelProps {
  callId: string;
  conversationId: string;
}

const REACTION_TYPES = ['👍', '👎', '👏', '😂', '😲', '🤔', '❤️'];

export const LiveInteractionsPanel: React.FC<LiveInteractionsPanelProps> = ({
  callId,
  conversationId,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const callState = useVideoCallStore();
  const [commentText, setCommentText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [activeTab, setActiveTab] = useState<'reactions' | 'comments' | 'notes'>('reactions');

  const handleReaction = (reactionType: string) => {
    if (!authUser) return;

    // Créer une réaction temporaire
    const reaction = {
      id: `${Date.now()}-${Math.random()}`,
      type: reactionType as any,
      userId: authUser.id,
      callId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3000, // 3 secondes
    };

    callState.addReaction(reaction);

    // Publier l'événement
    videoCallEventPublishers.reactionAdded(
      callId,
      conversationId,
      authUser.id,
      reactionType
    );

    setShowReactions(false);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !authUser) return;

    const comment = {
      id: `${Date.now()}-${Math.random()}`,
      callId,
      userId: authUser.id,
      content: commentText,
      createdAt: Date.now(),
      isVisible: true,
    };

    callState.addLiveComment(comment);
    setCommentText('');
  };

  const handleAddNote = () => {
    if (!commentText.trim() || !authUser) return;

    const note = {
      id: `${Date.now()}-${Math.random()}`,
      callId,
      userId: authUser.id,
      content: commentText,
      timestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    callState.addCallNote(note);
    setCommentText('');
  };

  const reactions = callState.reactions;
  const comments = callState.liveComments;
  const notes = callState.callNotes;

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
      {/* Onglets */}
      <div className="flex border-b border-slate-200 bg-white">
        {['reactions', 'comments', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {tab === 'reactions' && '😊 Réactions'}
            {tab === 'comments' && '💬 Commentaires'}
            {tab === 'notes' && '📝 Notes'}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'reactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Réactions en direct</h3>
              <div className="relative">
                <Button
                  onClick={() => setShowReactions(!showReactions)}
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                >
                  <SmilePlus size={16} />
                  Ajouter
                </Button>
                {showReactions && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-3 grid grid-cols-4 gap-2 z-10">
                    {REACTION_TYPES.map((reaction) => (
                      <button
                        key={reaction}
                        onClick={() => handleReaction(reaction)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {reactions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {reactions.map((reaction) => (
                  <div
                    key={reaction.id}
                    className="text-2xl animate-bounce"
                  >
                    {reaction.type}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Aucune réaction pour le moment</p>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Commentaires en direct</h3>
            
            {comments.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white p-2 rounded border border-slate-200 text-sm"
                  >
                    <p className="font-medium text-xs text-slate-600 mb-1">
                      {comment.userId === authUser?.id ? 'Vous' : 'Participant'}
                    </p>
                    <p className="text-slate-900">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Aucun commentaire</p>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Notes de réunion</h3>
            
            {notes.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white p-2 rounded border border-slate-200 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-xs text-slate-600">
                        {note.userId === authUser?.id ? 'Vous' : 'Participant'}
                      </p>
                      <button
                        onClick={() => callState.deleteCallNote(note.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                    <p className="text-slate-900">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Aucune note</p>
            )}
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-slate-200 p-3 bg-white space-y-2">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={
            activeTab === 'notes'
              ? 'Ajouter une note de réunion...'
              : 'Ajouter un commentaire...'
          }
          className="w-full text-sm border border-slate-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              if (activeTab === 'notes') {
                handleAddNote();
              } else {
                handleAddComment();
              }
            }
          }}
        />
        <Button
          onClick={
            activeTab === 'notes'
              ? handleAddNote
              : handleAddComment
          }
          disabled={!commentText.trim()}
          size="sm"
          className="w-full gap-2"
        >
          <Send size={14} />
          {activeTab === 'notes' ? 'Ajouter note' : 'Envoyer'}
        </Button>
      </div>
    </div>
  );
};

export default LiveInteractionsPanel;

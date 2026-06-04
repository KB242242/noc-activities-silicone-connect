import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChatMessage, Conversation } from '@/features/app-shell/core/shared/types';

type AppEmailMessageSearchBarProps = {
  selectedConversation: Conversation;
  chatMessages: ChatMessage[];
  chatSearchMessageQuery: string;
  setChatSearchMessageQuery: Dispatch<SetStateAction<string>>;
  searchResults: ChatMessage[];
  setSearchResults: Dispatch<SetStateAction<ChatMessage[]>>;
  currentSearchIndex: number;
  setCurrentSearchIndex: Dispatch<SetStateAction<number>>;
  setMessageSearchOpen: Dispatch<SetStateAction<boolean>>;
};

export function AppEmailMessageSearchBar({
  selectedConversation,
  chatMessages,
  chatSearchMessageQuery,
  setChatSearchMessageQuery,
  searchResults,
  setSearchResults,
  currentSearchIndex,
  setCurrentSearchIndex,
  setMessageSearchOpen,
}: AppEmailMessageSearchBarProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border-b p-2 z-20 relative">
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans la conversation..."
          value={chatSearchMessageQuery}
          onChange={(e) => {
            setChatSearchMessageQuery(e.target.value);
            const results = chatMessages.filter(
              (message) =>
                message.conversationId === selectedConversation.id &&
                !message.deletedForEveryone &&
                !message.isDeleted &&
                message.content.toLowerCase().includes(e.target.value.toLowerCase())
            );
            setSearchResults(results);
            setCurrentSearchIndex(0);
          }}
          className="flex-1 h-8"
        />
        {searchResults.length > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentSearchIndex + 1} / {searchResults.length}
          </span>
        )}
        {searchResults.length > 1 && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setCurrentSearchIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1))}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setCurrentSearchIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0))}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            setMessageSearchOpen(false);
            setChatSearchMessageQuery('');
            setSearchResults([]);
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
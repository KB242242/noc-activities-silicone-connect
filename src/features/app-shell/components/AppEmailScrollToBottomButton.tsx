import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AppEmailScrollToBottomButtonProps = {
  onClick: () => void;
};

export function AppEmailScrollToBottomButton({ onClick }: AppEmailScrollToBottomButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      className="absolute right-6 bottom-24 z-20 rounded-full shadow-lg bg-cyan-500 hover:bg-cyan-600 text-white"
      onClick={onClick}
      title="Aller au dernier message"
    >
      <ChevronDown className="w-5 h-5" />
    </Button>
  );
}

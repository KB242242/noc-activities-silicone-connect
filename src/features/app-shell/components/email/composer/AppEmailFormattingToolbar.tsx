import type { Dispatch, SetStateAction } from 'react';

import { Bold, Italic, Underline } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type MessageFormatting = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: 'small' | 'normal' | 'large';
  color: string;
};

type AppEmailFormattingToolbarProps = {
  showFormattingToolbar: boolean;
  currentFormatting: MessageFormatting;
  setCurrentFormatting: Dispatch<SetStateAction<MessageFormatting>>;
};

export function AppEmailFormattingToolbar({
  showFormattingToolbar,
  currentFormatting,
  setCurrentFormatting,
}: AppEmailFormattingToolbarProps) {
  if (!showFormattingToolbar) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-2 bg-white dark:bg-slate-700 rounded-lg mb-2 border">
      <Button
        variant={currentFormatting.bold ? 'default' : 'ghost'}
        size="icon"
        className={`h-8 w-8 ${currentFormatting.bold ? 'bg-cyan-500 text-white' : ''}`}
        onClick={() => setCurrentFormatting((prev) => ({ ...prev, bold: !prev.bold }))}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant={currentFormatting.italic ? 'default' : 'ghost'}
        size="icon"
        className={`h-8 w-8 ${currentFormatting.italic ? 'bg-cyan-500 text-white' : ''}`}
        onClick={() => setCurrentFormatting((prev) => ({ ...prev, italic: !prev.italic }))}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant={currentFormatting.underline ? 'default' : 'ghost'}
        size="icon"
        className={`h-8 w-8 ${currentFormatting.underline ? 'bg-cyan-500 text-white' : ''}`}
        onClick={() => setCurrentFormatting((prev) => ({ ...prev, underline: !prev.underline }))}
      >
        <Underline className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <div className="flex items-center gap-1">
        {(['small', 'normal', 'large'] as const).map((size) => (
          <Button
            key={size}
            variant={currentFormatting.fontSize === size ? 'default' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${currentFormatting.fontSize === size ? 'bg-cyan-500 text-white' : ''}`}
            onClick={() => setCurrentFormatting((prev) => ({ ...prev, fontSize: size }))}
          >
            <span className="text-xs">{size === 'small' ? 'S' : size === 'normal' ? 'M' : 'L'}</span>
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Couleur:</span>
        <input
          type="color"
          value={currentFormatting.color}
          onChange={(e) => setCurrentFormatting((prev) => ({ ...prev, color: e.target.value }))}
          className="w-6 h-6 rounded cursor-pointer border-0"
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setCurrentFormatting({
            bold: false,
            italic: false,
            underline: false,
            fontSize: 'normal',
            color: '#000000',
          });
        }}
      >
        Réinitialiser
      </Button>
    </div>
  );
}

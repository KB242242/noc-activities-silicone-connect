'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Type, Highlighter, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
];

const FONT_SIZES = [
  { value: '1', label: 'Petit' },
  { value: '3', label: 'Normal' },
  { value: '5', label: 'Grand' },
  { value: '7', label: 'Très grand' },
];

const TEXT_COLORS = [
  '#000000', '#374151', '#6B7280', '#DC2626', '#EA580C', '#CA8A04',
  '#16A34A', '#2563EB', '#7C3AED', '#DB2777', '#0891B2',
];

const HIGHLIGHT_COLORS = [
  '#FFFFFF', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#F3E8FF', 
  '#FCE7F3', '#FEE2E2', '#E5E7EB', '#FDE68A',
];

// Helper function to clean HTML content
function cleanHtmlContent(html: string): string {
  if (!html) return '';
  
  // Remove empty divs with just br tags
  let cleaned = html.replace(/<div\s*style="text-align:\s*left;\s*">\s*<br\s*\/?>\s*<\/div>/gi, '');
  
  // Remove multiple consecutive br tags
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
  
  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
  
  // Remove leading and trailing br tags
  cleaned = cleaned.replace(/^(\s*<br\s*\/?>)+/i, '');
  cleaned = cleaned.replace(/(<br\s*\/?>\s*)+$/i, '');
  
  // Remove empty divs at the beginning
  cleaned = cleaned.replace(/^(\s*<div[^>]*>\s*<\/div>)+/i, '');
  
  // Clean up whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Helper to get plain text representation for validation
function getPlainText(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Écrivez votre description...', 
  className = '',
  minHeight = '150px'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content only once on mount
  useEffect(() => {
    if (editorRef.current) {
      const cleanValue = cleanHtmlContent(value);
      if (editorRef.current.innerHTML !== cleanValue) {
        editorRef.current.innerHTML = cleanValue || '';
      }
    }
  }, []);

  // Update editor content when value changes externally (and editor is not focused)
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const cleanValue = cleanHtmlContent(value);
      if (editorRef.current.innerHTML !== cleanValue) {
        editorRef.current.innerHTML = cleanValue || '';
      }
    }
  }, [value, isFocused]);

  // Handle input changes with debounced cleanup
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      let html = editorRef.current.innerHTML;
      // Don't clean while typing, only clean on blur
      onChange(html);
    }
  }, [onChange]);

  // Handle blur - clean up the content
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (editorRef.current) {
      let html = editorRef.current.innerHTML;
      const cleaned = cleanHtmlContent(html);
      
      // Only update if cleaning made a difference
      if (cleaned !== html) {
        editorRef.current.innerHTML = cleaned;
        onChange(cleaned);
      }
    }
  }, [onChange]);

  // Execute command
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  // Check active styles
  const updateActiveStyles = useCallback(() => {
    setActiveStyles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Entrez l\'URL du lien:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Insert image
  const insertImage = useCallback(() => {
    const url = prompt('Entrez l\'URL de l\'image:');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  // Handle paste to strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  return (
    <div className={`border-2 border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        {/* Font Family */}
        <Select onValueChange={(v) => execCommand('fontName', v)}>
          <SelectTrigger className="w-28 h-8 text-xs bg-white dark:bg-slate-700">
            <Type className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Police" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map(font => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={(v) => execCommand('fontSize', v)}>
          <SelectTrigger className="w-20 h-8 text-xs bg-white dark:bg-slate-700">
            <SelectValue placeholder="Taille" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map(size => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Bold, Italic, Underline */}
        <Toggle
          size="sm"
          pressed={activeStyles.bold}
          onPressedChange={() => execCommand('bold')}
          className="h-8 w-8"
        >
          <Bold className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={activeStyles.italic}
          onPressedChange={() => execCommand('italic')}
          className="h-8 w-8"
        >
          <Italic className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={activeStyles.underline}
          onPressedChange={() => execCommand('underline')}
          className="h-8 w-8"
        >
          <Underline className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <Toggle size="sm" onPressedChange={() => execCommand('justifyLeft')} className="h-8 w-8">
          <AlignLeft className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => execCommand('justifyCenter')} className="h-8 w-8">
          <AlignCenter className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => execCommand('justifyRight')} className="h-8 w-8">
          <AlignRight className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Toggle size="sm" onPressedChange={() => execCommand('insertUnorderedList')} className="h-8 w-8">
          <List className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => execCommand('insertOrderedList')} className="h-8 w-8">
          <ListOrdered className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: '#000000' }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-6 gap-1">
              {TEXT_COLORS.map(color => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand('foreColor', color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Highlighter className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-6 gap-1">
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand('hiliteColor', color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={insertLink}>
          <LinkIcon className="w-4 h-4" />
        </Button>

        {/* Image */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={insertImage}>
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={updateActiveStyles}
        onMouseUp={updateActiveStyles}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="p-3 bg-white dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/20 min-h-[150px] max-h-[300px] overflow-y-auto"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />

      <style jsx global>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default RichTextEditor;

'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Highlighter,
  Link as LinkIcon,
  Image as ImageIcon,
  Maximize2,
  Ticket,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  enableTicketReferences?: boolean;
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
  '#000000', '#1f2937', '#4b5563', '#6b7280', '#9ca3af',
  '#7f1d1d', '#dc2626', '#ef4444', '#f97316', '#ea580c', '#f59e0b',
  '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488',
  '#0891b2', '#0284c7', '#2563eb', '#1d4ed8', '#4f46e5',
  '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#be185d',
];

const HIGHLIGHT_COLORS = [
  '#ffffff', '#fff7cc', '#fef3c7', '#fde68a', '#fcd34d',
  '#fee2e2', '#fecaca', '#fecdd3', '#fce7f3', '#f5d0fe',
  '#ede9fe', '#e0e7ff', '#dbeafe', '#bfdbfe', '#bae6fd',
  '#cffafe', '#ccfbf1', '#d1fae5', '#dcfce7', '#ecfccb',
  '#e5e7eb', '#d1d5db',
];

function cleanHtmlContent(html: string): string {
  if (!html) return '';

  let cleaned = html.replace(/<div\s*style="text-align:\s*left;\s*">\s*<br\s*\/?>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/^(\s*<br\s*\/?>)+/i, '');
  cleaned = cleaned.replace(/(<br\s*\/?>\s*)+$/i, '');
  cleaned = cleaned.replace(/^(\s*<div[^>]*>\s*<\/div>)+/i, '');
  return cleaned.trim();
}

function addResizeHandlesToWrapper(wrapper: HTMLElement) {
  // Edge strips (full-side, invisible but wide hit area) + corner dots
  const handles: Array<{
    dir: string;
    style: Partial<CSSStyleDeclaration>;
    cursor: string;
    isDot: boolean;
  }> = [
    // Corners — visible blue squares
    { dir: 'nw', cursor: 'nw-resize', isDot: true,
      style: { top: '-6px', left: '-6px', width: '12px', height: '12px' } },
    { dir: 'ne', cursor: 'ne-resize', isDot: true,
      style: { top: '-6px', right: '-6px', width: '12px', height: '12px' } },
    { dir: 'se', cursor: 'se-resize', isDot: true,
      style: { bottom: '-6px', right: '-6px', width: '12px', height: '12px' } },
    { dir: 'sw', cursor: 'sw-resize', isDot: true,
      style: { bottom: '-6px', left: '-6px', width: '12px', height: '12px' } },
    // Edges — invisible wide strips covering the full side
    { dir: 'n',  cursor: 'ns-resize', isDot: false,
      style: { top: '-6px', left: '12px', right: '12px', height: '12px' } },
    { dir: 's',  cursor: 'ns-resize', isDot: false,
      style: { bottom: '-6px', left: '12px', right: '12px', height: '12px' } },
    { dir: 'e',  cursor: 'ew-resize', isDot: false,
      style: { right: '-6px', top: '12px', bottom: '12px', width: '12px' } },
    { dir: 'w',  cursor: 'ew-resize', isDot: false,
      style: { left: '-6px', top: '12px', bottom: '12px', width: '12px' } },
  ];

  handles.forEach(({ dir, style, cursor, isDot }) => {
    const handle = document.createElement('span');
    handle.setAttribute('data-rte-image-handle', dir);
    handle.style.position = 'absolute';
    handle.style.cursor = cursor;
    handle.style.display = 'none';
    handle.style.zIndex = '20';
    if (isDot) {
      handle.style.background = '#0ea5e9';
      handle.style.border = '2px solid #ffffff';
      handle.style.borderRadius = '3px';
      handle.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
    } else {
      // Invisible strip — only shows a thin highlight line on hover via outline
      handle.style.background = 'transparent';
    }
    Object.assign(handle.style, style);
    wrapper.appendChild(handle);
  });
}

function sanitizeEditorArtifacts(html: string): string {
  if (!html || typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('[data-rte-image-wrapper="true"]').forEach((node) => {
    const wrapper = node as HTMLElement;
    wrapper.style.outline = 'none';
    wrapper.style.outlineOffset = '0';
  });

  doc.querySelectorAll('[data-rte-image-handle]').forEach((node) => {
    const handle = node as HTMLElement;
    handle.style.display = 'none';
  });

  return doc.body.innerHTML;
}

function linkifyTicketReferencesInHtml(html: string): string {
  if (!html || typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  // Convert typed references like #SC24052026-123 into links.
  const ticketRefPattern = /(^|[\s([{])#((?=[A-Za-z0-9_-]*\d)[A-Za-z0-9][A-Za-z0-9_-]{1,})\b/g;

  for (const node of textNodes) {
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent.closest('a, code, pre, script, style, [data-rte-image-wrapper="true"]')) continue;

    const originalText = node.nodeValue ?? '';
    if (!originalText.includes('#')) continue;

    ticketRefPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let changed = false;
    const fragment = doc.createDocumentFragment();

    while ((match = ticketRefPattern.exec(originalText)) !== null) {
      const prefix = match[1] ?? '';
      const token = match[2] ?? '';
      const startIndex = match.index + prefix.length;
      const endIndex = startIndex + token.length + 1;

      const before = originalText.slice(lastIndex, startIndex);
      if (before) {
        fragment.appendChild(doc.createTextNode(before));
      }

      const link = doc.createElement('a');
      link.href = `/tickets/${encodeURIComponent(token)}`;
      link.textContent = `#${token}`;
      link.setAttribute('target', '_self');
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('data-ticket-reference', 'true');
      fragment.appendChild(link);

      lastIndex = endIndex;
      changed = true;
    }

    if (!changed) continue;

    const tail = originalText.slice(lastIndex);
    if (tail) {
      fragment.appendChild(doc.createTextNode(tail));
    }

    node.parentNode?.replaceChild(fragment, node);
  }

  return doc.body.innerHTML;
}

function detectResizeDirectionFromBorder(
  wrapper: HTMLElement,
  clientX: number,
  clientY: number,
  threshold = 20,
): string | null {
  const rect = wrapper.getBoundingClientRect();
  const nearLeft = Math.abs(clientX - rect.left) <= threshold;
  const nearRight = Math.abs(clientX - rect.right) <= threshold;
  const nearTop = Math.abs(clientY - rect.top) <= threshold;
  const nearBottom = Math.abs(clientY - rect.bottom) <= threshold;

  if (nearTop && nearLeft) return 'nw';
  if (nearTop && nearRight) return 'ne';
  if (nearBottom && nearRight) return 'se';
  if (nearBottom && nearLeft) return 'sw';
  if (nearTop) return 'n';
  if (nearBottom) return 's';
  if (nearRight) return 'e';
  if (nearLeft) return 'w';
  return null;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Écrivez votre description...',
  className = '',
  minHeight = '150px',
  enableTicketReferences = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const deletedImageSnapshotRef = useRef<{
    html: string;
    parent: HTMLElement;
    nextSibling: Node | null;
  } | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const dropIndicatorRef = useRef<HTMLElement | null>(null);
  const isDraggingRef = useRef(false);
  // Initialized to a sentinel so the first useEffect run always sets the DOM from props.
  // After that, we set this to whatever we emit so our own onChange echo is ignored.
  const internalValueRef = useRef('\x00');

  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [isFocused, setIsFocused] = useState(false);
  const selectedImageRef = useRef<HTMLElement | null>(null);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedImageSrc, setExpandedImageSrc] = useState<string | null>(null);

  const setSelectedImage = useCallback((image: HTMLElement | null) => {
    selectedImageRef.current = image;
    setHasSelectedImage(Boolean(image));
  }, []);

  const readImageAsDataUrl = useCallback((file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }), []);

  const optimizeImageDataUrl = useCallback(async (file: File) => {
    if (file.type === 'image/png' || file.type === 'image/webp') {
      return readImageAsDataUrl(file).catch(() => '');
    }

    const rawDataUrl = await readImageAsDataUrl(file).catch(() => '');
    if (!rawDataUrl || typeof window === 'undefined') return rawDataUrl;

    const image = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = rawDataUrl;
    });
    if (!loaded) return rawDataUrl;

    const outputMimeType = file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg';

    // Aggressive compression: target ~20KB max for insertion
    const maxWidth = 700;
    const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    const targetLength = 20000; // Reduced from 32000
    let nextWidth = width;
    let nextHeight = height;
    let best = rawDataUrl;

    for (let pass = 0; pass < 8; pass += 1) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      ctx.clearRect(0, 0, nextWidth, nextHeight);
      ctx.drawImage(image, 0, 0, nextWidth, nextHeight);

      if (outputMimeType === 'image/png') {
        const candidate = canvas.toDataURL('image/png');
        if (candidate.length < best.length) best = candidate;
        if (candidate.length <= targetLength) return candidate;
      } else {
        // More aggressive quality reduction
        const qualities = [0.65, 0.55, 0.45, 0.35, 0.25];
        for (const q of qualities) {
          const candidate = canvas.toDataURL(outputMimeType, q);
          if (candidate.length < best.length) best = candidate;
          if (candidate.length <= targetLength) return candidate;
        }
      }

      if (nextWidth <= 200 || nextHeight <= 200) break;
      nextWidth = Math.max(200, Math.round(nextWidth * 0.75));
      nextHeight = Math.max(200, Math.round(nextHeight * 0.75));
    }

    return best;
  }, [readImageAsDataUrl]);

  const uploadEditorImage = useCallback(async (dataUrl: string, originalName: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const formData = new FormData();
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
    const inferredMimeType = dataUrl.startsWith('data:image/png')
      ? 'image/png'
      : dataUrl.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';
    const extension = inferredMimeType === 'image/png' ? '.png' : inferredMimeType === 'image/webp' ? '.webp' : '.jpg';
    formData.append('file', new File([blob], `${baseName}${extension}`, { type: inferredMimeType }));

    const uploadResponse = await fetch('/api/tickets/editor-images', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('upload_failed');
    }

    const payload = await uploadResponse.json().catch(() => ({}));
    if (typeof payload?.fileUrl === 'string' && payload.fileUrl) {
      return payload.fileUrl as string;
    }

    throw new Error('missing_file_url');
  }, []);

  const uploadEditorFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch('/api/tickets/editor-images', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('upload_failed');
    }

    const payload = await uploadResponse.json().catch(() => ({}));
    if (typeof payload?.fileUrl === 'string' && payload.fileUrl) {
      return payload.fileUrl as string;
    }

    throw new Error('missing_file_url');
  }, []);

  const createImageWrapper = useCallback((image: HTMLImageElement) => {
    if (typeof window === 'undefined') return null;

    const existingWrapper = image.closest('[data-rte-image-wrapper="true"]') as HTMLElement | null;
    if (existingWrapper) return existingWrapper;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-rte-image-wrapper', 'true');
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.style.position = 'relative';
    wrapper.style.maxWidth = '100%';
    wrapper.style.display = 'inline-block';
    wrapper.style.verticalAlign = 'middle';
    wrapper.style.background = 'transparent';
    wrapper.style.border = '1px solid transparent';
    wrapper.style.borderRadius = '8px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.overflow = 'visible';
    wrapper.style.margin = image.style.margin || '8px 0';
    wrapper.style.cursor = 'pointer';

    const measuredWidth = Math.round(image.getBoundingClientRect().width || image.clientWidth || 380);
    const fromStyle = image.style.width?.trim();
    wrapper.style.width = fromStyle && fromStyle !== '100%' ? fromStyle : `${measuredWidth}px`;

    image.setAttribute('data-rte-image', 'true');
    image.draggable = false;
    image.style.width = '100%';
    image.style.height = 'auto';
    image.style.display = 'block';
    image.style.background = 'transparent';
    image.style.borderRadius = image.style.borderRadius || '8px';

    const parent = image.parentNode;
    if (!parent) return null;
    parent.insertBefore(wrapper, image);
    wrapper.appendChild(image);
    addResizeHandlesToWrapper(wrapper);

    return wrapper;
  }, []);

  const saveSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const placeCaretAfter = useCallback((node: Node) => {
    if (typeof window === 'undefined' || !editorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    saveSelection();
  }, [saveSelection]);

  const restoreSelection = useCallback(() => {
    if (typeof window === 'undefined' || !savedRangeRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    if (isFocused || isDraggingRef.current) return;
    // Skip reset when the value change was produced by our own handleInput.
    // This prevents the race condition where onChange(newHtml) updates the parent,
    // but the effect fires before isFocused=true propagates, wiping the new position.
    if (value === internalValueRef.current) return;
    const withTicketLinks = linkifyTicketReferencesInHtml(value);
    const cleanValue = cleanHtmlContent(withTicketLinks);
    const currentHtml = editorRef.current.innerHTML;
    if (currentHtml !== cleanValue) {
      editorRef.current.innerHTML = cleanValue || '';
    }
    internalValueRef.current = value;
  }, [value, isFocused]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const withTicketLinks = linkifyTicketReferencesInHtml(html);
      const sanitized = sanitizeEditorArtifacts(withTicketLinks);
      // Record before calling onChange so useEffect can skip the echo
      internalValueRef.current = sanitized;
      onChange(sanitized);
      saveSelection();
    }
  }, [onChange, saveSelection]);

  const handleBlur = useCallback(() => {
    // Don't process blur while a drag is in progress — it would reset the DOM
    if (isDraggingRef.current) return;
    setIsFocused(false);
    saveSelection();
    editorRef.current?.querySelectorAll('[data-rte-image-wrapper="true"]').forEach((node) => {
      const element = node as HTMLElement;
      element.style.outline = 'none';
      element.style.outlineOffset = '0';
      element.querySelectorAll('[data-rte-image-handle]').forEach((h) => {
        (h as HTMLElement).style.display = 'none';
      });
    });
    setSelectedImage(null);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const withTicketLinks = linkifyTicketReferencesInHtml(html);
      const sanitized = sanitizeEditorArtifacts(withTicketLinks);
      const cleaned = cleanHtmlContent(sanitized);
      if (cleaned !== html) {
        editorRef.current.innerHTML = cleaned;
        onChange(cleaned);
      }
    }
  }, [onChange, saveSelection]);

  const execCommand = useCallback((command: string, valueArg?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, valueArg);
    saveSelection();
    setSelectedImage(null);
    handleInput();
  }, [handleInput, restoreSelection, saveSelection]);

  const insertLinkAtSelection = useCallback((url: string, label?: string) => {
    if (typeof window === 'undefined' || !editorRef.current) return;

    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      execCommand('insertHTML', `<a href="${url}">${label || url}</a>&nbsp;`);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      execCommand('insertHTML', `<a href="${url}">${label || url}</a>&nbsp;`);
      return;
    }

    if (range.collapsed) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.textContent = label || url;
      anchor.setAttribute('target', '_self');
      anchor.setAttribute('rel', 'noopener noreferrer');
      range.insertNode(anchor);

      const space = document.createTextNode(' ');
      anchor.parentNode?.insertBefore(space, anchor.nextSibling);
      placeCaretAfter(space);
      handleInput();
      return;
    }

    document.execCommand('createLink', false, url);
    saveSelection();
    handleInput();
  }, [execCommand, handleInput, placeCaretAfter, restoreSelection, saveSelection]);

  const normalizeUrl = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return '';
    if (value.startsWith('/')) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(value)) return `https://${value}`;
    return value;
  }, []);

  const updateActiveStyles = useCallback(() => {
    setActiveStyles({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  const insertLink = useCallback(() => {
    saveSelection();
    const urlInput = prompt("Entrez l'URL du lien:");
    if (!urlInput) return;

    const url = normalizeUrl(urlInput);
    if (!url) return;
    insertLinkAtSelection(url);
  }, [insertLinkAtSelection, normalizeUrl, saveSelection]);

  const insertTicketReference = useCallback(async () => {
    if (typeof window === 'undefined') return;

    saveSelection();
    const rawInput = prompt("Entrez l'ID ou le numéro du ticket à référencer:")?.trim();
    if (!rawInput) return;

    const normalizedInput = rawInput.replace(/^#/, '').trim();
    if (!normalizedInput) return;

    try {
      const candidates = Array.from(new Set([rawInput, normalizedInput]));
      let resolvedId = '';
      let resolvedNumero = '';

      for (const candidate of candidates) {
        const byId = await fetch(`/api/tickets/${encodeURIComponent(candidate)}`, { cache: 'no-store' });
        if (!byId.ok) continue;
        const payload = await byId.json();
        resolvedId = String(payload?.id ?? candidate).trim();
        resolvedNumero = String(payload?.numero ?? '').trim();
        if (resolvedId) break;
      }

      if (!resolvedId) {
        const listRes = await fetch(`/api/tickets/list?search=${encodeURIComponent(normalizedInput)}`, { cache: 'no-store' });
        if (listRes.ok) {
          const list = await listRes.json();
          if (Array.isArray(list)) {
            const normalizedLower = normalizedInput.toLowerCase();
            const match = list.find((item: any) => {
              const id = String(item?.id ?? '').trim().toLowerCase();
              const numero = String(item?.numero ?? '').trim().toLowerCase();
              const numeroWithoutHash = numero.startsWith('#') ? numero.slice(1) : numero;
              return (
                id === normalizedLower
                || numero === normalizedLower
                || numeroWithoutHash === normalizedLower
              );
            });
            if (match) {
              resolvedId = String(match.id ?? '').trim();
              resolvedNumero = String(match.numero ?? '').trim();
            }
          }
        }
      }

      if (!resolvedId) {
        window.alert('Ticket introuvable. Vérifiez l\'ID ou le numéro saisi.');
        return;
      }

      const href = `/tickets/${encodeURIComponent(resolvedId)}`;
      const label = resolvedNumero || (rawInput.startsWith('#') ? rawInput : `#${rawInput}`);
      insertLinkAtSelection(href, label);
    } catch {
      window.alert('Impossible de vérifier ce ticket pour le moment.');
    }
  }, [insertLinkAtSelection, saveSelection]);

  const applyHighlightColor = useCallback((color: string) => {
    const editor = editorRef.current;
    if (!editor || typeof window === 'undefined') return;

    const applyInlineStyleToSelection = (styleText: string) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return false;

      const fragment = range.extractContents();
      fragment.querySelectorAll('*').forEach((node) => {
        const element = node as HTMLElement;
        element.style.removeProperty('background-color');
      });
      const span = document.createElement('span');
      span.setAttribute('style', styleText);
      span.appendChild(fragment);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
      saveSelection();
      return true;
    };

    editor.focus();
    restoreSelection();
    const applied = applyInlineStyleToSelection(`background-color: ${color};`);

    // Keep support for caret mode when no selection is active.
    if (!applied) {
      document.execCommand('styleWithCSS', false, 'true');
      const ok = document.execCommand('hiliteColor', false, color);
      if (!ok) {
        document.execCommand('backColor', false, color);
      }
    }

    saveSelection();
    handleInput();
  }, [handleInput, restoreSelection, saveSelection]);

  const applyTextColor = useCallback((color: string) => {
    const editor = editorRef.current;
    if (!editor || typeof window === 'undefined') return;

    const applyInlineStyleToSelection = (styleText: string) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return false;

      const fragment = range.extractContents();
      fragment.querySelectorAll('*').forEach((node) => {
        const element = node as HTMLElement;
        element.style.removeProperty('color');
        element.style.removeProperty('text-decoration-color');
      });
      fragment.querySelectorAll('font[color]').forEach((node) => {
        node.removeAttribute('color');
      });
      const span = document.createElement('span');
      span.setAttribute('style', styleText);
      span.appendChild(fragment);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
      saveSelection();
      return true;
    };

    editor.focus();
    restoreSelection();
    const applied = applyInlineStyleToSelection(`color: ${color}; text-decoration-color: ${color};`);

    // Keep support for caret mode when no selection is active.
    if (!applied) {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
    }

    saveSelection();
    handleInput();
  }, [handleInput, restoreSelection, saveSelection]);

  const insertImage = useCallback(() => {
    saveSelection();
    fileInputRef.current?.click();
  }, [saveSelection]);

  const insertImageBlockAtCaret = useCallback((src: string) => {
    if (typeof window === 'undefined' || !editorRef.current) return null;

    const editor = editorRef.current;
    const selection = window.getSelection();
    let range: Range | null = null;

    if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (editor.contains(currentRange.commonAncestorContainer)) {
        range = currentRange.cloneRange();
      }
    }

    if (!range && savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
      range = savedRangeRef.current.cloneRange();
    }

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const beforeP = document.createElement('p');
    beforeP.appendChild(document.createElement('br'));

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-rte-image-wrapper', 'true');
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.style.position = 'relative';
    wrapper.style.width = '380px';
    wrapper.style.maxWidth = '100%';
    wrapper.style.display = 'inline-block';
    wrapper.style.verticalAlign = 'middle';
    wrapper.style.background = 'transparent';
    wrapper.style.border = '1px solid transparent';
    wrapper.style.borderRadius = '8px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.overflow = 'visible';
    wrapper.style.margin = '8px 0';
    wrapper.style.cursor = 'pointer';

    const image = document.createElement('img');
    image.src = src;
    image.alt = 'Image';
    image.setAttribute('data-rte-image', 'true');
    image.draggable = false;
    image.style.width = '100%';
    image.style.height = 'auto';
    image.style.display = 'block';
    image.style.background = 'transparent';
    image.style.borderRadius = '8px';
    image.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

    wrapper.appendChild(image);
    addResizeHandlesToWrapper(wrapper);

    const afterP = document.createElement('p');
    afterP.appendChild(document.createElement('br'));

    const fragment = document.createDocumentFragment();
    fragment.appendChild(beforeP);
    fragment.appendChild(wrapper);
    fragment.appendChild(afterP);

    range.deleteContents();
    range.insertNode(fragment);
    placeCaretAfter(afterP);
    return wrapper;
  }, [placeCaretAfter]);

  const onImageSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) {
      event.target.value = '';
      return;
    }

    editorRef.current?.focus();
    restoreSelection();

    for (const file of files) {
      const dataUrl = await optimizeImageDataUrl(file);
      if (!dataUrl) continue;

      let finalSrc = dataUrl;
      try {
        finalSrc = (file.type === 'image/png' || file.type === 'image/webp')
          ? await uploadEditorFile(file)
          : await uploadEditorImage(dataUrl, file.name);
      } catch {
        finalSrc = dataUrl;
      }

      insertImageBlockAtCaret(finalSrc);
    }

    setSelectedImage(null);
    handleInput();
    event.target.value = '';
  }, [handleInput, insertImageBlockAtCaret, optimizeImageDataUrl, restoreSelection, uploadEditorFile, uploadEditorImage]);

  const resizeSelectedImage = useCallback(() => {
    const imageWrapper = selectedImageRef.current;
    if (!imageWrapper || !imageWrapper.isConnected) return;
    const currentWidth = Math.round(imageWrapper.getBoundingClientRect().width || imageWrapper.clientWidth || 420);
    const widthInput = prompt("Largeur de l'image en px (ex: 420)", String(currentWidth));
    if (!widthInput) return;
    const nextWidth = Number(widthInput);
    if (!Number.isFinite(nextWidth) || nextWidth < 40) return;

    imageWrapper.style.width = `${Math.round(nextWidth)}px`;
    imageWrapper.style.maxWidth = '100%';
    imageWrapper.style.height = 'auto';
    imageWrapper.style.display = 'inline-block';
    imageWrapper.style.position = 'relative';
    imageWrapper.style.overflow = 'visible';
    editorRef.current?.focus();
    placeCaretAfter(imageWrapper);
    handleInput();
  }, [handleInput, placeCaretAfter]);

  const cropSelectedImage = useCallback(() => {
    const wrapper = selectedImageRef.current;
    if (!wrapper || !wrapper.isConnected) return;
    const img = wrapper.querySelector('img') as HTMLImageElement | null;
    if (!img) return;

    const rect = wrapper.getBoundingClientRect();
    const defaultWidth = Math.round(rect.width || wrapper.offsetWidth || 380);
    const defaultHeight = Math.round(rect.height || wrapper.offsetHeight || 240);

    const widthInput = prompt("Largeur du rognage en px (ex: 420)", String(defaultWidth));
    if (!widthInput) return;
    const heightInput = prompt("Hauteur du rognage en px (ex: 240)", String(defaultHeight));
    if (!heightInput) return;

    const nextWidth = Number(widthInput);
    const nextHeight = Number(heightInput);
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return;
    if (nextWidth < 40 || nextHeight < 40) return;

    wrapper.style.width = `${Math.round(nextWidth)}px`;
    wrapper.style.height = `${Math.round(nextHeight)}px`;
    wrapper.style.maxWidth = '100%';
    wrapper.style.display = 'block';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'visible';

    img.style.width = '100%';
    img.style.height = '100%';
    img.style.maxWidth = 'none';
    img.style.objectFit = 'cover';
    img.style.objectPosition = 'center';
    img.style.display = 'block';

    editorRef.current?.focus();
    placeCaretAfter(wrapper);
    handleInput();
  }, [handleInput, placeCaretAfter]);

  const resetSelectedImageCrop = useCallback(() => {
    const wrapper = selectedImageRef.current;
    if (!wrapper || !wrapper.isConnected) return;
    const img = wrapper.querySelector('img') as HTMLImageElement | null;
    if (!img) return;

    wrapper.style.removeProperty('height');
    wrapper.style.overflow = 'visible';

    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxWidth = '100%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center';
    img.style.display = 'block';

    editorRef.current?.focus();
    placeCaretAfter(wrapper);
    handleInput();
  }, [handleInput, placeCaretAfter]);

  const centerSelectedImage = useCallback(() => {
    const imageWrapper = selectedImageRef.current;
    if (!imageWrapper || !imageWrapper.isConnected) {
      execCommand('justifyCenter');
      return;
    }
    imageWrapper.style.display = 'inline-block';
    imageWrapper.style.margin = '8px auto';
    imageWrapper.style.float = 'none';
    imageWrapper.style.position = 'relative';
    imageWrapper.style.overflow = 'visible';
    editorRef.current?.focus();
    placeCaretAfter(imageWrapper);
    handleInput();
  }, [execCommand, handleInput, placeCaretAfter]);

  const alignImageRight = useCallback(() => {
    const imageWrapper = selectedImageRef.current;
    if (!imageWrapper || !imageWrapper.isConnected) {
      execCommand('justifyRight');
      return;
    }
    imageWrapper.style.display = 'inline-block';
    imageWrapper.style.margin = '8px 0 8px auto';
    imageWrapper.style.float = 'none';
    imageWrapper.style.position = 'relative';
    imageWrapper.style.overflow = 'visible';
    editorRef.current?.focus();
    placeCaretAfter(imageWrapper);
    handleInput();
  }, [execCommand, handleInput, placeCaretAfter]);

  const alignImageLeft = useCallback(() => {
    const imageWrapper = selectedImageRef.current;
    if (!imageWrapper || !imageWrapper.isConnected) {
      execCommand('justifyLeft');
      return;
    }
    imageWrapper.style.display = 'inline-block';
    imageWrapper.style.margin = '8px 0';
    imageWrapper.style.float = 'none';
    imageWrapper.style.position = 'relative';
    imageWrapper.style.overflow = 'visible';
    editorRef.current?.focus();
    placeCaretAfter(imageWrapper);
    handleInput();
  }, [execCommand, handleInput, placeCaretAfter]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  }, [handleInput]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    saveSelection();
  }, [saveSelection]);

  const selectImageWrapper = useCallback((wrapper: HTMLElement | null) => {
    editorRef.current?.querySelectorAll('[data-rte-image-wrapper="true"]').forEach((node) => {
      const element = node as HTMLElement;
      element.style.outline = 'none';
      element.style.outlineOffset = '0';
      element.querySelectorAll('[data-rte-image-handle]').forEach((h) => {
        (h as HTMLElement).style.display = 'none';
      });
    });

    if (wrapper) {
      wrapper.style.outline = '2px solid #0ea5e9';
      wrapper.style.outlineOffset = '2px';
      wrapper.querySelectorAll('[data-rte-image-handle]').forEach((h) => {
        (h as HTMLElement).style.display = 'block';
      });
      setSelectedImage(wrapper);
    } else {
      setSelectedImage(null);
      setIsCropMode(false);
    }
  }, [setSelectedImage]);

  const startMoveDrag = useCallback((wrapper: HTMLElement, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const editor = editorRef.current;
    if (!editor) return;

    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let dropLine: HTMLElement | null = null;
    let zoneOverlay: HTMLElement | null = null;

    // What will happen at drop
    let dropRefNode: Node | null = null;      // insertBefore this (null = appendChild)
    let dropAlign: 'left' | 'center' | 'right' = 'center';

    const cleanup = () => {
      if (ghost)        { ghost.remove();        ghost = null; }
      if (dropLine)     { dropLine.remove();     dropLine = null; }
      if (zoneOverlay)  { zoneOverlay.remove();  zoneOverlay = null; }
      document.body.style.cursor = '';
      ghostRef.current = null;
      dropIndicatorRef.current = null;
    };

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < 5) return;

      if (!dragging) {
        dragging = true;
        isDraggingRef.current = true;
        setIsFocused(true);
        wrapper.style.opacity = '0.2';
        document.body.style.cursor = 'grabbing';

        // Ghost image that follows cursor
        ghost = wrapper.cloneNode(true) as HTMLElement;
        ghost.style.cssText = [
          'position:fixed',
          'pointer-events:none',
          'z-index:9999',
          'opacity:0.82',
          'box-shadow:0 16px 40px rgba(0,0,0,0.28)',
          'transform:rotate(1.2deg) scale(1.03)',
          'border-radius:8px',
          'outline:none',
          `width:${wrapper.offsetWidth}px`,
          'transition:none',
        ].join(';');
        ghost.querySelectorAll('[data-rte-image-handle]').forEach(
          (h) => { (h as HTMLElement).style.display = 'none'; }
        );
        document.body.appendChild(ghost);
        ghostRef.current = ghost;

        // Horizontal drop-line
        dropLine = document.createElement('div');
        dropLine.style.cssText = [
          'position:fixed',
          'height:3px',
          'background:#0ea5e9',
          'border-radius:9999px',
          'pointer-events:none',
          'z-index:9997',
          'display:none',
          'box-shadow:0 0 10px rgba(14,165,233,0.7)',
          'transition:top 60ms ease',
        ].join(';');
        document.body.appendChild(dropLine);
        dropIndicatorRef.current = dropLine;

        // Zone overlay: Left | Center | Right bands shown on the editor
        zoneOverlay = document.createElement('div');
        zoneOverlay.style.cssText = [
          'position:fixed',
          'pointer-events:none',
          'z-index:9996',
          'display:flex',
          'border-radius:6px',
          'overflow:hidden',
          'opacity:0',
          'transition:opacity 0.15s ease',
        ].join(';');
        ['Gauche', 'Centre', 'Droite'].forEach((label, i) => {
          const band = document.createElement('div');
          band.setAttribute('data-zone', ['left', 'center', 'right'][i]);
          band.style.cssText = [
            'flex:1',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'font-size:11px',
            'font-weight:600',
            'letter-spacing:0.05em',
            'color:rgba(14,165,233,0.8)',
            'padding:4px 0',
            'transition:background 0.12s ease',
            'background:rgba(14,165,233,0.05)',
          ].join(';');
          band.textContent = label;
          zoneOverlay!.appendChild(band);
        });
        document.body.appendChild(zoneOverlay);
      }

      // Move ghost
      if (ghost) {
        ghost.style.left = `${e.clientX - wrapper.offsetWidth / 2}px`;
        ghost.style.top = `${e.clientY - 36}px`;
      }

      const edRect = editor.getBoundingClientRect();
      const inside =
        e.clientX >= edRect.left && e.clientX <= edRect.right &&
        e.clientY >= edRect.top  && e.clientY <= edRect.bottom;

      if (!inside) {
        if (dropLine) dropLine.style.display = 'none';
        if (zoneOverlay) zoneOverlay.style.opacity = '0';
        return;
      }

      // Position zone overlay on top of editor
      if (zoneOverlay) {
        zoneOverlay.style.left   = `${edRect.left}px`;
        zoneOverlay.style.top    = `${edRect.top}px`;
        zoneOverlay.style.width  = `${edRect.width}px`;
        zoneOverlay.style.height = '28px';
        zoneOverlay.style.opacity = '1';
      }

      // Determine alignment from X (thirds)
      const xRatio = (e.clientX - edRect.left) / edRect.width;
      dropAlign =
        xRatio < 0.33 ? 'left' :
        xRatio > 0.67 ? 'right' : 'center';

      // Highlight active zone band
      if (zoneOverlay) {
        zoneOverlay.querySelectorAll('[data-zone]').forEach((band) => {
          const el = band as HTMLElement;
          const active = el.getAttribute('data-zone') === dropAlign;
          el.style.background = active
            ? 'rgba(14,165,233,0.18)'
            : 'rgba(14,165,233,0.04)';
          el.style.color = active
            ? '#0ea5e9'
            : 'rgba(14,165,233,0.5)';
        });
      }

      // Vertical drop position among children
      const kids = Array.from(editor.children).filter(
        (c) => c !== wrapper
      ) as HTMLElement[];

      let refNode: Node | null = null;
      let lineY = edRect.top + 4;
      let found = false;

      for (const child of kids) {
        const r = child.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) {
          refNode = child;
          lineY = r.top - 2;
          found = true;
          break;
        }
        lineY = r.bottom + 2;
      }
      if (!found && kids.length > 0) {
        lineY = kids[kids.length - 1].getBoundingClientRect().bottom + 2;
      }

      dropRefNode = refNode;

      if (dropLine) {
        dropLine.style.left  = `${edRect.left + 8}px`;
        dropLine.style.width = `${edRect.width - 16}px`;
        dropLine.style.top   = `${lineY}px`;
        dropLine.style.display = 'block';
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      cleanup();

      if (!dragging) {
        isDraggingRef.current = false;
        saveSelection();
        return;
      }

      wrapper.style.opacity = '';
      wrapper.style.cursor = 'pointer';
      editor.focus();

      wrapper.remove();

      // Apply horizontal alignment
      if (dropAlign === 'left') {
        wrapper.style.float   = 'left';
        wrapper.style.margin  = '4px 16px 4px 0';
        wrapper.style.display = 'block';
      } else if (dropAlign === 'right') {
        wrapper.style.float   = 'right';
        wrapper.style.margin  = '4px 0 4px 16px';
        wrapper.style.display = 'block';
      } else {
        wrapper.style.float   = '';
        wrapper.style.margin  = '8px auto';
        wrapper.style.display = 'block';
      }

      // Insert at vertical drop position
      if (dropRefNode && editor.contains(dropRefNode)) {
        editor.insertBefore(wrapper, dropRefNode);
      } else {
        editor.appendChild(wrapper);
      }

      // Ensure cursor-landing spacers before/after
      const prev = wrapper.previousSibling as HTMLElement | null;
      if (!prev || prev.getAttribute?.('data-rte-image-wrapper') === 'true') {
        const sp = document.createElement('p');
        sp.appendChild(document.createElement('br'));
        editor.insertBefore(sp, wrapper);
      }
      const next = wrapper.nextSibling as HTMLElement | null;
      if (!next || next.getAttribute?.('data-rte-image-wrapper') === 'true') {
        const sp = document.createElement('p');
        sp.appendChild(document.createElement('br'));
        if (wrapper.nextSibling) editor.insertBefore(sp, wrapper.nextSibling);
        else editor.appendChild(sp);
      }

      // Emit HTML directly — bypass handleInput race condition
      const finalHtml = editor.innerHTML;
      const sanitized = sanitizeEditorArtifacts(finalHtml);
      internalValueRef.current = sanitized;
      onChange(sanitized);
      saveSelection();
      selectImageWrapper(wrapper);

      setTimeout(() => { isDraggingRef.current = false; }, 80);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onChange, saveSelection, selectImageWrapper]);

  const resolveImageWrapperFromTarget = useCallback((target: HTMLElement) => {
    const wrapped = target.closest('[data-rte-image-wrapper="true"]') as HTMLElement | null;
    if (wrapped) return wrapped;

    const image = target instanceof HTMLImageElement
      ? target
      : (target.closest('img') as HTMLImageElement | null);
    if (!image || !editorRef.current?.contains(image)) return null;

    const created = createImageWrapper(image);
    if (created) {
      handleInput();
    }
    return created;
  }, [createImageWrapper, handleInput]);

  const startResizeDrag = useCallback((wrapper: HTMLElement, direction: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    selectImageWrapper(wrapper);

    const editor = editorRef.current;
    if (!editor) return;

    const rect = wrapper.getBoundingClientRect();
    const imgEl = wrapper.querySelector('img') as HTMLImageElement | null;
    const natW = imgEl?.naturalWidth || 1;
    const natH = imgEl?.naturalHeight || 1;
    const aspectRatio = natW / natH;

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width || 380;
    const startHeight = rect.height || (startWidth / aspectRatio) || 280;
    const cropModeActive = false;

    const handleCursor = (event.target as HTMLElement).style.cursor || 'se-resize';
    document.body.style.cursor = handleCursor;
    isDraggingRef.current = true;
    setIsFocused(true);

    // Show a resize size tooltip
    const sizeLabel = document.createElement('div');
    sizeLabel.style.cssText = [
      'position:fixed',
      'background:rgba(0,0,0,0.7)',
      'color:#fff',
      'font-size:11px',
      'padding:3px 7px',
      'border-radius:4px',
      'pointer-events:none',
      'z-index:9999',
      `left:${event.clientX + 12}px`,
      `top:${event.clientY - 24}px`,
    ].join(';');
    sizeLabel.textContent = cropModeActive
      ? `${Math.round(startWidth)} x ${Math.round(startHeight)} px`
      : `${Math.round(startWidth)} px`;
    document.body.appendChild(sizeLabel);

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (cropModeActive) {
        if (direction.includes('e')) newWidth = startWidth + dx;
        if (direction.includes('w')) newWidth = startWidth - dx;
        if (direction.includes('s')) newHeight = startHeight + dy;
        if (direction.includes('n')) newHeight = startHeight - dy;

        if (direction === 'n') newWidth = startWidth;
        if (direction === 's') newWidth = startWidth;
        if (direction === 'e') newHeight = startHeight;
        if (direction === 'w') newHeight = startHeight;

        newWidth = Math.max(60, Math.round(newWidth));
        newHeight = Math.max(60, Math.round(newHeight));

        wrapper.style.width = `${newWidth}px`;
        wrapper.style.height = `${newHeight}px`;
        wrapper.style.maxWidth = 'none';
        wrapper.style.overflow = 'visible';

        if (imgEl) {
          imgEl.style.width = '100%';
          imgEl.style.height = '100%';
          imgEl.style.maxWidth = 'none';
          imgEl.style.objectFit = 'cover';
          imgEl.style.objectPosition = 'center';
          imgEl.style.display = 'block';
        }
      } else {
        if (direction === 'e' || direction === 'ne' || direction === 'se') {
          newWidth = startWidth + dx;
        } else if (direction === 'w' || direction === 'nw' || direction === 'sw') {
          newWidth = startWidth - dx;
        } else if (direction === 'n') {
          newWidth = startWidth - dy * aspectRatio;
        } else if (direction === 's') {
          newWidth = startWidth + dy * aspectRatio;
        }

        newWidth = Math.max(60, Math.round(newWidth));
        wrapper.style.width = `${newWidth}px`;
        wrapper.style.maxWidth = 'none';
      }

      // Update label
      sizeLabel.style.left = `${moveEvent.clientX + 12}px`;
      sizeLabel.style.top = `${moveEvent.clientY - 24}px`;
      sizeLabel.textContent = cropModeActive
        ? `${newWidth} x ${newHeight} px`
        : `${newWidth} px`;
    };

    const onUp = () => {
      document.body.style.cursor = '';
      sizeLabel.remove();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      // Emit HTML directly — same pattern as drag to avoid race conditions
      editor.focus();
      const finalHtml = editor.innerHTML;
      const sanitized = sanitizeEditorArtifacts(finalHtml);
      internalValueRef.current = sanitized;
      onChange(sanitized);
      saveSelection();
      selectImageWrapper(wrapper);
      setTimeout(() => { isDraggingRef.current = false; }, 80);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onChange, saveSelection, selectImageWrapper]);

  const startCropPanDrag = useCallback((wrapper: HTMLElement, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const editor = editorRef.current;
    if (!editor) return;

    const imgEl = wrapper.querySelector('img') as HTMLImageElement | null;
    if (!imgEl) return;

    const rect = wrapper.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;

    const posRaw = (imgEl.style.objectPosition || '50% 50%').trim();
    const [rawX = '50%', rawY = '50%'] = posRaw.split(/\s+/);
    const parsePercent = (v: string, fallback: number) => {
      const n = Number(String(v).replace('%', ''));
      return Number.isFinite(n) ? n : fallback;
    };

    const startPosX = parsePercent(rawX, 50);
    const startPosY = parsePercent(rawY, 50);

    const clamp = (n: number) => Math.max(0, Math.min(100, n));

    imgEl.style.width = '100%';
    imgEl.style.height = '100%';
    imgEl.style.maxWidth = 'none';
    imgEl.style.objectFit = 'cover';
    imgEl.style.objectPosition = `${startPosX}% ${startPosY}%`;
    imgEl.style.display = 'block';

    if (!wrapper.style.height || wrapper.style.height === 'auto') {
      wrapper.style.height = `${Math.max(60, Math.round(rect.height || 240))}px`;
    }

    document.body.style.cursor = 'grabbing';
    wrapper.style.cursor = 'grabbing';
    isDraggingRef.current = true;
    setIsFocused(true);

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const width = Math.max(1, wrapper.getBoundingClientRect().width);
      const height = Math.max(1, wrapper.getBoundingClientRect().height);

      const nextX = clamp(startPosX - (dx / width) * 100);
      const nextY = clamp(startPosY - (dy / height) * 100);

      imgEl.style.objectPosition = `${nextX}% ${nextY}%`;
    };

    const onUp = () => {
      document.body.style.cursor = '';
      wrapper.style.cursor = 'pointer';
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      editor.focus();
      const finalHtml = editor.innerHTML;
      const sanitized = sanitizeEditorArtifacts(finalHtml);
      internalValueRef.current = sanitized;
      onChange(sanitized);
      saveSelection();
      selectImageWrapper(wrapper);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onChange, saveSelection, selectImageWrapper]);

  const handleEditorMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const wrapper = resolveImageWrapperFromTarget(target);
    if (!wrapper) return;

    e.preventDefault();
    editorRef.current?.focus();
    selectImageWrapper(wrapper);

    // Detect which resize handle was clicked (any direction)
    const handle = target.closest('[data-rte-image-handle]') as HTMLElement | null;
    if (handle) {
      const direction = handle.getAttribute('data-rte-image-handle') || 'se';
      startResizeDrag(wrapper, direction, e);
      return;
    }

    // Border fallback: resizing works even if a handle is hard to grab.
    const borderDirection = detectResizeDirectionFromBorder(wrapper, e.clientX, e.clientY);
    if (borderDirection) {
      startResizeDrag(wrapper, borderDirection, e);
      return;
    }

    startMoveDrag(wrapper, e);
  }, [resolveImageWrapperFromTarget, selectImageWrapper, startMoveDrag, startResizeDrag]);

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const wrapper = resolveImageWrapperFromTarget(target);
    if (wrapper) {
      selectImageWrapper(wrapper);
      saveSelection();
      
      // Open lightbox if clicking on the image (but not on resize handles)
      const handle = target.closest('[data-rte-image-handle]') as HTMLElement | null;
      const img = wrapper.querySelector('img') as HTMLImageElement | null;
      
      // Open lightbox if: image exists, click wasn't on a handle, and target is inside the wrapper
      if (img && !handle && (target === img || wrapper.contains(target))) {
        e.preventDefault();
        e.stopPropagation();
        setExpandedImageSrc(img.src);
      }
      return;
    }

    selectImageWrapper(null);
    saveSelection();
  }, [resolveImageWrapperFromTarget, saveSelection, selectImageWrapper, setExpandedImageSrc]);

  const restoreDeletedImage = useCallback(() => {
    const snapshot = deletedImageSnapshotRef.current;
    if (!snapshot) return false;

    const template = document.createElement('template');
    template.innerHTML = snapshot.html.trim();
    const restored = template.content.firstElementChild as HTMLElement | null;
    if (!restored) return false;

    if (snapshot.parent.isConnected) {
      if (snapshot.nextSibling && snapshot.parent.contains(snapshot.nextSibling)) {
        snapshot.parent.insertBefore(restored, snapshot.nextSibling);
      } else {
        snapshot.parent.appendChild(restored);
      }
    } else if (editorRef.current) {
      editorRef.current.appendChild(restored);
    } else {
      return false;
    }

    deletedImageSnapshotRef.current = null;
    selectImageWrapper(restored);
    handleInput();
    return true;
  }, [handleInput, selectImageWrapper]);

  const deleteSelectedImage = useCallback(() => {
    const imageWrapper = selectedImageRef.current;
    if (!imageWrapper || !imageWrapper.isConnected) return false;
    const parent = imageWrapper.parentNode instanceof HTMLElement ? imageWrapper.parentNode : null;
    if (!parent) return false;

    deletedImageSnapshotRef.current = {
      html: imageWrapper.outerHTML,
      parent,
      nextSibling: imageWrapper.nextSibling,
    };

    imageWrapper.remove();
    setSelectedImage(null);
    handleInput();
    return true;
  }, [handleInput, setSelectedImage]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (restoreDeletedImage()) {
        e.preventDefault();
      }
      return;
    }

    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    if (!selectedImageRef.current) return;

    e.preventDefault();
    deleteSelectedImage();
  }, [deleteSelectedImage, restoreDeletedImage]);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      // Close lightbox on ESC
      if (event.key === 'Escape' && expandedImageSrc) {
        setExpandedImageSrc(null);
        return;
      }

      const editor = editorRef.current;
      if (!editor) return;
      const active = document.activeElement;
      const inEditor = !!active && editor.contains(active);

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        if (!inEditor) return;
        if (restoreDeletedImage()) {
          event.preventDefault();
        }
        return;
      }

      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      if (!selectedImageRef.current || !selectedImageRef.current.isConnected) return;

      event.preventDefault();
      deleteSelectedImage();
    };

    window.addEventListener('keydown', onGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onGlobalKeyDown, { capture: true });
    };
  }, [deleteSelectedImage, restoreDeletedImage, expandedImageSrc]);

  const handleEditorDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const wrapper = resolveImageWrapperFromTarget(target);
    if (wrapper) {
      selectImageWrapper(wrapper);
      setTimeout(() => resizeSelectedImage(), 50);
    }
  }, [resolveImageWrapperFromTarget, resizeSelectedImage, selectImageWrapper]);

  const keepSelectionMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    editorRef.current?.focus();
    restoreSelection();
  }, [restoreSelection]);

  return (
    <div ref={containerRef} className={`border-2 border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden flex flex-col ${isExpanded ? 'fixed top-4 left-4 right-4 bottom-4 z-50 shadow-2xl' : className}`}>
      <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <Select onValueChange={(v) => execCommand('fontName', v)}>
          <SelectTrigger className="w-28 h-8 text-xs bg-white dark:bg-slate-700" onMouseDown={keepSelectionMouseDown}>
            <Type className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Police" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => execCommand('fontSize', v)}>
          <SelectTrigger className="w-20 h-8 text-xs bg-white dark:bg-slate-700" onMouseDown={keepSelectionMouseDown}>
            <SelectValue placeholder="Taille" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Toggle size="sm" pressed={activeStyles.bold} onPressedChange={() => execCommand('bold')} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <Bold className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" pressed={activeStyles.italic} onPressedChange={() => execCommand('italic')} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <Italic className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" pressed={activeStyles.underline} onPressedChange={() => execCommand('underline')} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <Underline className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Toggle size="sm" onPressedChange={() => (hasSelectedImage ? alignImageLeft() : execCommand('justifyLeft'))} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <AlignLeft className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => (hasSelectedImage ? centerSelectedImage() : execCommand('justifyCenter'))} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <AlignCenter className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => (hasSelectedImage ? alignImageRight() : execCommand('justifyRight'))} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <AlignRight className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Toggle size="sm" onPressedChange={() => execCommand('insertUnorderedList')} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <List className="w-4 h-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => execCommand('insertOrderedList')} onMouseDown={keepSelectionMouseDown} className="h-8 w-8">
          <ListOrdered className="w-4 h-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onMouseDown={keepSelectionMouseDown}>
              <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: '#000000' }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-6 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={keepSelectionMouseDown}
                  onClick={() => applyTextColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onMouseDown={keepSelectionMouseDown}>
              <Highlighter className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-6 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={keepSelectionMouseDown}
                  onClick={() => applyHighlightColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onMouseDown={keepSelectionMouseDown} onClick={insertLink}>
          <LinkIcon className="w-4 h-4" />
        </Button>

        {enableTicketReferences && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onMouseDown={keepSelectionMouseDown}
            onClick={() => void insertTicketReference()}
            title="Référencer un ticket"
          >
            <Ticket className="w-4 h-4" />
          </Button>
        )}

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onMouseDown={keepSelectionMouseDown} onClick={insertImage}>
          <ImageIcon className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 ml-auto"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }}
          title={isExpanded ? 'Réduire' : 'Agrandir'}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onImageSelected} />

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={() => {
          updateActiveStyles();
          saveSelection();
        }}
        onMouseUp={() => {
          updateActiveStyles();
          saveSelection();
        }}
        onDoubleClick={handleEditorDoubleClick}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseDown={handleEditorMouseDown}
        onClick={handleEditorClick}
        onKeyDown={handleEditorKeyDown}
        className={`rte-editor p-3 bg-white dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/20 overflow-y-auto flex-1 ${isExpanded ? 'max-h-none' : 'max-h-96'}`}
        style={{ minHeight: isExpanded ? 'calc(100vh - 160px)' : minHeight }}
        data-placeholder={placeholder}
      />

      <style jsx global>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        .rte-editor ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .rte-editor ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .rte-editor li {
          display: list-item;
          margin: 0.125rem 0;
        }

        .rte-editor a {
          color: #0284c7;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>

      {/* Image Lightbox Modal */}
      {expandedImageSrc && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{ zIndex: 9999 }}
          onClick={() => setExpandedImageSrc(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setExpandedImageSrc(null);
            }
          }}
          role="dialog"
          aria-label="Image lightbox"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setExpandedImageSrc(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors z-10"
              title="Fermer (ESC)"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image Container */}
            <div className="flex items-center justify-center max-w-4xl max-h-[90vh] overflow-auto rounded-lg">
              <img
                src={expandedImageSrc}
                alt="Expanded view"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onLoad={(e) => {
                  // Ensure image doesn't exceed viewport
                  const img = e.currentTarget;
                  const container = img.parentElement;
                  if (container) {
                    const containerHeight = window.innerHeight * 0.9;
                    const containerWidth = window.innerWidth * 0.9;
                    const maxDim = Math.min(containerWidth, containerHeight);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RichTextEditor;

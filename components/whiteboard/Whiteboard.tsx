'use client';

import '@excalidraw/excalidraw/index.css';

import dynamic from 'next/dynamic';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
} from 'react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { Command, HighlightCommand } from '@/lib/teaching/command-schema';
import { commandToElements } from './excalidraw-helpers';

// Excalidraw uses window APIs — must be client-only and lazy-loaded so the
// ~1.5 MB bundle doesn't ship to pages that don't use it.
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false },
);

const HIGHLIGHT_DEFAULT = '#FCD34D';

/** Tailwind's lg breakpoint — below this we auto-pan the canvas. */
const MOBILE_QUERY = '(max-width: 1023px)';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export interface WhiteboardHandle {
  /** Apply a single command. Non-visual commands (narrate, etc.) are ignored. */
  apply(cmd: Command): void;
  /** Wipe the canvas and reset the id mapping. */
  clear(): void;
}

interface WhiteboardProps {
  /** Logical width/height in canvas pixels. Defaults to 1200×700 per the brief. */
  width?: number;
  height?: number;
}

function WhiteboardImpl(
  { width = 1200, height = 700 }: WhiteboardProps,
  ref: ForwardedRef<WhiteboardHandle>,
) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  // Our command.id -> Excalidraw element.id, so `highlight` can find the target.
  const idMapRef = useRef<Map<string, string>>(new Map());

  useImperativeHandle(ref, () => ({
    apply(cmd) {
      const api = apiRef.current;
      if (!api) return;

      if (cmd.type === 'clear_board') {
        api.updateScene({ elements: [] });
        idMapRef.current.clear();
        return;
      }

      if (cmd.type === 'highlight') {
        applyHighlight(api, idMapRef.current, cmd);
        return;
      }

      const newElements = commandToElements(cmd);
      if (!newElements || newElements.length === 0) return;

      // Track our command id against the first generated element so highlight
      // can find the target later.
      if ('id' in cmd && newElements[0]) {
        idMapRef.current.set(cmd.id, newElements[0].id);
      }

      const existing = api.getSceneElements();
      api.updateScene({
        elements: [...existing, ...newElements],
      });

      // On mobile, smoothly pan to the new content so it stays in view. Zoom
      // is preserved (we don't pass fitToContent/fitToViewport), keeping
      // movement minimal between draws.
      if (isMobileViewport()) {
        api.scrollToContent(newElements, { animate: true, duration: 400 });
      }
    },
    clear() {
      apiRef.current?.updateScene({ elements: [] });
      idMapRef.current.clear();
    },
  }));

  return (
    <div
      className="overflow-hidden rounded-md border border-line bg-surface"
      style={{ width, height }}
    >
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        viewModeEnabled
        zenModeEnabled
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: false,
            toggleTheme: false,
            clearCanvas: false,
            changeViewBackgroundColor: false,
          },
        }}
        initialData={{
          appState: {
            viewBackgroundColor: '#FBFAF7',
            zenModeEnabled: true,
          },
          elements: [],
          scrollToContent: false,
        }}
      />
    </div>
  );
}

function applyHighlight(
  api: ExcalidrawImperativeAPI,
  idMap: Map<string, string>,
  cmd: HighlightCommand,
) {
  const targetExcalidrawId = idMap.get(cmd.targetId);
  if (!targetExcalidrawId) {
    console.warn('[whiteboard] highlight target not found:', cmd.targetId);
    return;
  }
  const elements = api.getSceneElements();
  const color = cmd.color ?? HIGHLIGHT_DEFAULT;
  const next: ExcalidrawElement[] = elements.map((el) => {
    if (el.id !== targetExcalidrawId) return el;
    return {
      ...el,
      backgroundColor: color,
      fillStyle: 'solid',
    };
  });
  api.updateScene({ elements: next });
}

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(WhiteboardImpl);
Whiteboard.displayName = 'Whiteboard';

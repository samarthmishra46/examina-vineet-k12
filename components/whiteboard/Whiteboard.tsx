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

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false },
);

const HIGHLIGHT_DEFAULT = '#FCD34D';

export interface WhiteboardHandle {
  apply(cmd: Command): void;
  clear(): void;
}

interface WhiteboardProps {
  width?: number;
  height?: number;
}

function WhiteboardImpl(
  { width = 1200, height = 680 }: WhiteboardProps,
  ref: ForwardedRef<WhiteboardHandle>,
) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
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

      if ('id' in cmd && newElements[0]) {
        idMapRef.current.set(cmd.id, newElements[0].id);
      }

      const existing = api.getSceneElements();
      api.updateScene({ elements: [...existing, ...newElements] });

      // Always scroll to keep new content visible — on all screen sizes.
      // We pan (no zoom change) so the experience stays stable.
      api.scrollToContent(newElements, { animate: false });
    },
    clear() {
      apiRef.current?.updateScene({ elements: [] });
      idMapRef.current.clear();
    },
  }));

  return (
    <div
      className="overflow-hidden rounded-xl bg-[#FBFAF7]"
      style={{ width: '100%', height }}
    >
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api; }}
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
  if (!targetExcalidrawId) return;
  const elements = api.getSceneElements();
  const color = cmd.color ?? HIGHLIGHT_DEFAULT;
  const next: ExcalidrawElement[] = elements.map((el) => {
    if (el.id !== targetExcalidrawId) return el;
    return { ...el, backgroundColor: color, fillStyle: 'solid' };
  });
  api.updateScene({ elements: next });
}

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(WhiteboardImpl);
Whiteboard.displayName = 'Whiteboard';

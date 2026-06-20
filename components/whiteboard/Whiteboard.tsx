'use client';

import '@excalidraw/excalidraw/index.css';

import dynamic from 'next/dynamic';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
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
// Coordinate space Claude draws in — all prompts assume this width
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 680;

export interface WhiteboardHandle {
  apply(cmd: Command): void;
  clear(): void;
}

function WhiteboardImpl(
  _props: object,
  ref: ForwardedRef<WhiteboardHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const idMapRef = useRef<Map<string, string>>(new Map());

  // Scale so the 1200px coordinate space always fits the container width.
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.offsetWidth / CANVAS_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

      // Scroll to keep new content in view. No zoom change — scale is locked.
      api.scrollToContent(newElements, { animate: false });
    },
    clear() {
      apiRef.current?.updateScene({ elements: [] });
      idMapRef.current.clear();
    },
  }));

  return (
    // Outer container: visible area. Height shrinks with scale so nothing is clipped.
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl bg-[#FBFAF7]"
      style={{ width: '100%', height: CANVAS_HEIGHT * scale }}
    >
      {/* Inner div: always 1200×680 in actual pixels, scaled down via CSS. */}
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
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
              // Lock zoom at 1:1 — scaling is handled by CSS transform above
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              zoom: { value: 1 as any },
              scrollX: 0,
              scrollY: 0,
            },
            elements: [],
            scrollToContent: false,
          }}
        />
      </div>
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

export const Whiteboard = forwardRef<WhiteboardHandle, object>(WhiteboardImpl);
Whiteboard.displayName = 'Whiteboard';

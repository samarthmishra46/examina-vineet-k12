import { convertToExcalidrawElements, FONT_FAMILY } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { Command } from '@/lib/teaching/command-schema';

const DEFAULT_STROKE = '#1A1A1A';

/**
 * Convert one of our whiteboard Commands into Excalidraw element(s).
 * Returns null for non-visual commands (narrate, pause_for_doubts, etc.) —
 * those are handled by the scheduler layer, not the renderer.
 *
 * highlight is also non-rendering here: the Whiteboard component handles it
 * by mutating an existing element (we need our-id → excalidraw-id mapping).
 */
export function commandToElements(cmd: Command): readonly ExcalidrawElement[] | null {
  switch (cmd.type) {
    case 'draw_text':
      return convertToExcalidrawElements([
        {
          type: 'text',
          x: cmd.x,
          y: cmd.y,
          text: cmd.text,
          fontSize: cmd.fontSize,
          fontFamily: FONT_FAMILY.Excalifont,
          strokeColor: cmd.color ?? DEFAULT_STROKE,
        },
      ]);

    case 'draw_equation':
      // Step 6b: render LaTeX as plain text. KaTeX SVG rendering arrives in 6c.
      return convertToExcalidrawElements([
        {
          type: 'text',
          x: cmd.x,
          y: cmd.y,
          text: cmd.latex,
          fontSize: cmd.fontSize,
          fontFamily: FONT_FAMILY.Cascadia,
          strokeColor: DEFAULT_STROKE,
        },
      ]);

    case 'draw_rectangle':
      return convertToExcalidrawElements([
        {
          type: 'rectangle',
          x: cmd.x,
          y: cmd.y,
          width: cmd.width,
          height: cmd.height,
          strokeColor: cmd.color ?? DEFAULT_STROKE,
          ...(cmd.fill
            ? { backgroundColor: cmd.fill, fillStyle: 'solid' as const }
            : {}),
          strokeWidth: cmd.strokeWidth ?? 1,
        },
      ]);

    case 'draw_ellipse':
      return convertToExcalidrawElements([
        {
          type: 'ellipse',
          x: cmd.x,
          y: cmd.y,
          width: cmd.width,
          height: cmd.height,
          strokeColor: cmd.color ?? DEFAULT_STROKE,
          ...(cmd.fill
            ? { backgroundColor: cmd.fill, fillStyle: 'solid' as const }
            : {}),
          strokeWidth: cmd.strokeWidth ?? 1,
        },
      ]);

    case 'draw_arrow': {
      const [fx, fy] = cmd.from;
      const [tx, ty] = cmd.to;
      return convertToExcalidrawElements([
        {
          type: 'arrow',
          x: fx,
          y: fy,
          points: [
            [0, 0],
            [tx - fx, ty - fy],
          ],
          strokeColor: cmd.color ?? DEFAULT_STROKE,
          strokeWidth: cmd.strokeWidth ?? 1,
        },
      ]);
    }

    case 'draw_line': {
      const [fx, fy] = cmd.from;
      const [tx, ty] = cmd.to;
      return convertToExcalidrawElements([
        {
          type: 'line',
          x: fx,
          y: fy,
          points: [
            [0, 0],
            [tx - fx, ty - fy],
          ],
          strokeColor: cmd.color ?? DEFAULT_STROKE,
          strokeWidth: cmd.strokeWidth ?? 1,
        },
      ]);
    }

    case 'draw_freehand':
      return buildFreedrawElement(cmd.points, cmd.color ?? DEFAULT_STROKE, cmd.strokeWidth ?? 1);

    default:
      return null;
  }
}

/**
 * Native Excalidraw freedraw element. convertToExcalidrawElements doesn't
 * accept a partial freedraw, so we construct the full element manually with
 * sensible defaults. Returned as a frozen single-element array.
 */
function buildFreedrawElement(
  points: readonly (readonly [number, number])[],
  strokeColor: string,
  strokeWidth: number,
): readonly ExcalidrawElement[] {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const seed = Math.floor(Math.random() * 2_000_000);

  const element = {
    id: makeId(),
    type: 'freedraw',
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    angle: 0,
    strokeColor,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: null,
    seed,
    version: 1,
    versionNonce: seed + 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData: undefined,
    points: points.map(([x, y]) => [x - minX, y - minY] as [number, number]),
    pressures: points.map(() => 0.5),
    simulatePressure: true,
    lastCommittedPoint: null,
  };

  return [element as unknown as ExcalidrawElement];
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

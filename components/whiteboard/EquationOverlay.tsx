'use client';

import 'katex/dist/katex.min.css';
import katex from 'katex';
import { useMemo } from 'react';

export interface Equation {
  id: string;
  x: number;
  y: number;
  fontSize: number;
  latex: string;
}

/**
 * Renders KaTeX equations as a layer over the Excalidraw canvas.
 * Each equation is an absolute-positioned div at its (x, y); the overlay
 * itself is pointer-events:none so Excalidraw stays interactive underneath.
 */
export function EquationOverlay({ equations }: { equations: Equation[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {equations.map((eq) => (
        <EquationItem key={eq.id} equation={eq} />
      ))}
    </div>
  );
}

function EquationItem({ equation }: { equation: Equation }) {
  const html = useMemo(
    () =>
      katex.renderToString(equation.latex, {
        throwOnError: false,
        errorColor: '#B91C1C',
        output: 'htmlAndMathml',
      }),
    [equation.latex],
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: equation.x,
        top: equation.y,
        fontSize: equation.fontSize,
        color: '#1A1A1A',
        lineHeight: 1,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

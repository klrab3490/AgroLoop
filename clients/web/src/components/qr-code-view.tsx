"use client";

import React, { useMemo } from "react";
import { generateQrMatrix } from "@agroloop/qr";

interface QrCodeViewProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export function QrCodeView({
  value,
  size = 220,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
  className = "",
}: QrCodeViewProps) {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 text-xs text-slate-400 rounded-lg ${className}`}
      >
        Invalid QR Payload
      </div>
    );
  }

  const moduleCount = matrix.length;
  const quietZone = 2;
  const totalModules = moduleCount + quietZone * 2;
  const cellSize = size / totalModules;

  return (
    <div
      className={`inline-block p-2 rounded-xl border border-slate-200 shadow-sm ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill={bgColor} />
        {matrix.map((row, r) =>
          row.map((isDark, c) =>
            isDark ? (
              <rect
                key={`${r}-${c}`}
                x={(c + quietZone) * cellSize}
                y={(r + quietZone) * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fgColor}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

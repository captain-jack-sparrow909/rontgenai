"use client";

import { ScoreRing } from "./score-ring";

/** @deprecated Prefer ScoreRing — kept as thin wrapper for any leftover imports */
export function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return <ScoreRing label={label} value={value} size={88} />;
}

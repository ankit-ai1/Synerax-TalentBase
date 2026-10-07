"use client";

import { LazyMotion, MotionConfig, domMax } from "motion/react";

/** Loads motion features (incl. layout animations) and honours the OS "reduce motion" setting */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

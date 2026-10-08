"use client";

import { MetricBoard } from "./metric-board";
import { site } from "@/content/site";
import { Band, SectionHead, Wrap } from "../connection/motif";

/** Metrics band (graphite): odometer numbers, ember bars, cursor spotlight */
export function FlapMetrics() {
  return (
    <Band tone="dark" index="02" label="Our commitments" className="py-24 sm:py-32">
      <Wrap>
        <SectionHead
          index="02"
          label="Our commitments"
          title="Speed and quality, on the board"
          highlight="on the board"
          description="Our promises to hiring teams and job seekers, on every search."
        />
        <MetricBoard stats={site.metrics} />
      </Wrap>
    </Band>
  );
}

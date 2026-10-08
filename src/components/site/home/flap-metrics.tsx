"use client";

import { MetricBoard } from "./metric-board";
import { site } from "@/content/site";
import { Band, SectionHead, Wrap } from "../connection/motif";
import { SampleBadge } from "../ui";

/** Metrics band (graphite): odometer numbers, ember bars, cursor spotlight */
export function FlapMetrics() {
  return (
    <Band tone="dark" index="02" label="In numbers" className="py-24 sm:py-32">
      <Wrap>
        <SectionHead
          index="02"
          label="In numbers"
          title="Speed and quality, on the board"
          highlight="on the board"
          description={
            <>
              The numbers that matter to hiring teams — updated as we go. <SampleBadge className="ml-1 align-middle" />
            </>
          }
        />
        <MetricBoard stats={site.metrics} />
      </Wrap>
    </Band>
  );
}

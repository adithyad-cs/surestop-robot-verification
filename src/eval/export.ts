import type { TrialScore } from "./evaluate";
import type { MissionResult } from "@/mission/types";

export const TRIAL_CSV_COLUMNS = [
  "scenario",
  "seed",
  "method",
  "outcome",
  "target_present",
  "arrived_at_kind",
  "arrived_at_object",
  "correct_arrival",
  "false_arrival",
  "abstained",
  "nav_failure",
  "candidates_opened",
  "non_target_encountered",
  "target_encountered",
  "correct_terminal",
  "frames",
  "verification_frames",
  "path_length_m",
  "sim_time_s",
  "decision_delay_s",
  "candidate_labels",
] as const;

export function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function trialsToCsv(trials: TrialScore[]): string {
  const rows = trials.map((t) =>
    [
      t.scenarioId,
      t.seed,
      t.method,
      t.outcome,
      t.targetPresent,
      t.arrivedAtKind ?? "",
      t.arrivedAtObject ?? "",
      t.correctArrival,
      t.falseArrival,
      t.abstained,
      t.navFailure,
      t.trackLabels.length,
      t.nonTargetEncountered,
      t.targetEncountered,
      t.correctTerminal,
      t.frames,
      t.verificationFrames,
      t.pathLength,
      t.simTime,
      t.decisionDelay ?? "",
      t.trackLabels.map((l) => `${l.trackId}:${l.kind}:${l.status}`).join(" "),
    ]
      .map(csvEscape)
      .join(","),
  );
  return [TRIAL_CSV_COLUMNS.join(","), ...rows].join("\n") + "\n";
}

/** Minimal RFC-4180 parser, used to verify export integrity in tests. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

export interface ExperimentExport {
  schema: "surestop.experiment/1";
  exportedAt: string;
  app: { name: "SureStop"; version: string };
  notes: string;
  runs: Array<{ result: MissionResult; score: TrialScore }>;
}

export function experimentToJson(runs: ExperimentExport["runs"], notes: string, version = "0.1.0"): string {
  const e: ExperimentExport = {
    schema: "surestop.experiment/1",
    exportedAt: new Date().toISOString(),
    app: { name: "SureStop", version },
    notes,
    runs,
  };
  return JSON.stringify(e);
}

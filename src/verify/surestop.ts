// SureStop candidate verifier: a deterministic sequential evidence policy over distinct
// viewpoints. One vote per viewpoint cell; CONFIRM needs enough volumetric support from
// distinct cells with no flat evidence; REJECT needs enough flat evidence with no support;
// a bounded viewpoint budget ends in UNCONFIRMED. Not an SPRT: votes are not likelihood ratios.
import { assessView, DEFAULT_EVIDENCE, type EvidenceConfig } from "./evidence";
import type {
  CandidateDecision,
  CandidateObservation,
  CandidateStatus,
  EvidenceRecord,
  ViewVerdict,
} from "./types";
import { DEFAULT_CELL, viewpointCell, type ViewpointCellConfig } from "./viewpoint";

export interface SureStopConfig {
  evidence: EvidenceConfig;
  cell: ViewpointCellConfig;
  /** Distinct viewpoint cells with VOLUMETRIC evidence needed to confirm. */
  requiredSupport: number;
  /** Distinct viewpoint cells with FLAT evidence needed to reject. */
  requiredAgainst: number;
  /** Maximum number of planned verification viewpoints per candidate. */
  maxViewpoints: number;
  /** At least one supporting view must be within this range (m) of the candidate. */
  confirmRange: number;
}

export const DEFAULT_SURESTOP: SureStopConfig = {
  evidence: DEFAULT_EVIDENCE,
  cell: DEFAULT_CELL,
  requiredSupport: 2,
  requiredAgainst: 2,
  maxViewpoints: 4,
  confirmRange: 2.2,
};

interface CellVote {
  verdict: ViewVerdict;
  noise: number;
  frameId: number;
  range: number;
  bearingDeg: number;
}

function conclusive(v: ViewVerdict): boolean {
  return v !== "INCONCLUSIVE";
}

export class SureStopVerifier {
  private readonly votes = new Map<string, CellVote>();
  private readonly log: EvidenceRecord[] = [];
  private attempts = 0;
  private status: CandidateStatus = "PENDING";
  private reason = "awaiting evidence";

  constructor(
    readonly config: SureStopConfig = DEFAULT_SURESTOP,
    private candidate: { x: number; z: number },
  ) {
    if (config.requiredSupport < 1 || config.requiredAgainst < 1 || config.maxViewpoints < 1) {
      throw new Error("invalid SureStop configuration");
    }
  }

  setCandidatePosition(p: { x: number; z: number }): void {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) throw new Error("invalid candidate position");
    this.candidate = { x: p.x, z: p.z };
  }

  get candidatePosition(): { x: number; z: number } {
    return this.candidate;
  }

  /** Records an observation. After a terminal decision, observations are logged but cannot change it. */
  observe(obs: CandidateObservation): EvidenceRecord {
    const cell = viewpointCell(obs.robot, this.candidate, this.config.cell);
    const a = assessView(obs, this.config.evidence);
    const rec: EvidenceRecord = {
      frameId: obs.frameId,
      t: obs.t,
      cell: cell.key,
      range: cell.range,
      bearingDeg: cell.bearingDeg,
      verdict: a.verdict,
      reason: a.reason,
      counted: false,
      score: obs.detection?.score ?? null,
      excessRelief: obs.depth?.excessRelief ?? null,
      expectedNoise: obs.depth?.expectedNoise ?? null,
    };
    if (this.status !== "PENDING") {
      rec.note = `ignored: candidate already ${this.status}`;
      this.log.push(rec);
      return rec;
    }
    const prev = this.votes.get(cell.key);
    const noise = obs.depth?.expectedNoise ?? Infinity;
    const vote: CellVote = { verdict: a.verdict, noise, frameId: obs.frameId, range: cell.range, bearingDeg: cell.bearingDeg };
    if (!prev) {
      this.votes.set(cell.key, vote);
      rec.counted = true;
    } else if (!conclusive(prev.verdict) && conclusive(a.verdict)) {
      this.votes.set(cell.key, vote);
      rec.counted = true;
      rec.note = `replaces inconclusive vote from frame ${prev.frameId} in same cell`;
      this.unmark(prev.frameId);
    } else if (conclusive(prev.verdict) && conclusive(a.verdict) && noise < prev.noise) {
      this.votes.set(cell.key, vote);
      rec.counted = true;
      rec.note = `replaces lower-quality vote from frame ${prev.frameId} in same cell`;
      this.unmark(prev.frameId);
    } else {
      rec.note = `same viewpoint cell as frame ${prev.frameId}: not counted as new evidence`;
    }
    this.log.push(rec);
    this.evaluate();
    return rec;
  }

  private unmark(frameId: number) {
    for (const r of this.log) {
      if (r.frameId === frameId && r.counted) {
        r.counted = false;
        r.note = "superseded by a better observation from the same cell";
      }
    }
  }

  /** Call when the robot reaches a planned verification viewpoint. */
  registerAttempt(): void {
    this.attempts++;
  }

  canAttempt(): boolean {
    return this.status === "PENDING" && this.attempts < this.config.maxViewpoints;
  }

  usedCells(): Set<string> {
    return new Set(this.votes.keys());
  }

  /** Bearings (deg) of cells that hold a conclusive vote or any vote. */
  votedBearings(): number[] {
    return [...this.votes.values()].map((v) => v.bearingDeg);
  }

  private tally() {
    let support = 0;
    let against = 0;
    let minSupportRange = Infinity;
    for (const v of this.votes.values()) {
      if (v.verdict === "VOLUMETRIC") {
        support++;
        minSupportRange = Math.min(minSupportRange, v.range);
      } else if (v.verdict === "FLAT") against++;
    }
    return { support, against, minSupportRange };
  }

  private evaluate(): void {
    if (this.status !== "PENDING") return;
    const { support, against, minSupportRange } = this.tally();
    const c = this.config;
    if (support >= c.requiredSupport && against === 0) {
      if (minSupportRange <= c.confirmRange) {
        this.status = "CONFIRMED";
        this.reason = `volumetric evidence from ${support} distinct viewpoints, no flat evidence; closest supporting view ${minSupportRange.toFixed(2)} m`;
      } else {
        this.reason = `support from ${support} views but none within ${c.confirmRange} m`;
      }
      return;
    }
    if (against >= c.requiredAgainst && support === 0) {
      this.status = "REJECTED";
      this.reason = `flat-surface evidence from ${against} distinct viewpoints, no volumetric evidence (picture-like candidate)`;
      return;
    }
    if (support > 0 && against > 0) this.reason = `conflicting evidence: ${support} volumetric vs ${against} flat views`;
    else this.reason = `insufficient evidence: ${support} volumetric, ${against} flat of ${this.votes.size} distinct views`;
  }

  /** Ends verification without a decision (budget spent, no reachable viewpoint, timeout). */
  exhaust(why: string): void {
    if (this.status !== "PENDING") return;
    this.status = "UNCONFIRMED";
    this.reason = `${why}; ${this.reason}`;
  }

  decision(): CandidateDecision {
    const { support, against } = this.tally();
    return {
      status: this.status,
      reason: this.reason,
      support,
      against,
      distinctViews: this.votes.size,
      attempts: this.attempts,
    };
  }

  records(): EvidenceRecord[] {
    return this.log;
  }
}

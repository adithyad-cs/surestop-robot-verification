// Robot-facing types for candidate verification. Nothing in src/verify may import
// scenario ground truth (src/sim/assets, src/eval): inputs are detector outputs,
// depth-derived features and the robot's own pose.
import type { DepthFeatures } from "@/sensing/depthFeatures";

export type CandidateOutcome = "CONFIRMED" | "REJECTED" | "UNCONFIRMED";
export type CandidateStatus = "PENDING" | CandidateOutcome;

export interface Pose2 {
  x: number;
  z: number;
  /** Heading (rad); forward vector is (cos theta, sin theta) in the XZ plane. */
  theta: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One frame in which the policy looked for a given candidate. */
export interface CandidateObservation {
  frameId: number;
  t: number;
  robot: Pose2;
  /**
   * Target-class detection associated with the candidate in this frame, or null when the
   * robot was facing the candidate's estimated position but the detector reported nothing
   * there (a "miss").
   */
  detection: { cls: string; score: number; bbox: [number, number, number, number] } | null;
  depth: DepthFeatures | null;
  /** Candidate position estimated from the depth centroid (world frame), if available. */
  positionWorld: Vec3 | null;
}

export type ViewVerdict = "VOLUMETRIC" | "FLAT" | "INCONCLUSIVE";

export interface ViewAssessment {
  verdict: ViewVerdict;
  reason: string;
}

export interface EvidenceRecord {
  frameId: number;
  t: number;
  cell: string;
  range: number;
  bearingDeg: number;
  verdict: ViewVerdict;
  reason: string;
  /** Whether this observation supplied the vote for its viewpoint cell. */
  counted: boolean;
  /** Why it was not counted (duplicate cell, superseded, etc.). */
  note?: string;
  score: number | null;
  excessRelief: number | null;
  expectedNoise: number | null;
}

export interface CandidateDecision {
  status: CandidateStatus;
  reason: string;
  support: number;
  against: number;
  distinctViews: number;
  attempts: number;
}

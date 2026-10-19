// Robot-facing mission types. No ground truth here: the mission sees camera frames
// (detections + measured depth features), its own pose and a label-free prior map.
import type { Detection, DetectorInfo } from "@/perception/types";
import type { DepthFeatures } from "@/sensing/depthFeatures";
import type { CandidateDecision, CandidateStatus, EvidenceRecord, Pose2, Vec3 } from "@/verify/types";
import type { MethodId } from "@/policies/types";
import type { PersistenceConfig, SingleFrameConfig } from "@/policies/baselines";
import type { SureStopConfig } from "@/verify/surestop";
import type { PlannerConfig } from "@/verify/planner";

export type FramePurpose = "search" | "scan" | "verify" | "persist" | "arrival";

export interface TargetObservation {
  detection: Detection;
  depth: DepthFeatures | null;
  positionWorld: Vec3 | null;
}

export interface SensorFrame {
  frameId: number;
  t: number;
  robot: Pose2;
  /** All detector outputs at or above the reporting floor (any class). */
  detections: Detection[];
  /** Target-class detections at or above the detection floor, with measured depth evidence. */
  targets: TargetObservation[];
  inferenceMs: number;
  renderMs: number;
  /** True when this exact pose was rendered and inferred earlier in the same session (memoised). */
  cached: boolean;
}

export interface Sensor {
  capture(robot: Pose2, frameId: number, t: number): Promise<SensorFrame>;
  readonly detectorInfo: DetectorInfo | null;
}

export interface RoutePoint {
  x: number;
  z: number;
  /** World headings (deg; 0 = +X, 90 = +Z) to scan at this waypoint. */
  scan?: number[];
}

export interface MissionConfig {
  method: MethodId;
  targetClass: string;
  /** Minimum detector score for a target-class detection to open or update a candidate track. */
  detectionFloor: number;
  /** Association gate (m) between a new observation and an existing candidate track. */
  associationGate: number;
  /** Distance (m) travelled between search observations. */
  observeEvery: number;
  linearSpeed: number;
  /** deg/s */
  angularSpeed: number;
  /** Seconds the robot dwells per captured frame. */
  captureTime: number;
  /** Distance (m) from the candidate at which the robot stops to declare arrival. */
  standOff: number;
  maxSimTime: number;
  maxFrames: number;
  singleFrame: SingleFrameConfig;
  persistence: PersistenceConfig;
  surestop: SureStopConfig;
  planner: PlannerConfig;
}

export type MissionOutcome = "ARRIVED" | "NOT_FOUND" | "UNRESOLVED" | "NAV_FAILURE" | "ABORTED";

export type MissionMode = "SEARCHING" | "SCANNING" | "VERIFYING" | "PERSISTING" | "APPROACHING" | "DONE";

export interface MissionEvent {
  t: number;
  frameId?: number;
  kind: "mission" | "candidate" | "navigation" | "perception";
  trackId?: string;
  from?: string;
  to?: string;
  message: string;
}

export interface FrameTargetRecord {
  score: number;
  bbox: [number, number, number, number];
  excessRelief: number | null;
  expectedNoise: number | null;
  twoPlaneFraction: number | null;
  range: number | null;
  position: [number, number] | null;
  trackId: string | null;
  note: string;
}

export interface FrameRecord {
  frameId: number;
  t: number;
  pose: [number, number, number];
  purpose: FramePurpose;
  focusTrackId: string | null;
  detections: Array<{ cls: string; score: number; bbox: [number, number, number, number] }>;
  targets: FrameTargetRecord[];
  inferenceMs: number;
  cached: boolean;
}

export interface TrackRecord {
  id: string;
  position: Vec3;
  createdAt: number;
  createdFrame: number;
  decidedAt: number | null;
  status: CandidateStatus;
  decision: CandidateDecision;
  evidence: EvidenceRecord[];
  observations: number;
  maxScore: number;
}

export interface MissionStats {
  simTime: number;
  pathLength: number;
  frames: number;
  verificationFrames: number;
  inferenceMsTotal: number;
  cachedFrames: number;
  /** Trajectory samples whose centre entered the inflated obstacle margin. */
  marginViolations: number;
  wallClockMs: number;
}

export interface MissionResult {
  schema: "surestop.mission/1";
  scenarioId: string;
  seed: number;
  method: MethodId;
  config: MissionConfig;
  detector: DetectorInfo | null;
  outcome: MissionOutcome;
  reason: string;
  confirmedTrackId: string | null;
  finalPose: Pose2;
  tracks: TrackRecord[];
  frames: FrameRecord[];
  events: MissionEvent[];
  /** [t, x, z, theta] sampled at most every 0.25 s. */
  trajectory: Array<[number, number, number, number]>;
  stats: MissionStats;
}

/** One unit of progress, used by the console to animate and inspect the mission. */
export interface MissionStep {
  index: number;
  mode: MissionMode;
  segment: Pose2[];
  frame: SensorFrame | null;
  purpose: FramePurpose | null;
  focusTrackId: string | null;
  events: MissionEvent[];
  plannedPath: Array<{ x: number; z: number }> | null;
  done: boolean;
}

// Per-view geometric assessment. Converts one observation's measured depth features into
// a transparent verdict. These are hand-set, documented thresholds (see /method), not a
// calibrated probability model.
import type { CandidateObservation, ViewAssessment } from "./types";

export interface EvidenceConfig {
  /** Minimum detector score for a view to support the candidate. */
  minScore: number;
  /** Minimum box size (px) for depth evidence to be usable. */
  minBoxW: number;
  minBoxH: number;
  /** Minimum fraction of valid depth returns inside the sampled region. */
  minValidFraction: number;
  /** Maximum expected per-pixel depth noise (m) for a view to be geometrically informative. */
  maxExpectedNoise: number;
  /** Relief above sensor noise (m) at or above which the surface counts as volumetric. */
  volumetricRelief: number;
  /** Relief above sensor noise (m) at or below which the surface counts as flat. */
  flatRelief: number;
  /**
   * If two flat planes explain at least this fraction of the box, high single-plane relief is
   * attributed to layered/cornered flat surfaces (occluder in front, wall corner), not volume.
   */
  maxTwoPlaneFraction: number;
}

export const DEFAULT_EVIDENCE: EvidenceConfig = {
  minScore: 0.4,
  minBoxW: 24,
  minBoxH: 32,
  minValidFraction: 0.6,
  maxExpectedNoise: 0.03,
  volumetricRelief: 0.06,
  flatRelief: 0.025,
  maxTwoPlaneFraction: 0.85,
};

const mm = (m: number) => `${Math.round(m * 1000)} mm`;

export function assessView(obs: CandidateObservation, cfg: EvidenceConfig = DEFAULT_EVIDENCE): ViewAssessment {
  const det = obs.detection;
  if (!det) return { verdict: "INCONCLUSIVE", reason: "candidate not re-detected from this view" };
  const f = obs.depth;
  if (!f) return { verdict: "INCONCLUSIVE", reason: "no usable depth returns in detection box" };
  const [, , w, h] = det.bbox;
  if (w < cfg.minBoxW || h < cfg.minBoxH) {
    return { verdict: "INCONCLUSIVE", reason: `box too small (${Math.round(w)}x${Math.round(h)} px)` };
  }
  if (f.truncated) return { verdict: "INCONCLUSIVE", reason: "box touches image border (candidate truncated)" };
  if (f.validFraction < cfg.minValidFraction) {
    return { verdict: "INCONCLUSIVE", reason: `only ${Math.round(f.validFraction * 100)}% valid depth` };
  }
  if (f.expectedNoise > cfg.maxExpectedNoise) {
    return {
      verdict: "INCONCLUSIVE",
      reason: `range ${f.medianDepth.toFixed(1)} m: expected depth noise ${mm(f.expectedNoise)} > ${mm(cfg.maxExpectedNoise)}`,
    };
  }
  if (f.excessRelief >= cfg.volumetricRelief) {
    if (f.twoPlaneFraction >= cfg.maxTwoPlaneFraction) {
      return {
        verdict: "INCONCLUSIVE",
        reason: `relief explained by two flat surfaces (${Math.round(f.twoPlaneFraction * 100)}% of points): possible occluder or corner`,
      };
    }
    if (det.score < cfg.minScore) {
      return { verdict: "INCONCLUSIVE", reason: `volumetric but detector score ${det.score.toFixed(2)} < ${cfg.minScore}` };
    }
    return { verdict: "VOLUMETRIC", reason: `surface relief ${mm(f.excessRelief)} above noise (≥ ${mm(cfg.volumetricRelief)})` };
  }
  if (f.excessRelief <= cfg.flatRelief) {
    return { verdict: "FLAT", reason: `surface relief ${mm(f.excessRelief)} within noise of a plane (≤ ${mm(cfg.flatRelief)})` };
  }
  return { verdict: "INCONCLUSIVE", reason: `relief ${mm(f.excessRelief)} between flat and volumetric thresholds` };
}

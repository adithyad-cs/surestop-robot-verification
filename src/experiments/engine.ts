// Orchestrates seeded missions in the browser: builds scenario worlds, runs a method's
// mission against the real sensor (render + COCO-SSD), then scores it with the evaluator.
// This is the experiment layer: it may read ground truth, but only to *score* results.
import { CocoSsdDetector, type TfBackend } from "@/perception/cocoSsd";
import { chooseBackend, type BackendChoice } from "@/perception/backend";
import { SensorRenderer } from "@/sim/sensorRenderer";
import { buildWorld, type BuiltWorld } from "@/sim/world";
import { instantiate, ROUTE, type ScenarioInstance } from "@/scenarios/layout";
import { BrowserSensor } from "@/mission/browserSensor";
import { MissionRunner, missionConfig } from "@/mission/runner";
import type { MissionConfig, MissionResult, MissionStep } from "@/mission/types";
import type { MethodId } from "@/policies/types";
import { evaluateMission, type TrialScore } from "@/eval/evaluate";

export interface RunRecord {
  /** Method plus any non-default parameters, e.g. "single-frame@0.7". */
  variant: string;
  result: MissionResult;
  score: TrialScore;
}

export interface Variant {
  method: MethodId;
  label: string;
  overrides?: Partial<MissionConfig>;
}

export function defaultVariant(method: MethodId): Variant {
  return { method, label: method };
}

/** Parses "single-frame@0.7" / "persistence@0.6" / "surestop" into a variant. */
export function parseVariant(spec: string): Variant {
  const [method, param] = spec.split("@") as [MethodId, string | undefined];
  if (!param) return defaultVariant(method);
  const tau = Number(param);
  if (!Number.isFinite(tau) || tau <= 0 || tau >= 1) throw new Error(`bad variant ${spec}`);
  const base = missionConfig(method);
  if (method === "single-frame") return { method, label: spec, overrides: { singleFrame: { threshold: tau } } };
  if (method === "persistence") return { method, label: spec, overrides: { persistence: { ...base.persistence, threshold: tau } } };
  throw new Error(`variant parameter not supported for ${method}`);
}

export interface Prepared {
  inst: ScenarioInstance;
  world: BuiltWorld;
  sensor: BrowserSensor;
}

let sharedEngine: { key: string; promise: Promise<ExperimentEngine> } | null = null;

export class ExperimentEngine {
  private current: { key: string; prepared: Prepared } | null = null;

  /**
   * Page-level singleton. TF.js backends are global, so concurrent initialisations (e.g. React
   * StrictMode double-mount, or navigating between Console and Lab) must share one engine.
   */
  static shared(backendOverride?: string | null): Promise<ExperimentEngine> {
    const key = backendOverride ?? "auto";
    if (!sharedEngine || sharedEngine.key !== key) {
      const promise = ExperimentEngine.create(backendOverride);
      sharedEngine = { key, promise };
      promise.catch(() => {
        if (sharedEngine?.promise === promise) sharedEngine = null;
      });
    }
    return sharedEngine.promise;
  }

  private constructor(
    readonly detector: CocoSsdDetector,
    readonly renderer: SensorRenderer,
    readonly backend: BackendChoice,
  ) {}

  static async create(backendOverride?: string | null): Promise<ExperimentEngine> {
    const backend = chooseBackend(backendOverride);
    const renderer = new SensorRenderer();
    const detector = await CocoSsdDetector.load("lite_mobilenet_v2", "/models/coco-ssd", backend.backend as TfBackend);
    return new ExperimentEngine(detector, renderer, backend);
  }

  /** Builds (or reuses) the world for a scenario/seed. Reuse keeps the per-pose sensor cache. */
  async prepare(scenarioId: string, seed: number, keepImages = false): Promise<Prepared> {
    const key = `${scenarioId}:${seed}:${keepImages}`;
    if (this.current?.key === key) return this.current.prepared;
    this.current?.prepared.world.dispose();
    const inst = instantiate(scenarioId, seed);
    const world = await buildWorld(inst, this.renderer);
    const sensor = new BrowserSensor(world.scene, this.renderer, this.detector, {
      targetClass: "potted plant",
      detectionFloor: missionConfig("surestop").detectionFloor,
      noiseSeed: seed,
      keepImages,
    });
    this.current = { key, prepared: { inst, world, sensor } };
    return this.current.prepared;
  }

  createRunner(p: Prepared, method: MethodId, overrides: Partial<MissionConfig> = {}): MissionRunner {
    return new MissionRunner(missionConfig(method, overrides), p.world.grid, ROUTE, p.inst.start, p.sensor, {
      scenarioId: p.inst.scenario.id,
      seed: p.inst.seed,
    });
  }

  score(p: Prepared, result: MissionResult): TrialScore {
    return evaluateMission(result, p.inst.objects, p.inst.scenario.targetPresent);
  }

  async runOne(
    scenarioId: string,
    seed: number,
    variant: Variant,
    onStep?: (s: MissionStep) => void | Promise<void>,
  ): Promise<RunRecord> {
    const p = await this.prepare(scenarioId, seed);
    const runner = this.createRunner(p, variant.method, variant.overrides);
    const result = await runner.runToEnd(onStep);
    return { variant: variant.label, result, score: this.score(p, result) };
  }

  /** Runs every variant for each scenario/seed in turn (variants share the per-pose sensor cache). */
  async runBatch(
    spec: { scenarios: string[]; seeds: number[]; variants: Variant[] },
    cb: { onRun?: (r: RunRecord, done: number, total: number) => void | Promise<void>; shouldStop?: () => boolean } = {},
  ): Promise<RunRecord[]> {
    const total = spec.scenarios.length * spec.seeds.length * spec.variants.length;
    const out: RunRecord[] = [];
    for (const s of spec.scenarios) {
      for (const seed of spec.seeds) {
        for (const v of spec.variants) {
          if (cb.shouldStop?.()) return out;
          // Yield a macrotask between runs so the page stays responsive and progress can render.
          await new Promise((r) => setTimeout(r, 0));
          let steps = 0;
          const r = await this.runOne(s, seed, v, async () => {
            if (++steps % 4 === 0) await new Promise((res) => setTimeout(res, 0));
          });
          out.push(r);
          await cb.onRun?.(r, out.length, total);
        }
      }
    }
    return out;
  }

  dispose(): void {
    this.current?.prepared.world.dispose();
    this.detector.dispose();
    this.renderer.dispose();
  }
}

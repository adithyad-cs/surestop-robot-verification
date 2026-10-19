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
  result: MissionResult;
  score: TrialScore;
}

export interface Prepared {
  inst: ScenarioInstance;
  world: BuiltWorld;
  sensor: BrowserSensor;
}

export class ExperimentEngine {
  private current: { key: string; prepared: Prepared } | null = null;

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
    method: MethodId,
    overrides: Partial<MissionConfig> = {},
    onStep?: (s: MissionStep) => void | Promise<void>,
  ): Promise<RunRecord> {
    const p = await this.prepare(scenarioId, seed);
    const runner = this.createRunner(p, method, overrides);
    const result = await runner.runToEnd(onStep);
    return { result, score: this.score(p, result) };
  }

  async runBatch(
    spec: { scenarios: string[]; seeds: number[]; methods: MethodId[]; overrides?: Partial<MissionConfig> },
    cb: { onRun?: (r: RunRecord, done: number, total: number) => void; shouldStop?: () => boolean } = {},
  ): Promise<RunRecord[]> {
    const total = spec.scenarios.length * spec.seeds.length * spec.methods.length;
    const out: RunRecord[] = [];
    for (const s of spec.scenarios) {
      for (const seed of spec.seeds) {
        for (const m of spec.methods) {
          if (cb.shouldStop?.()) return out;
          const r = await this.runOne(s, seed, m, spec.overrides);
          out.push(r);
          cb.onRun?.(r, out.length, total);
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

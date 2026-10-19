import Link from "next/link";
import Image from "next/image";
import AppHeader from "@/components/AppHeader";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <section className={styles.copy}>
          <p className="eyebrow">Hack in Hills ’26 · Vision-Based Autonomous Robot · Team Nexora4</p>
          <h1 className={styles.title}>Robots should verify the intended target before reporting arrival.</h1>
          <p className={styles.lede}>
            SureStop is a browser robot simulation. A real object detector proposes candidates; SureStop then checks, from more than one viewpoint, whether a
            candidate is physically the kind of object it was sent to find, and only then declares ARRIVED.
          </p>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepName}>Find</span>
              <span>COCO-SSD runs on every robot-camera frame and opens a candidate for each “potted plant” detection.</span>
            </li>
            <li>
              <span className={styles.stepName}>Verify</span>
              <span>Depth evidence is collected from distinct viewpoints. Flat pictures are rejected; candidates that stay ambiguous end UNCONFIRMED.</span>
            </li>
            <li>
              <span className={styles.stepName}>Arrive</span>
              <span>Only a CONFIRMED candidate ends the mission with ARRIVED. Ground truth is used afterwards, by an independent evaluator.</span>
            </li>
          </ol>
          <Link href="/console" className={`btn btn-primary ${styles.cta}`}>
            ENTER SYSTEM
          </Link>
          <p className={styles.scope}>
            Prototype scope: a category-level task (a physical, three-dimensional potted plant) in simulation. No real-robot, safety or instance-identity claims.
          </p>
        </section>
        <figure className={styles.figure}>
          <div className={styles.frames}>
            <div className={styles.cell}>
              <Image src="/media/frame-print.jpg" alt="Robot camera view of a framed print of a potted plant; detector box labelled potted plant 0.74" width={480} height={360} priority />
              <p>
                Framed print · detector <b>0.74</b>
              </p>
            </div>
            <div className={styles.cell}>
              <Image src="/media/frame-plant.jpg" alt="Robot camera view of a real 3-D potted plant; detector box labelled potted plant 0.96" width={480} height={360} priority />
              <p>
                3-D plant · detector <b>0.96</b>
              </p>
            </div>
            <div className={styles.cell}>
              <Image src="/media/frame-print-depth.jpg" alt="Depth image of the print: a uniform flat wall inside the sampled region" width={480} height={360} />
              <p>
                Depth relief <b>0 mm</b> → <span className={styles.flat}>FLAT</span>
              </p>
            </div>
            <div className={styles.cell}>
              <Image src="/media/frame-plant-depth.jpg" alt="Depth image of the plant showing leaves and pot at varying depths" width={480} height={360} />
              <p>
                Depth relief <b>163 mm</b> → <span className={styles.vol}>VOLUMETRIC</span>
              </p>
            </div>
          </div>
          <figcaption>
            Captured from a SureStop mission in this app (picture-decoy scenario, seed 1). Boxes are real COCO-SSD outputs; depth is the simulated range sensor.
            Both look like a potted plant to the detector. Only one is.
          </figcaption>
        </figure>
      </main>
    </>
  );
}

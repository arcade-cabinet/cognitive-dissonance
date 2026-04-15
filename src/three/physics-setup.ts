/**
 * Physics setup — owns the rapier world, the static colliders that are
 * always there (platter top, AI sphere), the contact-event queue, and the
 * fixed-step accumulator that drives `world.step()` from a variable rAF dt.
 *
 * Split out of cabinet.ts so the orchestrator stays under the 300-LOC
 * standard and so this — the most physics-specific block — can be unit-
 * tested or swapped without touching the renderer.
 *
 * The kinematic AI sphere collider is flagged with CONTACT_FORCE_EVENTS so
 * each rain impact registers; `step()` returns the count of impacts that
 * touched the sphere this frame so the caller can convert them into
 * tension bumps.
 */

import RAPIER from '@dimforge/rapier3d';

/** Y position of the platter-top collider. Matches IndustrialPlatter geometry. */
export const PLATTER_COLLIDER_Y = -1.45;
/** Y position the AI sphere sits at. Matches createAICore default. */
export const SPHERE_Y = 0.4;
/** Sphere radius — matches createAICore outerRadius. */
export const SPHERE_RADIUS = 0.6;

const FIXED_STEP = 1 / 60;
const MAX_SUBSTEPS = 5;
/** Force threshold below which a contact does NOT generate an event. */
const CONTACT_FORCE_THRESHOLD = 1.0;

export interface CabinetPhysics {
  world: RAPIER.World;
  /** Drain accumulator + step the physics world; returns sphere-impact count. */
  step(dt: number): number;
  dispose(): void;
}

/**
 * Build the rapier world with the cabinet's static colliders. The returned
 * step() handles the substep accumulator and the contact-event drain in
 * one call so cabinet.ts doesn't have to mirror that bookkeeping.
 */
export function createCabinetPhysics(): CabinetPhysics {
  const world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
  world.timestep = FIXED_STEP;
  world.numSolverIterations = 4;

  // Platter top — sky rain lands here and tumbles off. Sky-rain cull line
  // sits a half-meter below to give bouncing particles a grace zone.
  const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, PLATTER_COLLIDER_Y, 0));
  world.createCollider(RAPIER.ColliderDesc.cylinder(0.16, 1.5).setRestitution(0.25).setFriction(0.6), floorBody);

  // AI sphere — kinematic so it never moves, but flagged for contact-force
  // events so each rain impact is observable.
  const sphereBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, SPHERE_Y, 0));
  const sphereCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(SPHERE_RADIUS)
      .setRestitution(0.45)
      .setFriction(0.3)
      .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(CONTACT_FORCE_THRESHOLD),
    sphereBody,
  );
  const sphereColliderHandle = sphereCollider.handle;

  const eventQueue = new RAPIER.EventQueue(true);
  let accumulator = 0;

  function step(dt: number): number {
    accumulator += dt;
    let impacts = 0;
    let steps = 0;

    while (accumulator >= FIXED_STEP && steps < MAX_SUBSTEPS) {
      world.step(eventQueue);
      eventQueue.drainContactForceEvents((e) => {
        if (e.collider1() === sphereColliderHandle || e.collider2() === sphereColliderHandle) {
          impacts++;
        }
      });
      accumulator -= FIXED_STEP;
      steps++;
    }

    // If we're falling way behind (e.g. tab was backgrounded), drop the
    // backlog rather than spiral into a death loop of catch-up substeps.
    if (accumulator > FIXED_STEP * MAX_SUBSTEPS) {
      accumulator = 0;
    }

    return impacts;
  }

  function dispose(): void {
    world.free();
  }

  return { world, step, dispose };
}

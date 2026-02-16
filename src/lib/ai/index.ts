/**
 * AI Module — Game Intelligence Systems
 *
 * Provides Yuka.js-powered AI for:
 * - AIDirector: Dynamic difficulty governor (FSM-based)
 * - BossAI: Goal-driven boss behavior (Think + GoalEvaluators)
 * - PanicSystem: Logarithmic panic curves (in ../panic-system.ts)
 */

export type { BossAction, BossState } from './boss-ai';
export { BossAI } from './boss-ai';
export type { DirectorModifiers, PlayerPerformance } from './director';
export { AIDirector } from './director';

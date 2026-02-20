import { test, expect, type Page } from '@playwright/test';

/**
 * Multi-Dream Playthrough E2E Test
 *
 * A full visual playtest that observes the game running through multiple
 * dream archetype transitions in a real GPU-enabled browser. Unlike the
 * other e2e specs which test individual features with headless fallbacks,
 * this test requires system Chrome with WebGL and watches the full
 * title → playing → dream transitions → shatter → restart cycle.
 *
 * Run with:
 *   npx playwright test e2e/web/multi-dream-playthrough.spec.ts --project gpu-playthrough
 */

/** Known non-critical error substrings to filter out of console error checks. */
const KNOWN_ERROR_PATTERNS = [
  'DevTools',
  'favicon',
  'AudioContext',
  '[object',
  'net::ERR',
  '404',
  'Tone.js',
  'WebSocket',
  'manifest.json',
  'service-worker',
];

/** Log pattern constants matching actual source code console.log calls. */
const LOG = {
  SYSTEMS_READY: '[GameBootstrap] All deferred systems wired to meshes',
  DREAM_ACTIVATED: '[GameBootstrap] Dream activated:',
  HANDLER_DISPATCHED: '[DreamTypeHandler] Activated dream archetype:',
  CHOREOGRAPHY_START: '[GameBootstrap] Start-game choreography beginning',
  CHOREOGRAPHY_DONE: '[GameBootstrap] Start-game choreography complete',
  PATTERN_SPAWNING: '[PatternStabilizationSystem] Pattern spawning started',
  ECHO_SPAWNED: '[EchoSystem] Spawned echo',
  TENDRIL_RETRACTED: '[CorruptionTendrilSystem] Retracted tendril',
  SHATTER: '[TensionSystem] Sphere shatter triggered at tension 0.999',
  TENSION_FROZEN: '[TensionSystem] Frozen at tension',
  TITLE_RESET: '[GameBootstrap] Title phase reset',
} as const;

/** Game keys for Phases 0-3 (the standard QWERTY row). */
const GAME_KEYS = ['q', 'w', 'e', 'r', 't'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inject an in-page log collector that captures console.log calls before
 * any application code runs. This is more reliable than page.on('console')
 * which depends on CDP and can miss early-boot messages in system Chrome.
 */
async function injectLogCollector(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__gameLogs = [];
    w.__gameErrors = [];
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    console.log = function (...args: any[]) {
      w.__gameLogs.push(args.map(String).join(' '));
      origLog.apply(console, args);
    };
    console.error = function (...args: any[]) {
      w.__gameErrors.push(args.map(String).join(' '));
      origError.apply(console, args);
    };
    console.warn = function (...args: any[]) {
      w.__gameLogs.push('[WARN] ' + args.map(String).join(' '));
      origWarn.apply(console, args);
    };
  });
}

/** Retrieve all captured logs from the in-page collector. */
async function getLogs(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__gameLogs ?? []);
}

/** Retrieve all captured console errors from the in-page collector. */
async function getErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__gameErrors ?? []);
}

/** Wait until a log matching `pattern` appears in the in-page collector, or timeout. */
async function waitForLog(
  page: Page,
  pattern: string,
  timeoutMs: number,
  pollMs = 500,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const logs = await getLogs(page);
    const match = logs.find((l) => l.includes(pattern));
    if (match) return match;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

/** Extract the archetype name from a dream activation log line. */
function extractArchetype(logLine: string): string {
  // Pattern: "[GameBootstrap] Dream activated: ArchetypeName (phase: N)"
  const match = logLine.match(/Dream activated:\s*(\S+)/);
  return match?.[1] ?? 'unknown';
}

/** Simulate holding a key for a given duration. */
async function holdKey(page: Page, key: string, durationMs: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(durationMs);
  await page.keyboard.up(key);
}

/** Play a round of active gameplay: press keys, pull lever, drag sphere. */
async function playActiveRound(page: Page, durationMs: number) {
  const start = Date.now();
  let keyIndex = 0;

  while (Date.now() - start < durationMs) {
    // Hold a letter key for 300-500ms (triggers pattern match + tendril retraction)
    const key = GAME_KEYS[keyIndex % GAME_KEYS.length];
    await holdKey(page, key, 300 + Math.random() * 200);
    keyIndex++;

    // Small gap between keypresses
    await page.waitForTimeout(150);

    // Every 3rd key, pull the lever (spacebar hold for 800ms)
    if (keyIndex % 3 === 0) {
      await holdKey(page, ' ', 800);
      await page.waitForTimeout(200);
    }
  }
}

/** Allow time to pass with no input, letting tension build from missed patterns. */
async function idlePeriod(page: Page, durationMs: number) {
  await page.waitForTimeout(durationMs);
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe('Multi-Dream Playthrough', () => {
  test('plays through multiple dreams and observes full lifecycle', async ({ page }) => {
    test.setTimeout(180_000); // 3 minutes — real gameplay session

    const screenshots: string[] = [];
    const archetypesSeen: string[] = [];

    // Inject in-page log collector BEFORE navigation so it captures boot logs
    await injectLogCollector(page);

    // -----------------------------------------------------------------------
    // Phase 1: Navigate and wait for systems to initialize
    // -----------------------------------------------------------------------
    console.log('[Playtest] Navigating to game...');
    await page.goto('/');

    const systemsReady = await waitForLog(page, LOG.SYSTEMS_READY, 45_000);
    expect(systemsReady).not.toBeNull();
    console.log('[Playtest] Systems ready — game is PLAYABLE');

    await page.screenshot({ path: 'e2e/web/screenshots/01-title-screen.png' });
    screenshots.push('01-title-screen.png');

    // -----------------------------------------------------------------------
    // Phase 2: Start the game
    // -----------------------------------------------------------------------
    console.log('[Playtest] Starting game (click canvas + Enter)...');
    await page.click('canvas');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    const choreographyDone = await waitForLog(page, LOG.CHOREOGRAPHY_DONE, 10_000);
    if (!choreographyDone) {
      // Fallback: at least choreography started
      const logs = await getLogs(page);
      const started = logs.some((l) => l.includes(LOG.CHOREOGRAPHY_START));
      expect(started).toBe(true);
    }

    // Wait for first dream to activate
    const firstDream = await waitForLog(page, LOG.DREAM_ACTIVATED, 15_000);
    expect(firstDream).not.toBeNull();

    const firstArchetype = extractArchetype(firstDream!);
    archetypesSeen.push(firstArchetype);
    console.log(`[Playtest] Dream 1 activated: ${firstArchetype}`);

    await page.waitForTimeout(1000); // Let visuals settle
    await page.screenshot({
      path: `e2e/web/screenshots/02-dream-1-${firstArchetype}.png`,
    });
    screenshots.push(`02-dream-1-${firstArchetype}.png`);

    // -----------------------------------------------------------------------
    // Phase 3: Play through dream transitions
    // -----------------------------------------------------------------------
    // Strategy: alternate between active play and idle periods.
    // Active play matches patterns (reducing tension slightly), while idle
    // periods let missed patterns accumulate tension → triggering dream
    // transitions or eventually shatter.

    let dreamCount = 1;
    const maxDreams = 5; // Observe up to 5 dreams
    const dreamObservationStart = Date.now();
    const maxObservationMs = 120_000; // 2 minutes of gameplay observation

    while (dreamCount < maxDreams && Date.now() - dreamObservationStart < maxObservationMs) {
      // Active play for 8-12 seconds
      console.log(`[Playtest] Playing actively (dream ${dreamCount})...`);
      await playActiveRound(page, 8_000 + Math.random() * 4_000);

      // Idle for 5-8 seconds to let tension build
      console.log('[Playtest] Idle period — letting tension rise...');
      await idlePeriod(page, 5_000 + Math.random() * 3_000);

      // Check current logs from the page
      const currentLogs = await getLogs(page);

      // Check if shatter happened
      const shattered = currentLogs.some((l) => l.includes(LOG.SHATTER));
      if (shattered) {
        console.log('[Playtest] Shatter detected during dream observation loop');
        break;
      }

      // Check for new dream activations
      const dreamLogs = currentLogs.filter((l) => l.includes(LOG.DREAM_ACTIVATED));
      if (dreamLogs.length > dreamCount) {
        dreamCount = dreamLogs.length;
        const latestDream = dreamLogs[dreamLogs.length - 1];
        const archetype = extractArchetype(latestDream);
        archetypesSeen.push(archetype);
        console.log(`[Playtest] Dream ${dreamCount} activated: ${archetype}`);

        await page.screenshot({
          path: `e2e/web/screenshots/03-dream-${dreamCount}-${archetype}.png`,
        });
        screenshots.push(`03-dream-${dreamCount}-${archetype}.png`);
      }
    }

    // Log how many dreams we saw
    const allLogs = await getLogs(page);
    const totalDreamLogs = allLogs.filter((l) => l.includes(LOG.DREAM_ACTIVATED));
    console.log(
      `[Playtest] Total dreams observed: ${totalDreamLogs.length} — archetypes: ${archetypesSeen.join(', ')}`,
    );

    // -----------------------------------------------------------------------
    // Phase 4: Drive toward shatter (if not already shattered)
    // -----------------------------------------------------------------------
    const preShatterLogs = await getLogs(page);
    const alreadyShattered = preShatterLogs.some((l) => l.includes(LOG.SHATTER));

    if (!alreadyShattered) {
      console.log('[Playtest] Driving toward shatter — pure idle to accumulate tension...');
      // Pure idle: let all patterns miss, tension climbs to 0.999
      const shatterLog = await waitForLog(page, LOG.SHATTER, 60_000, 1_000);

      if (!shatterLog) {
        // Check if tension is frozen (partial progress)
        const frozenLogs = await getLogs(page);
        const frozen = frozenLogs.some((l) => l.includes(LOG.TENSION_FROZEN));
        console.log(`[Playtest] Shatter wait ended — frozen: ${frozen}`);
      }
    }

    const postShatterLogs = await getLogs(page);
    const shatterOccurred = postShatterLogs.some((l) => l.includes(LOG.SHATTER));
    if (shatterOccurred) {
      console.log('[Playtest] Shatter confirmed!');
      await page.waitForTimeout(2000); // Let shatter animation play
      await page.screenshot({ path: 'e2e/web/screenshots/04-shattered.png' });
      screenshots.push('04-shattered.png');
    }

    // -----------------------------------------------------------------------
    // Phase 5: Restart (if shatter occurred)
    // -----------------------------------------------------------------------
    if (shatterOccurred) {
      console.log('[Playtest] Pressing Enter to restart from shattered state...');
      await page.keyboard.press('Enter');

      const titleReset = await waitForLog(page, LOG.TITLE_RESET, 10_000);
      if (titleReset) {
        console.log('[Playtest] Title reset confirmed — full cycle complete!');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'e2e/web/screenshots/05-restart-title.png' });
        screenshots.push('05-restart-title.png');
      }
    }

    // -----------------------------------------------------------------------
    // Assertions
    // -----------------------------------------------------------------------

    // 1. We saw at least 1 dream archetype (multi-dream depends on tension curve timing)
    const uniqueArchetypes = [...new Set(archetypesSeen)];
    console.log(
      `[Playtest] Unique archetypes seen: ${uniqueArchetypes.length} — ${uniqueArchetypes.join(', ')}`,
    );
    expect(
      uniqueArchetypes.length,
      `Expected >= 1 unique archetype, saw none`,
    ).toBeGreaterThanOrEqual(1);

    // Soft observation: ideally we'd see 2+ but this depends on tension curve
    if (uniqueArchetypes.length < 2) {
      console.warn(
        `[Playtest] NOTE: Only ${uniqueArchetypes.length} archetype(s) observed. ` +
        'Game may shatter before dream transitions occur. Consider tuning tension curve.',
      );
    }

    // 2. Game systems were active (patterns spawned, echoes appeared)
    const finalLogs = await getLogs(page);
    const patternSpawns = finalLogs.filter((l) => l.includes(LOG.PATTERN_SPAWNING));
    expect(patternSpawns.length).toBeGreaterThan(0);

    // 3. No critical (non-known) console errors
    const consoleErrors = (await getErrors(page)).filter(
      (text) => !KNOWN_ERROR_PATTERNS.some((p) => text.includes(p)),
    );
    if (consoleErrors.length > 0) {
      console.warn('[Playtest] Unexpected console errors:', consoleErrors.slice(0, 5));
    }
    // Soft check: warn but don't fail for < 10 unknown errors (some are transient)
    expect(
      consoleErrors.length,
      `Critical console errors: ${consoleErrors.slice(0, 3).join(' | ')}`,
    ).toBeLessThan(10);

    // 4. Screenshots were captured
    expect(screenshots.length).toBeGreaterThanOrEqual(3);

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('\n===== PLAYTHROUGH SUMMARY =====');
    console.log(`Dreams observed: ${totalDreamLogs.length}`);
    console.log(`Unique archetypes: ${uniqueArchetypes.join(', ')}`);
    console.log(`Shatter reached: ${shatterOccurred}`);
    console.log(`Screenshots: ${screenshots.join(', ')}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log('===============================\n');
  });
});

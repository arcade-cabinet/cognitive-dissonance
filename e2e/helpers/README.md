# Game Governor - Automated Testing

The Game Governor is an automated playthrough controller that simulates realistic player behavior for E2E testing of the Psyduck Panic game.

## Overview

The governor module provides AI-driven gameplay automation that can:
- Start and play through the game automatically
- Make decisions based on game state (panic level, available abilities, etc.)
- Simulate human-like reaction times and accuracy
- Capture screenshots at key moments for visual verification

## Usage

### Basic Usage

```typescript
import { test } from '@playwright/test';
import { GameGovernor } from './helpers/game-governor';

test('automated playthrough', async ({ page }) => {
  await page.goto('/psyduck-panic/');
  
  const governor = new GameGovernor(page);
  const result = await governor.playthrough();
  
  console.log(`Result: ${result.result}, Score: ${result.score}`);
});
```

### Configuration

The governor accepts a configuration object with the following options:

```typescript
const governor = new GameGovernor(page, {
  aggressiveness: 0.7,  // How often to use abilities (0-1)
  reactionTime: 300,    // Delay between actions in ms
  useSpecials: true,    // Whether to use nuke ability
  accuracy: 0.8,        // Chance to make correct decisions (0-1)
});
```

### Configuration Profiles

#### Aggressive Player
```typescript
const governor = new GameGovernor(page, {
  aggressiveness: 0.9,
  accuracy: 0.9,
  reactionTime: 200,
  useSpecials: true,
});
```

#### Defensive Player
```typescript
const governor = new GameGovernor(page, {
  aggressiveness: 0.5,
  accuracy: 0.7,
  reactionTime: 500,
  useSpecials: false,
});
```

#### Beginner Player
```typescript
const governor = new GameGovernor(page, {
  aggressiveness: 0.4,
  accuracy: 0.5,
  reactionTime: 800,
  useSpecials: false,
});
```

## API Reference

### GameGovernor

#### Constructor
```typescript
constructor(page: Page, config?: GovernorConfig)
```

#### Methods

**start(): Promise<void>**
- Starts automated gameplay
- Clicks the start button and begins the play loop

**stop(): void**
- Stops the automated gameplay loop

**playthrough(): Promise<{result: 'win' | 'loss', score: number}>**
- Runs a complete playthrough from start to game over
- Returns the final result and score

### Config Options

```typescript
interface GovernorConfig {
  aggressiveness?: number;  // 0-1, default: 0.7
  reactionTime?: number;    // milliseconds, default: 300
  useSpecials?: boolean;    // default: true
  accuracy?: number;        // 0-1, default: 0.8
}
```

## Examples

### Visual Verification Test
```typescript
test('verify gameplay with screenshots', async ({ page }) => {
  await page.goto('/psyduck-panic/');
  
  const governor = new GameGovernor(page);
  const playthroughPromise = governor.playthrough();
  
  // Take screenshots during gameplay
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'gameplay-1.png' });
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'gameplay-2.png' });
  
  const result = await playthroughPromise;
  await page.screenshot({ path: 'game-over.png' });
});
```

### Performance Testing
```typescript
test('measure game performance', async ({ page }) => {
  await page.goto('/psyduck-panic/');
  
  const startTime = Date.now();
  const governor = new GameGovernor(page, {
    aggressiveness: 0.8,
    accuracy: 0.85,
  });
  
  const result = await governor.playthrough();
  const duration = Date.now() - startTime;
  
  console.log(`Playthrough took ${duration}ms`);
  console.log(`Final score: ${result.score}`);
  expect(duration).toBeLessThan(120000); // 2 minutes
});
```

### Regression Testing
```typescript
test('verify consistent gameplay behavior', async ({ page }) => {
  await page.goto('/psyduck-panic/');
  
  const results = [];
  
  // Run multiple playthroughs with same config
  for (let i = 0; i < 3; i++) {
    const governor = new GameGovernor(page, {
      aggressiveness: 0.7,
      accuracy: 0.75,
      reactionTime: 300,
    });
    
    const result = await governor.playthrough();
    results.push(result.score);
    
    // Reload for next attempt
    if (i < 2) {
      await page.reload();
    }
  }
  
  // Verify scores are within reasonable range
  const avgScore = results.reduce((a, b) => a + b, 0) / results.length;
  console.log(`Average score: ${avgScore}`);
});
```

## Integration with Playwright

The governor is designed to work seamlessly with Playwright's testing framework:

1. **Screenshots**: Automatically captures key moments
2. **Assertions**: Compatible with Playwright's expect API
3. **Timeouts**: Respects Playwright's timeout settings
4. **Page Context**: Works with Playwright's page and browser context

## Tips for Effective Testing

1. **Use appropriate timeouts**: Game playthroughs can take 30-60 seconds
2. **Capture screenshots**: Visual verification is crucial for game testing
3. **Test multiple configurations**: Different play styles may reveal different bugs
4. **Monitor game state**: Use the governor's internal state checks for assertions
5. **Combine with manual tests**: Governor complements, not replaces, manual testing

## Limitations

- The governor uses randomized decision-making and may not always make optimal choices
- Complex game mechanics may require custom governor implementations
- Visual canvas analysis is not currently implemented (uses DOM state only)

## Future Enhancements

- Canvas pixel analysis for enemy detection
- Machine learning-based decision making
- Recorded playthrough replay capability
- Multi-agent testing (multiple governors simultaneously)

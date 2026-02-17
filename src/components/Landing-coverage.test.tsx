import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Landing from './Landing';
import { animate } from 'animejs';

// Mock animejs
vi.mock('animejs', () => ({
  animate: vi.fn(),
  default: vi.fn(),
}));

// Mock router
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Landing Component Coverage', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Deterministic random
    let i = 0;
    randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      const val = (i % 10) / 10;
      i++;
      return val;
    });
  });

  afterEach(() => {
    randomSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should initialize bubbles with deterministic data', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    const bubbles = document.querySelectorAll('.bubble');
    expect(bubbles.length).toBe(20);
  });

  it('should trigger animejs animations on mount', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    // useEffect runs.
    // It selects bubbles.
    // Calls animate for the bubbles.
    expect(animate).toHaveBeenCalled();
  });

  it('should execute animejs callbacks if provided', () => {
      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      );

      const calls = vi.mocked(animate).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Check specific call arguments
      // The second call for the first bubble (index 1) has the complex animation
      const secondCallArgs = calls[1][1];
      expect(secondCallArgs.translateX).toBeDefined();
      expect(Array.isArray(secondCallArgs.translateX)).toBe(true);

      // Verify callbacks execute
      const callback = secondCallArgs.translateX[0];
      if (typeof callback === 'function') {
          const val = callback();
          expect(val).toBeDefined();
      }
  });
});

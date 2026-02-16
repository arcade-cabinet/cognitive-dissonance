import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

// Mock animejs to avoid DOM animation issues in jsdom
vi.mock('animejs', () => ({
  animate: vi.fn(),
}));

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
}

describe('Landing Page', () => {
  it('should render the game title', () => {
    renderLanding();
    const titles = screen.getAllByText('PSYDUCK PANIC');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    // Main title is the h1 with glitch class
    expect(titles[0].tagName).toBe('H1');
  });

  it('should render the subtitle', () => {
    renderLanding();
    expect(screen.getByText('EVOLUTION DELUXE')).toBeInTheDocument();
  });

  it('should render the START GAME button', () => {
    renderLanding();
    expect(screen.getByText('START GAME')).toBeInTheDocument();
  });

  it('should render the PLAY NOW button', () => {
    renderLanding();
    expect(screen.getByText('PLAY NOW')).toBeInTheDocument();
  });

  it('should navigate to /game when START GAME is clicked', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByText('START GAME'));
    expect(mockedNavigate).toHaveBeenCalledWith('/game');
  });

  it('should navigate to /game when PLAY NOW is clicked', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByText('PLAY NOW'));
    expect(mockedNavigate).toHaveBeenCalledWith('/game');
  });

  it('should display character transformation showcase', () => {
    renderLanding();
    expect(screen.getByText('NORMAL')).toBeInTheDocument();
    expect(screen.getByText('PANIC')).toBeInTheDocument();
    expect(screen.getByText('PSYDUCK')).toBeInTheDocument();
  });

  it('should display game features', () => {
    renderLanding();
    expect(screen.getByText('Arcade Action')).toBeInTheDocument();
    expect(screen.getByText('Epic Boss Battles')).toBeInTheDocument();
    expect(screen.getByText('Endless Mode')).toBeInTheDocument();
    expect(screen.getByText('Combo System')).toBeInTheDocument();
  });

  it('should display tech stack', () => {
    renderLanding();
    expect(screen.getByText('React Three Fiber')).toBeInTheDocument();
    expect(screen.getByText('React 19')).toBeInTheDocument();
    expect(screen.getByText('TypeScript 5')).toBeInTheDocument();
  });

  it('should display the story section', () => {
    renderLanding();
    expect(screen.getByText('THE CRISIS')).toBeInTheDocument();
    expect(screen.getByText('The Setup')).toBeInTheDocument();
    expect(screen.getByText('The Problem')).toBeInTheDocument();
    expect(screen.getByText('Your Mission')).toBeInTheDocument();
  });

  it('should render floating bubbles', () => {
    renderLanding();
    const bubbles = document.querySelectorAll('.bubble');
    expect(bubbles.length).toBe(20);
  });

  it('should display feature badges', () => {
    renderLanding();
    expect(screen.getByText('3D WebGL')).toBeInTheDocument();
    expect(screen.getByText('Cross-Platform')).toBeInTheDocument();
    expect(screen.getByText('3 Game Modes')).toBeInTheDocument();
  });
});

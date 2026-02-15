import { animate } from 'animejs';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const bubblesRef = useRef<HTMLDivElement>(null);

  // Stabilize random bubble values using useMemo
  const bubbleData = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: `bubble-${i}`,
        emoji: ['🦠', '📈', '🤖', '💭', '⚡'][Math.floor(Math.random() * 5)],
        initialLeft: Math.random() * 100,
        duration: 15000 + Math.random() * 10000,
        rotationDuration: 8000 + Math.random() * 4000,
        delay: i * 800 + Math.random() * 2000,
      })),
    []
  );

  const startGame = () => {
    navigate('/game');
  };

  // Animate bubbles with anime.js
  useEffect(() => {
    if (!bubblesRef.current) return;

    const bubbles = bubblesRef.current.querySelectorAll('.bubble');

    // Animate each bubble independently using stable data
    bubbles.forEach((bubble, index) => {
      const data = bubbleData[index];

      // Set initial position using animate with duration 0
      animate(bubble as HTMLElement, {
        left: `${data.initialLeft}%`,
        bottom: '-5%',
        opacity: 0,
        duration: 0,
      });

      // Create floating animation with anime.js
      animate(bubble as HTMLElement, {
        translateY: -window.innerHeight - 100,
        translateX: [
          () => (Math.random() - 0.5) * 200,
          () => (Math.random() - 0.5) * 200,
          () => (Math.random() - 0.5) * 200,
        ],
        rotate: 360,
        opacity: [0.4, 0.4, 0],
        scale: [1, 1.2, 0.8],
        loop: true,
        delay: data.delay,
        duration: data.duration,
      });
    });
  }, [bubbleData]);

  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="floating-bubbles" ref={bubblesRef}>
          {bubbleData.map((data) => (
            <div key={data.id} className="bubble">
              {data.emoji}
            </div>
          ))}
        </div>
        <div className="grid-overlay"></div>
      </div>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="glitch-wrapper">
            <h1 className="title glitch" data-text="PSYDUCK PANIC">
              PSYDUCK PANIC
            </h1>
            <div className="subtitle-wrapper">
              <p className="subtitle">EVOLUTION DELUXE</p>
              <div className="version-tag">v1.0 {'//'} NOW PLAYING</div>
            </div>
          </div>

          <div className="tagline">
            <p className="tagline-text">
              <span className="accent">Counter AI hype</span> thought bubbles before your brother's
              brain
              <span className="highlight"> transforms into Psyduck</span>
            </p>
          </div>

          <div className="cta-container">
            <button type="button" onClick={startGame} className="cta-button primary">
              <span className="button-inner">
                <span className="button-icon">🎮</span>
                <span className="button-text">START GAME</span>
                <span className="button-shine"></span>
              </span>
            </button>
            <a href="#story" className="cta-button secondary">
              <span className="button-text">LEARN MORE</span>
            </a>
          </div>

          <div className="features-quick">
            <div className="feature-badge">
              <span className="badge-icon">⚡</span>
              <span className="badge-text">60 FPS WebGL</span>
            </div>
            <div className="feature-badge">
              <span className="badge-icon">📱</span>
              <span className="badge-text">Cross-Platform</span>
            </div>
            <div className="feature-badge">
              <span className="badge-icon">🎯</span>
              <span className="badge-text">3 Game Modes</span>
            </div>
          </div>
        </div>

        {/* Character Showcase */}
        <div className="character-showcase">
          <div className="character-frame">
            <div className="character normal">
              <div className="character-label">NORMAL</div>
              <div className="emoji-character">🧑‍💻</div>
              <div className="panic-indicator">
                <div className="panic-bar" style={{ width: '20%' }}></div>
              </div>
            </div>
            <div className="arrow" aria-hidden="true">
              →
            </div>
            <div className="character panic">
              <div className="character-label">PANIC</div>
              <div className="emoji-character stressed">😰</div>
              <div className="panic-indicator">
                <div className="panic-bar warning" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="arrow" aria-hidden="true">
              →
            </div>
            <div className="character psyduck">
              <div className="character-label">PSYDUCK</div>
              <div className="emoji-character evolved">🦆</div>
              <div className="panic-indicator">
                <div className="panic-bar danger" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story" id="story">
        <div className="section-header">
          <h2 className="section-title">THE CRISIS</h2>
          <div className="section-subtitle">A Tale of Tech Hype Gone Wrong</div>
        </div>

        <div className="story-content">
          <div className="story-card">
            <div className="card-icon">🌐</div>
            <h3>The Setup</h3>
            <p>
              Your brother is doom-scrolling tech Twitter. Every post is more hyped than the last.
              "AGI next week!" "This changes everything!" "We're all gonna make it!"
            </p>
          </div>

          <div className="story-card">
            <div className="card-icon">🧠</div>
            <h3>The Problem</h3>
            <p>
              His brain can't handle it. The panic meter rises. Reality distorts. Logic crumbles.
              He's transforming... into a Psyduck.
            </p>
          </div>

          <div className="story-card">
            <div className="card-icon">⚔️</div>
            <h3>Your Mission</h3>
            <p>
              Counter the AI hype thought bubbles before it's too late. Use REALITY, HISTORY, and
              LOGIC to restore sanity. Fight the Hype Train. Face The Singularity itself.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="section-header">
          <h2 className="section-title">GAME FEATURES</h2>
          <div className="section-subtitle">Peak Retro-Modern Gaming</div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎮</div>
            <h3>Arcade Action</h3>
            <p>
              Fast-paced gameplay with increasing difficulty. Master the three counter abilities.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👾</div>
            <h3>Epic Boss Battles</h3>
            <p>Face THE HYPE TRAIN and THE SINGULARITY in challenging multi-phase encounters.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Endless Mode</h3>
            <p>Beat Wave 5 to unlock endless mode. How long can you hold back the hype?</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Power-Ups</h3>
            <p>Time Warp, Clarity Shield, and 2X Score multipliers to turn the tide.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Combo System</h3>
            <p>Chain counters for massive score multipliers and momentum perks.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Play Anywhere</h3>
            <p>Web, iOS, Android. Phone, tablet, desktop. Fully responsive and touch-optimized.</p>
          </div>
        </div>
      </section>

      {/* Tech Section */}
      <section className="tech">
        <div className="section-header">
          <h2 className="section-title">BUILT WITH</h2>
          <div className="section-subtitle">Modern Web Technology Stack</div>
        </div>

        <div className="tech-stack">
          <div className="tech-item">
            <span className="tech-name">PixiJS 8</span>
            <span className="tech-desc">WebGL Rendering</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">React 19</span>
            <span className="tech-desc">UI Framework</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">TypeScript 5</span>
            <span className="tech-desc">Type Safety</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">Capacitor 8</span>
            <span className="tech-desc">Native Mobile</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">Web Workers</span>
            <span className="tech-desc">60 FPS Game Loop</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">Vite 5</span>
            <span className="tech-desc">Lightning Build</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Save Your Brother?</h2>
          <p className="cta-text">The panic meter is rising. Every second counts.</p>
          <button type="button" onClick={startGame} className="cta-button mega">
            <span className="button-inner">
              <span className="button-icon pulse">🎮</span>
              <span className="button-text">PLAY NOW</span>
              <span className="button-shine"></span>
            </span>
          </button>
          <p className="cta-subtext">Free • No Download • All Devices</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>PSYDUCK PANIC</h3>
            <p>Evolution Deluxe Edition</p>
          </div>
          <div className="footer-links">
            <a
              href="https://github.com/arcade-cabinet/psyduck-panic"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a href="#story">About</a>
          </div>
          <div className="footer-credits">
            <p>Built with ❤️ by Arcade Cabinet</p>
            <p className="version">v1.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

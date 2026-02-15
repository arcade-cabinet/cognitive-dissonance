import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { colors } from '../design/tokens';
/**
 * CharacterRenderer
 *
 * Renders the brother character with three transformation states:
 * 1. Normal (0-33% panic) - Casual, sitting, slightly worried
 * 2. Panic (33-66% panic) - Very worried, shaking, worry clouds
 * 3. Psyduck (66-100% panic) - Full Psyduck transformation with aura
 */
export class CharacterRenderer {
    container;
    shadowGraphics;
    bodyContainer;
    speechText = null;
    worryCloudGraphics = null;
    lightningGraphics = null;
    auraGraphics = null;
    currentState = 'normal';
    time = 0;
    constructor() {
        this.container = new Container();
        this.container.label = 'character';
        // Shadow/base
        this.shadowGraphics = new Graphics();
        this.container.addChild(this.shadowGraphics);
        // Body container (for shake effects)
        this.bodyContainer = new Container();
        this.container.addChild(this.bodyContainer);
    }
    /**
     * Update and render character based on panic level
     */
    update(panic, time) {
        this.time = time;
        // Clear previous frame
        this.bodyContainer.removeChildren();
        if (this.shadowGraphics)
            this.shadowGraphics.clear();
        if (this.auraGraphics) {
            this.container.removeChild(this.auraGraphics);
            this.auraGraphics = null;
        }
        // Determine state based on panic level
        const newState = panic < 33 ? 'normal' : panic < 66 ? 'panic' : 'psyduck';
        this.currentState = newState;
        // Draw shadow
        this.drawShadow();
        // Breathing/bobbing animation
        const breathe = Math.sin(time / 400) * 3;
        // Draw appropriate state
        if (newState === 'normal') {
            this.drawNormal(breathe, time);
        }
        else if (newState === 'panic') {
            this.drawPanic(breathe, time, panic);
        }
        else {
            this.drawPsyduck(breathe, time, panic);
        }
    }
    /**
     * Draw shadow beneath character
     */
    drawShadow() {
        this.shadowGraphics.ellipse(0, 95, 65, 14);
        this.shadowGraphics.fill({ color: 0x000000, alpha: 0.35 });
    }
    /**
     * Draw normal state (0-33% panic)
     * Sitting human, slightly concerned but calm
     */
    drawNormal(breathe, time) {
        const g = new Graphics();
        // Pants (sitting position)
        g.ellipse(0, 85, 52, 22);
        g.fill(colors.character.normal.pants);
        // Body/shirt
        g.ellipse(0, 58 + breathe, 40, 48);
        g.fill(colors.character.normal.shirt);
        // Neck
        g.rect(-7, 10, 14, 14);
        g.fill(colors.character.normal.skin);
        // Head
        g.circle(0, -14, 42);
        g.fill(colors.character.normal.skin);
        // Hair
        g.moveTo(-43, -14);
        g.arc(0, -24, 43, Math.PI, 0);
        g.lineTo(43, -14);
        g.lineTo(34, 4);
        g.lineTo(-34, 4);
        g.lineTo(-43, -14);
        g.fill(colors.character.normal.hair);
        // Hair tuft
        g.moveTo(-4, -56);
        g.lineTo(6, -68);
        g.lineTo(15, -55);
        g.fill(colors.character.normal.hair);
        // Eyes (white)
        g.circle(-14, -8, 9);
        g.fill(0xffffff);
        g.circle(14, -8, 9);
        g.fill(0xffffff);
        // Pupils
        g.circle(-14, -8, 3);
        g.fill(0x222222);
        g.circle(14, -8, 3);
        g.fill(0x222222);
        // Eye highlights
        g.circle(-12, -10, 1.2);
        g.fill(0xffffff);
        g.circle(16, -10, 1.2);
        g.fill(0xffffff);
        // Eyebrows
        g.moveTo(-22, -22);
        g.lineTo(-7, -19);
        g.stroke({ color: colors.character.normal.hair, width: 2.5 });
        g.moveTo(7, -22);
        g.lineTo(22, -25);
        g.stroke({ color: colors.character.normal.hair, width: 2.5 });
        // Mouth (small concerned line)
        g.moveTo(-7, 14);
        g.lineTo(7, 14);
        g.stroke({ color: 0xc0392b, width: 2 });
        // Arms (at sides)
        g.rect(-50, 48, 18, 38);
        g.fill(colors.character.normal.shirt);
        g.rect(32, 48, 18, 38);
        g.fill(colors.character.normal.shirt);
        // Hands
        g.circle(-41, 84, 7);
        g.fill(colors.character.normal.skin);
        g.circle(41, 84, 7);
        g.fill(colors.character.normal.skin);
        this.bodyContainer.addChild(g);
        // Speech bubble
        this.drawSpeech('Is this even real?', 0x778899, time);
    }
    /**
     * Draw panic state (33-66% panic)
     * Worried, shaking, hands on head, worry clouds
     */
    drawPanic(breathe, time, _panic) {
        const g = new Graphics();
        // Shake effect
        const shake = Math.sin(time / 40) * 3;
        g.x = shake;
        // Pants
        g.ellipse(0, 85, 52, 22);
        g.fill(colors.character.panic.pants);
        // Body (darker blue, more tense)
        g.ellipse(0, 58 + breathe, 42, 50);
        g.fill(colors.character.panic.shirt);
        // Neck
        g.rect(-7, 8, 14, 14);
        g.fill(colors.character.panic.skin);
        // Head
        g.circle(0, -14, 44);
        g.fill(colors.character.panic.skin);
        // Hair (messier)
        g.moveTo(-45, -14);
        g.arc(0, -24, 45, Math.PI, 0);
        g.lineTo(45, -14);
        g.lineTo(34, 4);
        g.lineTo(-34, 4);
        g.lineTo(-45, -14);
        g.fill(colors.character.panic.hair);
        // Hair tufts (standing up from stress)
        g.moveTo(-12, -58);
        g.lineTo(-20, -76);
        g.lineTo(-6, -60);
        g.fill(colors.character.panic.hair);
        g.moveTo(8, -60);
        g.lineTo(18, -78);
        g.lineTo(22, -58);
        g.fill(colors.character.panic.hair);
        // Eyes (wider, stressed)
        g.circle(-14, -8, 12);
        g.fill(0xffffff);
        g.circle(14, -8, 12);
        g.fill(0xffffff);
        // Pupils (smaller, stressed)
        g.circle(-14, -8, 1.5);
        g.fill(0x222222);
        g.circle(14, -8, 1.5);
        g.fill(0x222222);
        // Mouth (open, worried)
        g.ellipse(0, 18, 9, 6);
        g.fill(0x111111);
        // Arms (hands on head in panic)
        g.moveTo(-42, 38);
        g.lineTo(-55, 0);
        g.lineTo(-38, -22);
        g.lineTo(-25, 8);
        g.fill(colors.character.panic.skin);
        g.moveTo(42, 38);
        g.lineTo(55, 0);
        g.lineTo(38, -22);
        g.lineTo(25, 8);
        g.fill(colors.character.panic.skin);
        // Sweat drops (blinking)
        if (Math.floor(time / 150) % 2 === 0) {
            g.circle(48, 0, 3.5);
            g.fill(0x5dade2);
            g.circle(-48, 4, 3);
            g.fill(0x5dade2);
        }
        // Worry cloud lines radiating outward
        const cloudG = new Graphics();
        for (let i = 0; i < 4; i++) {
            const angle = (time / 250 + i * 1.6) % (Math.PI * 2);
            cloudG.moveTo(Math.cos(angle) * 55, -14 + Math.sin(angle) * 55);
            cloudG.lineTo(Math.cos(angle) * 68, -14 + Math.sin(angle) * 68);
            cloudG.stroke({ color: 0xe74c3c, alpha: 0.25, width: 1 });
        }
        g.addChild(cloudG);
        this.bodyContainer.addChild(g);
        // Speech bubble
        this.drawSpeech("IT'S EXPONENTIAL!!!", 0xf1c40f, time);
    }
    /**
     * Draw Psyduck state (66-100% panic)
     * Full Psyduck transformation with aura and lightning
     */
    drawPsyduck(breathe, time, panic) {
        const g = new Graphics();
        // Random shake/jitter
        const shake = (Math.random() - 0.5) * 7;
        g.x = shake * 0.5;
        // Aura (behind character)
        const auraSize = 75 + Math.sin(time / 200) * 18;
        this.auraGraphics = new Graphics();
        // Create radial gradient effect manually
        for (let r = auraSize; r > 25; r -= 3) {
            const alpha = 0.15 * (1 - (auraSize - r) / auraSize);
            const color = r % 6 < 3 ? 0xf1c40f : 0x8e44ad;
            this.auraGraphics.circle(0, 0, r);
            this.auraGraphics.fill({ color, alpha });
        }
        this.container.addChildAt(this.auraGraphics, 1); // Behind body
        // Body (Psyduck body)
        g.ellipse(0, 55, 50 + breathe, 55 - breathe);
        g.fill(colors.character.psyduck.body);
        g.stroke({ color: colors.character.psyduck.outline, width: 2.5 });
        // Head
        g.circle(shake, -8, 48);
        g.fill(colors.character.psyduck.body);
        g.stroke({ color: colors.character.psyduck.outline, width: 2.5 });
        // Hair tufts (3 spikes)
        const hx = shake;
        const hy = -56;
        g.moveTo(hx, hy);
        g.lineTo(hx, hy - 26);
        g.stroke({ color: 0x222222, width: 3.5 });
        g.moveTo(hx, hy);
        g.lineTo(hx - 13, hy - 22);
        g.stroke({ color: 0x222222, width: 3.5 });
        g.moveTo(hx, hy);
        g.lineTo(hx + 13, hy - 22);
        g.stroke({ color: 0x222222, width: 3.5 });
        // Eyes (large Psyduck eyes)
        g.circle(shake - 20, -16, 14);
        g.fill(0xffffff);
        g.stroke({ color: 0x222222, width: 2 });
        g.circle(shake + 20, -16, 14);
        g.fill(0xffffff);
        g.stroke({ color: 0x222222, width: 2 });
        // Pupils (tiny confused look)
        g.circle(shake - 20, -16, 1.5);
        g.fill(0x111111);
        g.circle(shake + 20, -16, 1.5);
        g.fill(0x111111);
        // Beak
        g.ellipse(shake, 6, 24, 9);
        g.fill(colors.character.psyduck.beak);
        g.stroke({ color: 0xd68910, width: 2 });
        // Wings/arms
        g.ellipse(shake - 44, 10, 12, 28);
        g.fill(colors.character.psyduck.body);
        g.stroke({ color: colors.character.psyduck.outline, width: 2 });
        g.ellipse(shake + 44, 10, 12, 28);
        g.fill(colors.character.psyduck.body);
        g.stroke({ color: colors.character.psyduck.outline, width: 2 });
        // Psychic wave rings (scales with panic)
        const waveCount = Math.floor(panic / 18);
        for (let i = 0; i < waveCount; i++) {
            const radius = 58 + i * 18 + Math.sin(time / 150 + i) * 8;
            const color = i % 2 === 0 ? 0x8e44ad : 0xf1c40f;
            g.circle(shake, -8, Math.max(1, radius));
            g.stroke({ color, alpha: 0.35, width: 2 });
        }
        // Lightning bolts at high panic
        if (panic > 80) {
            for (let i = 0; i < 3; i++) {
                const angle = time / 100 + i * ((Math.PI * 2) / 3);
                const distance = 50 + Math.sin(time / 80 + i) * 8;
                const lx = shake + Math.cos(angle) * distance - 7;
                const ly = -8 + Math.sin(angle) * distance + 5;
                const lightning = new Text({
                    text: '⚡',
                    style: { fontSize: 13, fill: 0xf1c40f, fontFamily: 'Arial' },
                });
                lightning.x = lx;
                lightning.y = ly;
                lightning.anchor.set(0.5);
                g.addChild(lightning);
            }
        }
        this.bodyContainer.addChild(g);
        // Speech bubble
        this.drawSpeech('PSY-AY-AY!!!', 0xe74c3c, time);
    }
    /**
     * Draw speech bubble above character
     */
    drawSpeech(text, color, time) {
        const bob = Math.sin(time / 500) * 3;
        if (this.speechText) {
            this.bodyContainer.removeChild(this.speechText);
        }
        this.speechText = new Text({
            text,
            style: new TextStyle({
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 10,
                fill: color,
                align: 'center',
                dropShadow: {
                    alpha: 0.8,
                    blur: 6,
                    color: 0x000000,
                },
            }),
        });
        this.speechText.anchor.set(0.5);
        this.speechText.x = 0;
        this.speechText.y = -80 + bob;
        this.bodyContainer.addChild(this.speechText);
    }
    /**
     * Set character position
     */
    setPosition(x, y) {
        this.container.x = x;
        this.container.y = y;
    }
    /**
     * Destroy and cleanup
     */
    destroy() {
        this.container.destroy({ children: true });
    }
}

# Apple Touch Icon

The `apple-touch-icon.png` is automatically generated from `icon.svg` using the Sharp library.

## Automatic Generation

The icon is generated automatically before each build:

```bash
pnpm build  # Runs prebuild hook which generates icons
```

Or generate manually:

```bash
pnpm generate:icons
```

## Manual Generation (if needed)

If Sharp isn't available, you can generate manually:

### Using ImageMagick

```bash
convert -background none -resize 180x180 public/icon.svg public/apple-touch-icon.png
```

### Using Inkscape

```bash
inkscape public/icon.svg --export-png=public/apple-touch-icon.png --export-width=180 --export-height=180
```

### Using Online Tools

Visit https://cloudconvert.com/svg-to-png and convert at 180x180px.

## Icon Design

The icon features:
- **Brand Colors**: Yellow (#ffcc00) for Psyduck, dark background (#0a0a18)
- **Character**: Simplified Psyduck with panic/confusion expression
- **Thought Bubble**: Question mark representing AI hype confusion  
- **Stress Marks**: Red lines showing panic state
- **Retro Border**: Pixel-style rounded rectangle for gaming aesthetic

The design aligns with the game's branding: retro gaming + Psyduck + AI panic theme.

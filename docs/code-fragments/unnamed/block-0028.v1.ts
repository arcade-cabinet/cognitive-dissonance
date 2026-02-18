**Default paths after shadcn init**

- UI components → `components/ui/`
- Global styles → `app/globals.css` or `styles/globals.css`
- Pages → `app/`

**Important**: Always put reusable UI primitives in `components/ui/`  
This is the shadcn convention. If you put them elsewhere:
- `npx shadcn add` commands break
- Auto-imports / IDE suggestions become inconsistent
- Team members get confused

So yes — create/use `components/ui/` for this shader.

### Step-by-step Integration

1. Install required dependencies
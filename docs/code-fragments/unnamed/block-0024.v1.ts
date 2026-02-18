This automatically creates:
- `components/ui/` folder (default location for all UI components)
- `app/globals.css` with Tailwind directives
- `components.json` with aliases (`@/components/ui`)

**Why `/components/ui` is mandatory**  
shadcn CLI, auto-imports, and the entire ecosystem expect components to live in `components/ui/`.  
If you put them elsewhere the CLI (`npx shadcn add`) will fail and your imports will be inconsistent. Always use this folder.

**Dependencies** (already included by shadcn init):
- Tailwind CSS
- TypeScript
- No extra packages needed for this shader (pure browser WebGL2).

### Step 1: Copy the Adapted Component to `/components/ui/atc-shader.tsx`
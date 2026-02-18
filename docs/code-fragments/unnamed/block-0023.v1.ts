Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them


**[ASSISTANT]**

**✅ Full Integration of the ATC Shader as Gameboard Background in Your shadcn + Reactylon + Babylon.js Project**

I have analyzed the provided `ShaderDemo_ATC` component. It is a self-contained, full-screen WebGL2 shader canvas with a beautiful animated fractal background — perfect for the gameboard.

### Step 0: Project Setup (shadcn + Tailwind + TypeScript)

If your project is **not** already a shadcn project, run this once:
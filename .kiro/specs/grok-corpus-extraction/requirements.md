# Requirements Document

## Introduction

This feature covers the complete multi-stage pipeline to extract, audit, modernize, extend, integrate, and verify the Cognitive Dissonance codebase from four Grok conversation documents stored in `docs/memory-bank/`. The pipeline has nine distinct stages:

1. **Extraction Manual Parsing** — Parse and validate the landmark-guided extraction manual at the tail of the master document (~28K lines).
2. **Documentation Extraction** — Extract 11 definitive design markdown files using landmarks.
3. **Code Extraction** — Extract all definitive code files using landmarks into a staging area.
4. **Corpus Cross-Reference** — Compare extracted code against the existing `src/` codebase, the 26 definitive code extractions in `docs/memory-bank/grok-doc/definitive/`, and the 170 versioned code fragments in `docs/code-fragments/` to identify gaps, conflicts, and superseded versions.
5. **Supplemental Doc Cross-Reference** — Cross-reference every extracted code file against the three supplemental documents (v3.0 Architecture, Reactylon Native Migration, Babylon v8 Upgrade) to classify files as keep/modernize/replace/delete and identify all new files defined only in supplemental docs.
6. **Modernization** — Upgrade all extracted code from legacy patterns (Babylon.js v7 barrel imports, web-only APIs, GLSL-only shaders) to the current stack (Babylon.js 8 tree-shakable imports, React 19, Reactylon 3.5.4, WGSL dual shaders, CSP-safe Effect.ShadersStore).
7. **New System Creation** — Create all new architectural files defined in the supplemental docs (ECS archetypes, XR/AR managers, haptics, morph enemies, boss systems, system orchestrators, etc.) that do not exist in the extraction manual.
8. **Integration & Wiring** — Wire all extracted, modernized, and new files into the existing architecture, update build configs, resolve dependency additions, and connect the SystemOrchestrator.
9. **Verification & Audit** — Build, lint, test, and produce a complete extraction manifest tracing every file to its source.

The three supplemental documents take precedence over the master extraction manual for all modernization decisions. The current working Next.js 16 + Reactylon web build must remain functional throughout.

## Glossary

- **Master_Document**: The file `docs/memory-bank/Grok-Procedural_Robot_Bust_Modeling_Breakdown.md` (~28K lines) containing the full Grok conversation history and the extraction manual at its tail.
- **Extraction_Manual**: The section at the tail of the Master_Document titled "EXTRACTION MANUAL FOR COGNITIVE DISSONANCE – LINE-BY-LINE, LANDMARK-GUIDED, NO AMBIGUITY" that maps every definitive file to a unique landmark phrase, approximate line range, and repository path.
- **Supplemental_Docs**: The three additional Grok conversation documents that provide modernization instructions superseding the Master_Document's older code:
  - `Grok-Cognitive_Dissonance_v3.0_Architecture_Locked.md` (v3.0 Architecture — Miniplex ECS elevation, dual AR/MR modes, morph-based Yuka enemies, crystalline-cube boss, system orchestration, 100% gaps closure)
  - `Grok-Cognitive_Dissonance__Reactylon_Native_Migration.md` (Reactylon Native Migration — file keep/delete/adapt classification, step-by-step migration, critical renderer upgrade plan)
  - `Grok-Babylon.js_v8_+_Reactylon_Native_Upgrade_Plan.md` (Babylon v8 Upgrade — tree-shakable imports, WebGPU engine init, WGSL shaders, React 19, full refactored code for all impacted files)
- **Landmark_Phrase**: A unique string that appears only in the definitive version of a file within the Master_Document, used for Ctrl+F extraction.
- **Definitive_Block**: The final, consolidated, post-refinement version of a file as identified by its Landmark_Phrase in the Extraction_Manual.
- **Extraction_Script**: An automated TypeScript script that locates Landmark_Phrases in the Master_Document and extracts the corresponding Definitive_Blocks.
- **Staging_Directory**: A temporary directory (`extraction-staging/`) where extracted code is placed for review before integration into `src/`.
- **Cross_Reference_Report**: A markdown report classifying every extracted file and identifying gaps between extracted code, existing `src/` code, and supplemental doc requirements.
- **Modernization_Pass**: The process of upgrading extracted code from legacy patterns to the current stack.
- **Legacy_Files**: Files in the current repository that are web-only artifacts not part of the current build (e.g., `index.html`, `index.html.old-canvas`, `postcss.config.mjs`).
- **New_System_Files**: Files defined in the Supplemental_Docs that do not exist in the Master_Document extraction manual or the current `src/` directory.
- **Corpus**: The full Grok conversation corpus in `docs/memory-bank/grok-doc/` (165 indexed turns, 52 prose docs, 7 shader-port turns, 26 definitive code extractions) and `docs/code-fragments/` (170 versioned iterations).
- **Extraction_Manifest**: A markdown file at `docs/memory-bank/extraction-manifest.md` that traces every extracted and created file to its source document, landmark, and classification.

## Requirements

### Requirement 1: Documentation Extraction from Master Document

**User Story:** As a developer, I want to extract all 11 definitive documentation markdown files from the Master_Document using the Extraction_Manual's landmarks, so that the project's design knowledge is preserved as standalone files.

#### Acceptance Criteria

1. WHEN the Extraction_Script processes the Master_Document, THE Extraction_Script SHALL locate each of the 11 documentation Landmark_Phrases (PROJECT_OVERVIEW, GAME_IDENTITY, FACTORY_SYSTEMS, ECS, BABYLONJS_AND_21DEV, GSAP_MECHANICS, EVOLUTION_FROM_SHADCN, WHAT_THE_GAME_IS, AUDIO_SYSTEM, POST_PROCESS_AND_VISUALS, XR_AND_HAPTICS) and extract the complete text block from the landmark to the next major header.
2. WHEN a documentation Definitive_Block is extracted, THE Extraction_Script SHALL write the block to the repository path specified in the Extraction_Manual (root-level `.md` files).
3. WHEN all 11 documentation files are extracted, THE Extraction_Script SHALL verify that each output file contains its corresponding Landmark_Phrase.
4. IF a Landmark_Phrase is not found in the Master_Document, THEN THE Extraction_Script SHALL report the missing landmark and the file name, and continue processing remaining files.

### Requirement 2: Code Extraction from Master Document

**User Story:** As a developer, I want to extract all definitive code files from the Master_Document using the Extraction_Manual's landmarks, so that I have the complete consolidated codebase as a baseline for modernization.

#### Acceptance Criteria

1. WHEN the Extraction_Script processes the Master_Document for code files, THE Extraction_Script SHALL locate each code file's Landmark_Phrase and extract the complete code block (from `use client` or first `import`/`export` to the closing brace or end of the code fence).
2. THE Extraction_Script SHALL extract all code files listed in the Extraction_Manual: `package.json`, `app/page.tsx`, 11 component files (`gameboard.tsx`, `ai-sphere.tsx`, `platter.tsx`, `pattern-stabilizer.tsx`, `enemy-spawner.tsx`, `post-process-corruption.tsx`, `spatial-audio.tsx`, `physics-keys.tsx`, `sps-enemies.tsx`, `diegetic-gui.tsx`, `audio-engine.tsx`), 3 store files (`seed-store.ts`, `level-store.ts`, `audio-store.ts`), `lib/seed-factory.ts`, and `game/world.ts`.
3. WHEN a code Definitive_Block is extracted, THE Extraction_Script SHALL write the block to a staging directory (not directly overwriting `src/`) to allow review before integration.
4. IF a code Landmark_Phrase matches multiple locations in the Master_Document, THEN THE Extraction_Script SHALL select the last occurrence (the most consolidated version) and log a warning.

### Requirement 3: Cross-Reference Extracted Code with Supplemental Documents

**User Story:** As a developer, I want to cross-reference every extracted code file against the three Supplemental_Docs to identify which files need modernization, so that no legacy v7/web-only code enters the production codebase.

#### Acceptance Criteria

1. WHEN code files are extracted from the Master_Document, THE Cross_Reference_Report SHALL classify each file into one of four categories: "keep as-is" (already modern), "needs modernization" (v7 imports, web-only patterns, GLSL-only), "replace entirely" (Supplemental_Docs provide a complete rewrite), or "delete" (file conflicts with target architecture).
2. THE Cross_Reference_Report SHALL flag any file containing non-tree-shakable Babylon.js imports (e.g., `import * as BABYLON from 'babylonjs'` or `import * as BABYLON from '@babylonjs/core'` barrel imports) as "needs modernization".
3. THE Cross_Reference_Report SHALL flag any file containing Next.js-specific patterns (e.g., `src/app/` router code, `next.config.ts` references) that conflict with the dual web+native target as "needs modernization" or "replace entirely" per the Reactylon Native Migration doc.
4. THE Cross_Reference_Report SHALL identify all files listed in the Babylon v8 Upgrade doc's "Full Rewrite" section and mark them as "replace entirely" with a reference to the upgraded code block in the Supplemental_Doc.

### Requirement 4: Legacy File Cleanup

**User Story:** As a developer, I want to remove legacy files that conflict with the target architecture, so that the repository is clean and free of Next.js/web-only pollution.

#### Acceptance Criteria

1. THE Cleanup_Plan SHALL identify all files marked for deletion by the Reactylon Native Migration doc: `index.html`, `index.html.old-canvas`, `postcss.config.mjs`, and any other root-level files that are web-only artifacts not part of the current Next.js 16 build.
2. WHEN Legacy_Files are removed, THE Cleanup_Plan SHALL preserve all files in `docs/`, `screenshots/`, `scripts/`, `.github/`, `.gemini/`, `LICENSE`, `CHANGELOG.md`, and `AGENTS.md`.
3. WHEN Legacy_Files are removed, THE Cleanup_Plan SHALL NOT delete any file currently required by the working Next.js 16 + Reactylon web build (`src/app/`, `next.config.ts`, `babel.config.js`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`) since the web build must remain functional.
4. IF a file is listed for deletion in a Supplemental_Doc but is required by the current working web build, THEN THE Cleanup_Plan SHALL defer that deletion to a future native migration phase and document the deferral.

### Requirement 5: Code Modernization Pass

**User Story:** As a developer, I want all extracted code files to be modernized to the current stack (Babylon.js 8 tree-shakable, React 19, Reactylon 3.5.4, CSP-safe shaders), so that the codebase is production-ready without legacy patterns.

#### Acceptance Criteria

1. WHEN a code file is classified as "needs modernization", THE Modernization_Pass SHALL replace all non-tree-shakable Babylon.js imports with specific `@babylonjs/core` subpath imports (e.g., `import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'` or at minimum `import { MeshBuilder } from '@babylonjs/core'`).
2. WHEN a code file contains GLSL shaders stored in `Effect.ShadersStore`, THE Modernization_Pass SHALL preserve the GLSL as the primary shader path (CSP-safe static strings) and add WGSL equivalents where the v3.0 Architecture doc provides them.
3. WHEN a code file is classified as "replace entirely", THE Modernization_Pass SHALL use the complete upgraded code block from the relevant Supplemental_Doc as the replacement, adapting it to the current project structure (`src/components/`, `src/store/`, `src/lib/`, etc.).
4. THE Modernization_Pass SHALL ensure all modernized files use React 19 patterns (no legacy `forwardRef` where `ref` prop suffices, `use()` hook where applicable) and Reactylon 3.5.4 declarative JSX for lights, cameras, and scene setup.
5. WHEN a modernized file references a Zustand store, THE Modernization_Pass SHALL preserve the existing Zustand bridge pattern (`getState()` in render loops, selectors in React components).

### Requirement 6: New System File Creation

**User Story:** As a developer, I want all new system files defined in the Supplemental_Docs to be created in the repository, so that the codebase includes the complete v3.0+ architecture (ECS archetypes, XR, AR, haptics, enemies, systems, orchestration).

#### Acceptance Criteria

1. THE New_System_File creation plan SHALL include all files defined in the v3.0 Architecture doc that do not exist in the current repository, organized into the following categories: ECS (`src/ecs/World.ts`, `src/ecs/HandArchetypes.ts`, `src/ecs/ARArchetypes.ts`, `src/ecs/BossArchetypes.ts`, `src/ecs/YukaArchetypes.ts`), XR/AR (`src/xr/ARSessionManager.ts`, `src/xr/XRManager.ts`, `src/xr/PhoneProjectionTouchSystem.ts`, `src/xr/HandInteractionSystem.ts`), Haptics (`src/haptics/MechanicalHaptics.ts`), Enemies (`src/enemies/CrystallineCubeBossSystem.ts`, `src/enemies/ProceduralMorphSystem.ts`), Shaders (`src/shaders/AROcclusionMaterial.ts`, `src/shaders/SphereNebulaMaterial.ts`), Systems (`src/systems/TensionSystem.ts`, `src/systems/PatternStabilizationSystem.ts`, `src/systems/MechanicalAnimationSystem.ts`, `src/systems/CorruptionTendrilSystem.ts`, `src/systems/EchoSystem.ts`, `src/systems/SharedDreamsSystem.ts`, `src/systems/SystemOrchestrator.ts`), UI (`src/ui/DiegeticCoherenceRing.ts`), Sequences (`src/sequences/TitleAndGameOverSystem.ts`), Accessibility (`src/accessibility/DiegeticAccessibility.ts`), PostProcess (`src/postprocess/PostProcessCorruption.ts`), Fallback (`src/fallback/MechanicalDegradationSystem.ts`), Objects (`src/objects/MechanicalPlatter.tsx`), Configs (`src/configs/patterns.json`, `src/configs/configLoader.ts`), Utils (`src/utils/DeviceQuality.ts`), Engine (`src/engine/EngineInitializer.ts`), Audio (`src/audio/ImmersionAudioBridge.ts`), and Root (`src/CognitiveDissonanceRoot.tsx`).
2. WHEN creating New_System_Files, THE creation process SHALL use the production-ready code blocks from the Supplemental_Docs as the source, adapting imports to match the current project's module resolution and directory structure.
3. WHEN a New_System_File references a dependency not in the current `package.json`, THE creation process SHALL document the required dependency addition (e.g., `expo-haptics`, `expo-speech`, `expo-device`).
4. IF a New_System_File conflicts with an existing file in `src/` (e.g., `src/game/world.ts` vs new `src/ecs/World.ts`), THEN THE creation process SHALL document the conflict and propose a resolution (migrate, merge, or replace).

### Requirement 7: Build Configuration Alignment

**User Story:** As a developer, I want the build configuration files to be aligned with the target architecture, so that the project builds successfully with all extracted and new code.

#### Acceptance Criteria

1. WHEN new dependencies are required by New_System_Files or modernized code, THE Build_Configuration update SHALL add them to `package.json` with versions matching the Supplemental_Docs' specifications (e.g., `@babylonjs/materials: ^8.0.0`, `@babylonjs/physics: ^8.0.0`).
2. THE Build_Configuration update SHALL preserve the existing working Next.js 16 + Turbopack + Reactylon web build pipeline (`pnpm dev`, `pnpm build`, `pnpm start`).
3. WHEN `tsconfig.json` requires path aliases for new directories (e.g., `src/ecs/`, `src/systems/`, `src/xr/`), THE Build_Configuration update SHALL add the necessary path mappings.
4. THE Build_Configuration update SHALL ensure `babel.config.js` retains `@babel/preset-typescript` and `babel-plugin-reactylon` as required by the Turbopack + Reactylon integration.

### Requirement 8: Extraction Verification

**User Story:** As a developer, I want to verify that the extracted, modernized, and newly created codebase builds and passes lint checks, so that I have confidence the extraction was successful.

#### Acceptance Criteria

1. WHEN all extraction, modernization, cleanup, and new file creation tasks are complete, THE Verification_Step SHALL run `pnpm build` and confirm zero build errors.
2. WHEN all tasks are complete, THE Verification_Step SHALL run `pnpm lint` and confirm zero errors and zero warnings.
3. WHEN all tasks are complete, THE Verification_Step SHALL run `pnpm test` and confirm all existing unit tests pass (no regressions from extraction).
4. IF `pnpm build` fails after extraction, THEN THE Verification_Step SHALL identify the failing module, trace it to the extraction or modernization step that introduced the error, and document the fix required.

### Requirement 9: Extraction Audit Trail

**User Story:** As a developer, I want a complete audit trail mapping every extracted file to its source location in the Grok documents, so that I can trace any code back to its origin for future reference.

#### Acceptance Criteria

1. THE Extraction_Audit SHALL produce a manifest file listing every extracted and created file with: source document name, landmark phrase used, approximate line range, extraction category (documentation, code-keep, code-modernized, code-replaced, new-system), and final repository path.
2. THE Extraction_Audit manifest SHALL be stored at `docs/memory-bank/extraction-manifest.md`.
3. WHEN a file is modernized or replaced, THE Extraction_Audit SHALL record both the original extracted version's landmark and the Supplemental_Doc section that provided the modernized replacement.

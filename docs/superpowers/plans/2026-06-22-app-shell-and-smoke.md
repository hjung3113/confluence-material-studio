# App Shell And Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the smallest real app/editor shell and smoke harness that proves the MVP import-edit-preview-export loop over `packages/core`.

**Architecture:** Keep product logic in `packages/core`. Add `packages/app` as a dependency-light Vite/TypeScript browser app that imports `@htmleditor/core`, renders a document workspace, exposes basic editor mutations, and shows export/compatibility state. Add `packages/test-harness` as Node-based smoke verification that serves the built app and verifies rendered HTML without introducing Playwright until the app surface stabilizes.

**Tech Stack:** TypeScript, Vite already present through the repo toolchain, Node.js built-ins, Vitest for app unit/smoke tests, existing `@htmleditor/core` APIs.

---

## File Structure

- Create `packages/app/package.json`: app workspace scripts.
- Create `packages/app/tsconfig.json`: browser TypeScript config.
- Create `packages/app/vite.config.ts`: Vite build config with `@htmleditor/core` alias to core source.
- Create `packages/app/index.html`: app entry.
- Create `packages/app/src/appModel.ts`: deterministic app state and editor mutations.
- Create `packages/app/src/renderTree.ts`: render `RenderNode` to safe HTML for preview.
- Create `packages/app/src/main.ts`: browser UI wiring.
- Create `packages/app/test/appModel.test.ts`: TDD coverage for import/edit/theme/reorder/export behavior.
- Create `packages/test-harness/package.json`: smoke harness workspace scripts.
- Create `packages/test-harness/tsconfig.json`: Node TypeScript config.
- Create `packages/test-harness/src/app-smoke.ts`: build-output HTTP smoke against the app.
- Modify `package.json`: include workspaces and scripts.
- Modify `README.md` and testing docs with app/harness commands.

## Tasks

### Task 1: App Workspace And Model

- [ ] Write failing `packages/app/test/appModel.test.ts` covering fixture import, inline title edit, theme edit, section reorder, export artifacts, hostile warnings, and macro candidate summary.
- [ ] Run `npm test --workspace @htmleditor/app -- appModel.test.ts`; expected failure because app workspace/model does not exist.
- [ ] Add `packages/app` config and `src/appModel.ts`.
- [ ] Re-run focused app test; expected pass.

### Task 2: Browser App Surface

- [ ] Add `renderTree.ts`, `main.ts`, `index.html`, and `vite.config.ts`.
- [ ] App must show source fixture selector, section navigator, live canvas, inspector text field, theme color field, reorder/duplicate/delete buttons, preview width buttons, compatibility warnings, macro summary, and four export artifact names.
- [ ] Run `npm run build --workspace @htmleditor/app`; expected pass.

### Task 3: Test Harness Smoke

- [ ] Write failing `packages/test-harness/src/app-smoke.ts` expectation path through built `packages/app/dist/index.html`.
- [ ] Add `packages/test-harness` config and root `app:smoke` script.
- [ ] Harness must verify built app contains the shell root, bundled JS, and static labels required by the MVP surface.
- [ ] Run `npm run app:smoke`; expected pass after app build.

### Task 4: Docs And Final Verification

- [ ] Update README and `docs/testing/verification-strategy.md` with `npm run app:smoke`.
- [ ] Run `npm run smoke`.
- [ ] Run `npm run app:smoke`.
- [ ] Run `npm run verify`.
- [ ] Commit and push `main`.

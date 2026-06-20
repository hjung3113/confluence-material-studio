# Product Brief

## Product Identity

This repository builds a Confluence material studio for creating and editing presentation-style internal materials.

It is not a presentation runtime, not a generic website builder, and not a raw HTML IDE. HTML is one output target. Confluence-oriented artifacts are first-class targets.

## Target Users

- Internal staff who need polished presentation-style material but do not want to edit HTML directly.
- Writers who start from AI-generated HTML, Markdown, or an outline and need controlled cleanup.
- Teams that publish material into Confluence and need to choose between visual fidelity and native Confluence editability.

## Core Workflow

1. Import a draft from HTML, Markdown, or an outline.
2. Preserve the original source artifact.
3. Normalize the draft into a render tree plus semantic overlay.
4. Edit sections, blocks, themes, and constrained visual regions.
5. Preview target-specific output.
6. Export concrete artifacts with compatibility reports.

## Product Promises

- Standalone HTML export prioritizes visual fidelity.
- Confluence fragment export balances visual fidelity with Confluence constraints.
- Native mapping report explains what can become Confluence-native content or macros.
- The UI must not imply that native Confluence output will look identical to standalone HTML.

## Non-goals

- Presenter mode, timers, speaker view, remotes, or live presentation tooling.
- Direct LLM/API integration in MVP.
- Full lossless editing for arbitrary HTML/CSS/JS.
- Real-time Confluence synchronization in MVP.
- Confluence API publish/update in MVP.
- Forge macro deployment in MVP.


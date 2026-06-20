# Engineering Conventions

## Language and Style

- Use TypeScript for product code.
- Prefer explicit domain types over loose objects.
- Keep parser/export logic deterministic.
- Avoid comments that restate code; comment only non-obvious constraints or algorithms.

## Module Boundaries

- `packages/core` owns product logic.
- `packages/app` owns UI.
- `packages/test-harness` owns verification helpers.
- UI code must not reimplement import/export/sanitizer rules.

## Error Handling

- Use typed failures for importer/exporter errors.
- Include rule IDs in compatibility-related failures.
- Do not silently drop nodes, assets, styles, or warnings.

## Dependency Rules

- Runtime generated artifacts must not depend on external CDN or network calls.
- npm dependencies may be bundled into the app build.
- Any editor library must be wrapped behind app/core boundaries so document format does not depend on that library.

## Naming

- Compatibility rule IDs use uppercase snake case.
- Export adapter names use target names: `standalone-html`, `confluence-fragment`, `native-mapping`.
- Fixture names should describe the behavior being tested.


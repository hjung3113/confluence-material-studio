# Import Risk Model

## Risk Levels

| Level | Meaning | UI Treatment |
| --- | --- | --- |
| Info | Supported with minor caveats | Show in report only |
| Warning | Supported but target-specific output may degrade | Show in import/export panel |
| Error | Unsafe or unsupported for target | Block target or require change |

## Risk Categories

- Security risk: scripts, inline handlers, JavaScript URLs.
- Fidelity risk: unsupported layout, missing assets, global CSS, viewport sizing.
- Confluence risk: fixed positioning, overflow, macro mismatch, iframe dependency.
- Editability risk: locked nodes, raw HTML, unknown structures.

## Safe Defaults

- Preserve source artifact.
- Do not execute imported dynamic content.
- Do not fetch remote assets automatically.
- Do not claim native Confluence equivalence.
- Prefer warnings over silent mutation.

## User-Facing Requirements

Import and export screens should show:

- count by severity,
- affected target,
- recommended fix,
- whether the artifact can still be exported.


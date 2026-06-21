# Context

## Terms

### Source Artifact

The immutable imported input stored with a project for audit, fallback, and visual comparison.

MVP source artifacts are not official export targets. They may be displayed in an inert viewer or used as fixture baselines, but executable original HTML re-export is outside MVP.

### Render Tree

The canonical, HTML-like editable structure used for visual output and standalone or fragment export.

The render tree preserves output structure and styling references. It is not a full browser CSS engine or a guarantee that every imported structure becomes semantically editable.

### Semantic Overlay

Metadata layered over render tree nodes to power editor controls and Confluence native mapping analysis.

Semantic overlay recognition may be incomplete. Failed recognition must never delete render tree content or block standalone HTML export.

### Locked Node

A render tree node that can be displayed and exported but exposes reduced editing controls because the importer cannot safely model it as normal structured content.

Locked nodes preserve fidelity first and editability second.

### Theme Token

A constrained design value that the editor exposes for safe visual changes, such as colors, font stack, spacing, radius, and simple shadows.

Theme tokens are the MVP styling control surface. Imported CSS outside that control surface may be preserved for output without becoming directly editable.

### Compatibility Rule

A stable, target-specific rule ID that explains export risk, unsupported behavior, security removal, or expected visual loss.

Compatibility rules are product contracts, not incidental UI copy.

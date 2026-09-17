# Agent Guidelines for LexiPulse

## Mandatory Documentation Verification

Before making **any** changes (features, bug fixes, refactoring, dependencies, schema updates, or configuration), you **MUST** first consult and verify against the project documentation:

1. **[ARCHITECTURE.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/ARCHITECTURE.md)** — Architectural principles, offline-first constraints, system layer separation, and data flow.
2. **[/docs/](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/)**:
   - **[docs/README.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/README.md)** — Product operation overview & lifecycle.
   - **[docs/DATA_SCHEMA.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/DATA_SCHEMA.md)** — SQLite schema, FTS5 search index, MMKV keys, and TypeScript types.
   - **[docs/NOTIFICATION_ENGINE.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/NOTIFICATION_ENGINE.md)** — Rolling buffer algorithm, local scheduling, notification categories, and deep links.
   - **[docs/SPACED_REPETITION.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/SPACED_REPETITION.md)** — SuperMemo-2 (SM-2) algorithm, mathematical formulas, and Leitner model.
   - **[docs/FEATURES_AND_ROADMAP.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/FEATURES_AND_ROADMAP.md)** — Offline feature specifications and phased roadmap.
   - **[docs/DEVELOPMENT_GUIDE.md](file:///home/otavioemanoel/Documentos/Projetos/LexiPulse/docs/DEVELOPMENT_GUIDE.md)** — Project layout, local setup, and testing guides.

All changes must strictly adhere to the 100% offline, zero-server architecture. If a change modifies any schema, interface, or workflow, update the corresponding documentation to maintain total synchronization.

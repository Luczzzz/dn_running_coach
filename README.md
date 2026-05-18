# DN Running Coach

Daniels-based private running coach designed to run behind OpenClaw on a NAS, with WeChat / QQ as the daily chat interface and COROS MCP as the running data source.

## Current Scope

- Product design for a Daniels training-system running assistant
- NAS deployment design for OpenClaw + WeChat / QQ
- MVP implementation plan for a local TypeScript service

## Documents

- `docs/superpowers/specs/2026-05-18-daniels-running-coach-design.md`
- `docs/superpowers/specs/2026-05-19-nas-openclaw-deployment-design.md`
- `docs/superpowers/plans/2026-05-19-running-coach-mvp-implementation.md`

## Intended Architecture

```text
WeChat / QQ
  -> OpenClaw on NAS
  -> Running Coach Agent
  -> Daniels Rules Engine
  -> Structured Memory Store
  -> COROS MCP
```

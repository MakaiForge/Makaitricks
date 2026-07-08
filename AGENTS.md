# AGENTS.md — Contexto do Projeto

## Project Structure
**Makaitricks** — Motor de instalação de componentes Windows para Wine/Proton
- Repo: https://github.com/MakaiForge/Makaitricks
- Local: `/home/cas/Documentos/Makai-forge/data/install-api/`

## What We've Done
1. cabextract estático 1.11 compilado e embutido
2. Knowledge base v2 com 514 verbs (categorias: vcpp, directx, dotnet, mfc, audio, fonts, graphics, physics, system, media, settings)
3. Python API: scanner, health, resolver, verifier (5 RPC endpoints)
4. Release v2025.1 criada com asset Makaitricks (850KB)
5. README.md multilíngue PT/ES/EN
6. 7z/7z adicionado (26.02, ~700KB)
7. Makaitricks-pkg.tar.gz (963KB) com 7z + cabextract + knowledge + Makaitricks

## Activity Logging System (09/07/2026)
- `tools/python-rpc/protonforge-api/api/audit.py` — audit logging NDJSON
- `tools/Mods_manager/play/activity-logger.ts` — logger estruturado (step/event/error)
- `tools/prefix/activity-logger.ts` — logger centralizado de prefixo
- Saídas: `protonforge-api/activity.log`, `play/activity.log`, `prefix/activity.log`

## CompactFlow Audit (09/07/2026)
- CompactFlow/ Node é o sistema oficial (47 arquivos, ~5000 linhas)
- `bridge/api.js` corrigido: paths + typo
- `compatflow/` Python removido (refatoração incompleta)
- Analyzer/database Python migrado para `protonforge-api/api/services/compatflow_analyzer/`
- `database.js` + `analyzer.js` raiz removidos (duplicatas de core/)
- `handlers/` TS removidos (código morto não compilado)
- 9/9 URLs do `deps-manager.js` verificadas (HTTP 200)

## Known Issues
- jet40 requer WINEARCH=win32 (não funciona em win64)
- Push requer repo limpo (node_modules/etc incham muito o histórico)
- npp (404), winrar (interativo), autohotkey (path mismatch)

## Config
- Token GitHub: configurado via AutoStartOpenCode.sh
- Remote: https://github.com/MakaiForge/Makaitricks.git

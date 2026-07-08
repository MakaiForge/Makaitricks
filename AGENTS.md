# AGENTS.md — Makai Forge / Makaitricks

## Project Structure
- **Makaitricks**: `/home/cas/Documentos/Makai-forge/data/install-api/Makaitricks` (20k+ linhas)
- **Knowledge Base**: `data/install-api/knowledge/index.json` (514 verbs)
- **Python API**: `data/install-api/api/api/services/prefix/{scanner,health,resolver,verifier}.py`
- **RPC Handler**: `data/install-api/api/api/handler.py` (5 endpoints)
- **Test Script**: `/home/cas/Documentos/Makai-forge/tools/test_verbs.sh`
- **Binaries**: `data/install-api/cabextract/cabextract` (estático), `data/install-api/7z/7z` (dinâmico)
- **README**: `data/install-api/README.md` (+ ES, EN)
- **GitHub**: `https://github.com/MakaiForge/Makaitricks.git`
- **AutoStart**: `/home/cas/Desktop/AutoStartOpenCode.sh`
- **Memory**: `~/.opencode/memoria.md`, `~/.opencode/erros.md`, `~/.opencode/regras.md`

## What We've Done
- Compiled static cabextract 1.11 (1.1MB, 0 deps)
- Created knowledge base v2 with 55 verbs (categories: vcpp, directx, dotnet, mfc, audio, system, fonts, graphics, physics)
- Created Python modules: scanner.py, health.py, resolver.py, verifier.py
- Created 5 RPC endpoints: prefix_scan, prefix_health, prefix_resolve, prefix_simulate, prefix_verify
- Created verbs: dotnet10, dotnetdesktop10
- Tested 55/55 verbs PASS
- Pushed to GitHub (branch main, force push)
- Created Release v2025.1 with Makaitricks asset
- Multilingual README (PT/ES/EN)

## Activity Logging System (v2025.2)
Sistema de audit logging estruturado (NDJSON) nos 3 apps principais:

### 1. protonforge-api (`tools/python-rpc/protonforge-api/`)
- `api/audit.py` — logger completo de RPC requests/responses/errors
- `server.py` — cada chamada RPC auditada com timestamp, params, resultado, status, duração (ms)
- Saída: `activity.log` na raiz da API

### 2. Mods_manager/play (`tools/Mods_manager/play/`)
- `activity-logger.ts` — logger estruturado substituindo `logger.ts`
- `play-game.ts` — cada step instrumentado com início/fim/duração/status
- `index.ts` — evento IPC `modPlayGame` auditado + event map documentado
- Saída: `activity.log` na pasta `play/`
- Event map completo documentado inline em `index.ts`

### 3. Prefix (`tools/prefix/`)
- `activity-logger.ts` — logger centralizado para operações de prefixo
- `core/init.ts` — `createPrefix` e `ensureGamePrefix` com audit logging de cada estratégia
- `core/dll-overrides.ts` — `applyWineDllOverrides` auditado
- `core/validate.ts` — `validatePrefix` e `ensurePrefixDir` auditados
- Todos os 6 eventos IPC instrumentados: clear/delete/ensure/run/select/setup
- Saída: `activity.log` na pasta `prefix/`

### Formato
NDJSON (JSON Lines), uma entrada por linha:
```json
{"type":"step","ts":"2026-07-09...","gameId":"skyrim","step":"proton","status":"done","duration_ms":1234}
{"type":"prefix_operation","ts":"...","operation":"createPrefix","status":"success","pfxDir":"...","method":"proton_run","duration_ms":5678}
{"type":"request","ts":"...","id":1,"method":"recommend_proton","params":{"game_id":"1245620"}}
```

## What We're Working On
- **Reforma GameConfigPanel** — substituir 6 botões inúteis por:
  - Detecção automática de jogo (Steam/GOG/Manual)
  - DLL overrides por jogo (baseado no Amethyst Mod Manager)
  - Health check + auto-fix do prefixo
  - Download de Script Extenders
  - API Proton contextual (Mod Manager ↔ Proton Tools)
- **game-dlls.json**: 20 jogos catalogados com DLL overrides, SE, frameworks
- **Fase 0.5 completa**: Serviço `game-dlls-service.ts` + IPC + preload + hook `useGameDllCatalog`

## Key Commands
```bash
# Build
npm run build

# Test verbs
bash /home/cas/Documentos/Makai-forge/tools/test_verbs.sh

# Referência: Amethyst Mod Manager
#   /home/cas/Desktop/Amethyst-Mod-Manager-1.3.12/
#   src/Games/ — handlers por jogo (27 jogos)
#   src/Utils/wine_dll_config.py — DLL overrides
#   src/Utils/deploy_wine_dll.py — escrita user.reg
#   src/Utils/protontricks.py — vcredist, d3dcompiler_47

# Push to GitHub repo
cd /tmp/makaitricks_clean && cp [files] . && git add -A && git commit -m "msg" && git push origin main
```

## Config
- **Branch**: `main` (local e remote sincronizados)
- **Git user**: `MakaiForge` / `lucasxaviergertkefrimeen@gmail.com`
- **Token**: _configurado no AutoStartOpenCode.sh_
- **Remote**: `https://MakaiForge:{token}@github.com/MakaiForge/Makaitricks.git`
- **Push via**: `git push origin main` (diretamente, .gitignore limpo)

## Known Issues
- `jet40` requires WINEARCH=win32
- 7z binary is dynamically linked (needs libstdc++)
- RPC bitTorrent: python_rpc/main.py restaurado do bbb (funciona em dev)
- GameConfigPanel: já reformado (Fases 0-5 concluídas)
- Dados de jogo (mods .esp, etc.) em `Data/` — gitignorado

## User Preferences
- Language: Portuguese (PT-BR)
- Keep responses short, direct
- Always explain before acting
- Don't use emojis unless asked
- Don't add code comments

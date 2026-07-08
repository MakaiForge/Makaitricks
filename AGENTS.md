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
- **Token**: _configurado no AutoStartOpenCode.sh_
- **Remote**: `https://MakaiForge:{token}@github.com/MakaiForge/Makaitricks.git`
- **Push via**: `/tmp/makaitricks_clean` (git init fresh, copy files, commit, push)

## Known Issues
- `jet40` requires WINEARCH=win32
- Git push may timeout (use increased timeout, 5min+)
- 7z binary is dynamically linked (needs libstdc++)
- RPC bitTorrent: python_rpc/main.py restaurado do bbb (funciona em dev)
- GameConfigPanel: 6 botões serão substituídos (DLLs + registry)

## User Preferences
- Language: Portuguese (PT-BR)
- Keep responses short, direct
- Always explain before acting
- Don't use emojis unless asked
- Don't add code comments

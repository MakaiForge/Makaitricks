# Mods Manager — Makai Forge

Toda a lógica de mods (instalação, deploy, jogos, UI) centralizada aqui.

## Estrutura

```
tools/Mods_manager/
├── events/         ← IPC handlers (conectam Electron ↔ módulos)
├── services/       ← Lógica de negócio (deploy, plugins, storage)
├── ui/             ← Componentes React (ModManager, hooks, modais, SCSS)
├── games/          ← Módulos de jogos (cada jogo decide seu próprio deploy)
│   ├── _shared/    ← Utils genéricos (archive, symlink, filemap)
│   ├── bethesda/   ← Base Bethesda (Data/ + plugins.txt)
│   │   └── games/  ← Skyrim, Fallout, Oblivion (cada um com seu .esp/.esm)
│   ├── generic/    ← Fallback (deploy na raiz, loose files)
│   └── registry.ts ← Roteia gameId → módulo
├── python/         ← Backend Python (bridge, Utils, masterlist)
└── types/          ← Interfaces compartilhadas
```

## Fluxo

```
Usuário clica "Instalar Mod"
  → events/mod-deploy.ts (IPC handler)
    → services/mod-deploy/ (deploy real)
      → games/registry.ts → games/bethesda/ ou games/generic/
        → games/_shared/ (archive, symlink)
```

## O que foi movido pra cá

### De `src/main/events/mods/` → `events/`

| Arquivo | Descrição |
|---------|-----------|
| `mod-deploy.ts` | Deploy, checkModExists, installModFromArchive, rescanStaging |
| `mod-media.ts` | listModFiles, listDataFolder, readModFile, checkModsMedia |
| `mod-fomod.ts` | parseFomod, installFomod |
| `mod-config.ts` | saveGameConfig, getGameConfig, removeMod, deleteMod |
| `mod-ini.ts` | listIniFiles |
| `mod-conflicts.ts` | detectConflicts |
| `mod-storage.ts` | modsStoreGet, modsStorePut |
| `mod-backup.ts` | listBackups, createBackup, restoreBackup, setBackupKept |
| `mod-load-order.ts` | modLoadOrderSort, modValidateLoadOrder |
| `mod-bridge.ts` | Conexão com Python (listGames, bsaExtract, bainInstall, etc.) |
| `mod-exe-launcher.ts` | scanExternalTools |
| `mod-eslifier.ts` | eslifyMod |
| `mod-proton/` | helpers, info, setup (Proton environment) |

### De `src/main/services/` → `services/`

| Arquivo | Descrição |
|---------|-----------|
| `mod-deploy/` | core (symlink deploy), archive (7z/zip), inventory (detectModType) |
| `mod-deploy-service.ts` | Barrel/wrapper (vai ser removido) |
| `mod-manager-service.ts` | read/write plugins.txt, FOMOD |
| `mod-storage-service.ts` | Key-value storage (JSON) |
| `mod-conflict-service.ts` | Detecção de conflitos entre mods |
| `plugin-sort-service.ts` | Ordenação de plugins |

### De `src/renderer/src/pages/mods/` → `ui/`

| Pasta | Descrição |
|-------|-----------|
| `ui/ModManager.tsx` | Componente principal do Mod Manager |
| `ui/hooks/` | useModManager, useDeploy, useFomod, useMods, useRightPanel, etc. |
| `ui/components/` | BainDialog, FomodDialog, Modals, TopBar, GameConfigPanel, etc. |
| `ui/types/` | mod.types.ts |
| `ui/_layout/` | Partials SCSS |

### De `src/python/protonforge-api/` → `python/`

| Pasta | Descrição |
|-------|-----------|
| `python/bridge/` | bridge.py, Utils/ (steam_finder, deploy, plugins, etc.) |
| `python/data/` | masterlist.json (4140 plugins LOOT) |
| `python/server.py` | API HTTP Python |

### `games/` — já existia, mantido

Módulos de jogo com interface padronizada `GameModule`.

## Path aliases

| Alias | Resolve para |
|-------|-------------|
| `@mods/*` | `tools/Mods_manager/*` |
| `@games/*` | `tools/Mods_manager/games/*` (deprecated, usar @mods/games/) |

## Adicionar um jogo novo

1. Criar `games/[id]/index.ts` implementando `GameModule`
2. Se for Bethesda, criar em `games/bethesda/games/[id]/`
3. Adicionar ao `games/registry.ts`
4. Build ✅

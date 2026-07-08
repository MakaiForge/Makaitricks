# Mods Manager — Estrutura Final

## O que está em tools/Mods_manager/

```
tools/Mods_manager/
├── README.md               # Documentação da arquitetura
├── SUMMARY.md              # Este arquivo
├── events/                 # IPC handlers (antes em src/main/events/mods/)
│   ├── mod-backup.ts
│   ├── mod-bridge.ts
│   ├── mod-config.ts
│   ├── mod-conflicts.ts
│   ├── mod-deploy.ts
│   ├── mod-eslifier.ts
│   ├── mod-exe-launcher.ts
│   ├── mod-fomod.ts
│   ├── mod-ini.ts
│   ├── mod-load-order.ts
│   ├── mod-media.ts
│   ├── mod-storage.ts
│   └── mod-proton/         # Submódulo (helpers, info, setup)
├── services/               # Services (antes em src/main/services/)
│   ├── mod-backup-service.ts
│   ├── mod-bridge-service.ts
│   ├── mod-bridge/         # Submódulo bridge
│   ├── mod-conflict-service.ts
│   ├── mod-deploy-service.ts
│   ├── mod-deploy/         # Submódulo (archive.ts, core.ts, inventory.ts, rules.ts)
│   ├── mod-manager-service.ts
│   ├── mod-storage-service.ts
│   ├── plugin-sort-service.ts
│   └── fomod/              # Submódulo (fomod-parser, fomod-service, fomod-types)
├── games/                  # Módulos de jogo (antes em src/main/games/)
│   ├── README.md
│   ├── _shared/            # filemap.ts, symlink.ts, archive.ts, types.ts
│   ├── bethesda/           # index.ts, plugins.ts + games/ sub-diretórios
│   │   └── games/
│   │       ├── skyrim/
│   │       ├── skyrim-se/
│   │       ├── fallout4/   # stub
│   │       ├── oblivion/   # stub
│   │       └── morrowind/  # stub
│   ├── generic/            # index.ts (deploy na raiz)
│   └── registry.ts
└── ui/                     # Renderer (antes em src/renderer/src/pages/mods/)
    ├── ModManager.tsx       # Entry point
    ├── ModManager.scss
    ├── _layout/             # SCSS partials (10 arquivos)
    ├── components/          # Componentes React
    │   ├── BainDialog/
    │   ├── FomodDialog/
    │   ├── GameConfigPanel/
    │   ├── Modals/          # 7+ modais
    │   ├── ModListPanel/
    │   ├── ModManagerTabs/
    │   ├── ModManagerTopBar/
    │   ├── ProtonConfigPanel/
    │   ├── RightPanel/      # + DataFolderTab, ModFilesTab, PluginListTab, IniEditorTab
    │   ├── proton-setup/    # RecommendationCard, ManualSelector, AlternativeList
    │   └── shared/          # StatusBar, FileTree
    ├── hooks/
    │   ├── index.ts         # Barrel export
    │   ├── config/          # useGameConfig, useRightPanel, useProtonConfig
    │   ├── deploy/          # useDeploy, useFomod
    │   ├── mods/            # useMods, usePlugins, useConflictBadges, useSortPlugins
    │   ├── ui/              # useProfiles, useModLog, useModManagerShortcuts, useSplitPane
    │   └── utils/           # useInstallMod, useMedia
    ├── types/               # mod.types.ts, fomod.types.ts, proton.types.ts, bridge.types.ts
    └── utils/               # bridge-helpers.ts, mod-helpers.ts
```

## Path Aliases

| Alias | Resolve para | Uso |
|-------|-------------|-----|
| `@mods/*` | `tools/Mods_manager/*` | Qualquer arquivo dentro do módulo |
| `@games/*` | `tools/Mods_manager/games/*` | Módulos de jogo específicos |
| `@main/services` | `src/main/services/index.ts` | Barrel (re-exporta @mods/services) |

## Migração concluída (Jul 2026)

### O que foi movido

| Origem | Destino | Arquivos |
|--------|---------|----------|
| `src/main/events/mods/` | `tools/Mods_manager/events/` | 13 + mod-proton/ |
| `src/main/services/mod-*.ts` | `tools/Mods_manager/services/` | 6 services |
| `src/main/services/mod-deploy/` | `tools/Mods_manager/services/mod-deploy/` | 4 arquivos |
| `src/main/services/mod-bridge/` | `tools/Mods_manager/services/mod-bridge/` | submódulo |
| `src/main/services/fomod/` | `tools/Mods_manager/services/fomod/` | 3 arquivos |
| `src/main/services/plugin-sort-service.ts` | `tools/Mods_manager/services/` | 1 arquivo |
| `src/main/games/` | `tools/Mods_manager/games/` | +20 arquivos |
| `src/renderer/src/pages/mods/` | `tools/Mods_manager/ui/` | ~80 arquivos |

### O que foi atualizado
- `src/main/events/index.ts` — imports agora `@mods/events/*`
- `src/renderer/src/main.tsx` — import `@mods/ui/ModManager`
- `src/main/services/index.ts` — re-exports de `@mods/services/*`
- `config/tsconfig.node.json` — alias `@mods/*` adicionado
- `config/tsconfig.web.json` — alias `@mods/*` + include `ui/**/*`
- `electron.vite.config.ts` — alias `@mods/*` no main + renderer

### Build
✅ 20.7s, zero erros, zero warnings

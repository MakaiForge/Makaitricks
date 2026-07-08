# tools/prefix — Plano de Ação

## Estrutura Final Planejada

```
tools/prefix/
├── index.ts              ← exporta TUDO
├── types.ts              ← PrefixOptions, PrefixResult, ScanFixResult, ValidationResult
│
├── core/
│   ├── steam-paths.ts    ← ✅ OK
│   ├── init.ts           ← ✅ OK
│   ├── clear.ts          ← ⏳ aceitar deleteGamePrefix
│   ├── validate.ts       ← ⏳ aceitar Wine.validatePrefix + Wine.getEffectivePrefixPath
│   └── dll-overrides.ts  ← ✅ OK
│
├── events/
│   ├── clear-steam-prefix.ts       ← ✅ OK
│   ├── delete-game-prefix.ts       ← ⏳ criar
│   ├── select-game-wine-prefix.ts   ← ⏳ criar
│   └── setup-proton.ts             ← ⏳ criar (mod-proton/setup.ts)
│
├── games/
│   └── _shared/
│       └── prefix.ts    ← ⏳ mover os 33 prefix.ts específicos
│
├── python/
│   ├── runner.py         ← ⏳ mesclar proton_recommended + protonforge-api
│   ├── core.py           ← ⏳ mesclar create_prefix()
│   ├── winetricks.py     ← ⏳ mesclar install_recommended_dlls()
│   └── steam-finder.py   ← ⏳ mesclar find_prefix(), run_proton_command()
│
└── MAP.md               ← este arquivo
```

---

## Regras para Mover

1. **Nunca duplicar lógica** — a implementação fica SÓ em `tools/prefix/`
2. **Original vira re-export ou side-effect import** — ex: `import "@prefix/events/clear-steam-prefix"`
3. **Alias `@prefix`** já configurado em `electron.vite.config.ts` + `tsconfig.node.json`
4. **Só mexe no que está listado abaixo** — um passo por vez

---

## Passo a Passo

### [1] Mover `deleteGamePrefix` + events

**Originais:**
- `src/main/services/delete-game.ts` — função `deleteGamePrefix()`
- `src/main/events/library/delete-game-prefix.ts` — IPC handler
- `src/main/events/library/delete-game-with-prefix.ts` — IPC handler

**Ação:**
1. Criar `tools/prefix/core/clear.ts`:
   - Adicionar `deleteGamePrefix(shop: string, objectId: string): Promise<boolean>`
   - Lógica: lê game do store → `fs.promises.rm(winePrefixPath)` → seta `winePrefixPath: null`
2. Criar `tools/prefix/events/delete-game-prefix.ts`:
   - `registerEvent("deleteGamePrefix", handler)` + `registerEvent("deleteGameWithPrefix", handler)`
3. Modificar originais:
   - `delete-game.ts` → `export { deleteGamePrefix } from "@prefix/core/clear"`
   - `delete-game-prefix.ts` → `import "@prefix/events/delete-game-prefix"`
   - `delete-game-with-prefix.ts` → `import "@prefix/events/delete-game-prefix"`

**Imports necessários:** `@main/services` (gamesStore), `fs`, `path`

---

### [2] Mover `selectGameWinePrefix` + `getDefaultWinePrefixSelectionPath`

**Originais:**
- `src/main/events/library/select-game-wine-prefix.ts`
- `src/main/events/library/get-default-wine-prefix-selection-path.ts`

**Ação:**
1. Criar `tools/prefix/core/validate.ts`:
   - Adicionar `validatePrefix(path)` se já não existir (já tem o esqueleto)
   - Mover lógica de validação + backup JSON
2. Criar `tools/prefix/events/select-game-wine-prefix.ts`:
   - `registerEvent("selectGameWinePrefix", handler)`
   - `registerEvent("getDefaultWinePrefixSelectionPath", handler)`
3. Modificar originais: virar re-export / side-effect import

**Imports necessários:** `@main/services` (gamesStore, dialog), `@prefix/core/validate`

---

### [3] Mover classe `Wine` (ForgePipeline)

**Original:**
- `data/install-api/ForgePipeline/services/wine.ts` — `Wine.getDefaultPrefixPath()`, `Wine.getEffectivePrefixPath()`, `Wine.validatePrefix()`

**Ação:**
1. Mover `getDefaultPrefixPath()`, `getDefaultPrefixPathForGame()`, `getEffectivePrefixPath()` → `tools/prefix/core/steam-paths.ts` (ou criar `core/paths.ts`)
2. Mover `validatePrefix()` → `tools/prefix/core/validate.ts`
3. Original `wine.ts` vira:
   ```typescript
   import { getDefaultPrefixPath, getEffectivePrefixPath, validatePrefix } from "@prefix";
   export const Wine = { getDefaultPrefixPath, getEffectivePrefixPath, validatePrefix, ... };
   ```

---

### [4] Mover `checkAndCreateWinePrefix` (launch-game.ts)

**Original:**
- `data/install-api/ForgePipeline/helpers/launch-game.ts` (linhas 144-279)
  - `checkAndCreateWinePrefix()` — spawna `proton createprefix` ou `wineboot -u`
  - `cleanupStaleCompatibilityProcesses()` — mata processos wine velhos

**Ação:**
1. Adicionar a `tools/prefix/core/init.ts`:
   - `checkAndCreateWinePrefix(winePrefixPath, protonPath?, gameId?): Promise<boolean>`
   - `cleanupStaleCompatibilityProcesses(compatDataPath): void`
2. Original `launch-game.ts` importa de `@prefix/core/init`

---

### [5] Mover `setupProtonEnvironment` (mod-proton/setup.ts)

**Original:**
- `tools/Mods_manager/events/mod-proton/setup.ts` — `setupProtonEnvironment` IPC handler

**Ação:**
1. Criar `tools/prefix/events/setup-proton.ts`:
   - `registerEvent("setupProtonEnvironment", handler)`
   - `registerEvent("getGameProtonInfo", handler)`
2. Lógica: find Steam app → locate compatdata → set Proton in config.vdf → init prefix via umu ou proton → install DLLs
3. Original `setup.ts` vira `import "@prefix/events/setup-proton"`

---

### [6] Mover `steam-scanner.ts` (detect compatdata/pfx)

**Original:**
- `src/main/services/steam-scanner.ts` (linhas 166-181) — seta `compatDataPath` + `hasPrefix` no scan

**Ação:**
1. Já parcialmente em `tools/prefix/core/steam-paths.ts` → `findCompatData()`
2. Se faltar lógica, adicionar lá
3. Original importa de `@prefix/core/steam-paths`

---

### [7] Mover game-specific DLL overrides (33 arquivos)

**Originais:**
- `tools/Mods_manager/games/*/prefix.ts` — cada jogo exporta `apply<Game>DllOverrides()` chamando `applyWineDllOverrides`

**Ação:**
1. Criar `tools/prefix/games/<gameId>/prefix.ts` para cada jogo
2. Ou simplificar: manter só em `tools/Mods_manager/games/*/prefix.ts` (já importam de `@prefix/core/dll-overrides`)
3. Decisão: manter onde estão e só apontar import — esses arquivos são 5-15 linhas cada, mudar agora é ruído

---

### [8] Unificar Python (3 implementações → 1)

**Originais:**
- `data/install-api/proton_recommended/python/Utils/prefix/{runner,manager,__init__}.py`
- `data/install-api/proton_recommended/python/api/services/prefix/{core,winetricks}.py`
- `tools/python-rpc/protonforge-api/api/services/prefix/{core,winetricks}.py`

**Ação:**
1. Criar `tools/prefix/python/` com:
   - `runner.py` — `run_wineboot()`, `run_winetricks()`, `clean_prefix()`, `run_proton_command()`
   - `core.py` — `create_prefix()` (merge das 3 implementações, melhor fallback chain)
   - `winetricks.py` — `install_recommended_dlls()`, Makaitricks wrapper
   - `steam-finder.py` — `find_prefix()`, `get_compat_tool_path()`, `find_steam_appid()`
2. Os 3 locais originais importam do novo caminho

---

## Checklist de Verificação

Após cada passo, rodar:
```bash
npm run typecheck:node 2>&1 | grep -E "error TS" | grep -v "TS6059" | grep -v "TS6307" | grep -v "Bootstrap"
npm run build            # verificar se compila sem erros
```

---

## Atalhos de Import (lembrete)

| De qualquer lugar do main process | Import |
|----------------------------------|--------|
| Scanner / finder | `@prefix/core/steam-paths` |
| Init prefix (proton) | `@prefix/core/init` |
| Init prefix (umu) | `@prefix/core/init` |
| Clear / delete | `@prefix/core/clear` |
| Validate / ensure | `@prefix/core/validate` |
| DLL overrides | `@prefix/core/dll-overrides` |
| Tipos | `@prefix/types` |
| TUDO | `@prefix` |

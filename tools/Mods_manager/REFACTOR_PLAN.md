# Mods_manager — Plano de Refatoração

## Visão Geral

Refatoração completa do Mods_manager para corrigir problemas de organização, duplicação e modularidade identificados na revisão de arquitetura (nota atual: 5.5/10).

---

## Fase 1: Consolidar FOMOD (CRIT-1)

**Objetivo:** Eliminar código duplicado de FOMOD entre `services/fomod/` e `games/skyrim/fomod/`.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| 🗑️ Deletar | `games/skyrim/fomod/fomod-parser.ts` |
| 🗑️ Deletar | `games/skyrim/fomod/fomod-service.ts` |
| 🗑️ Deletar | `games/skyrim/fomod/fomod-types.ts` |
| ✏️ Atualizar imports | `games/skyrim/installer/index.ts` → importar de `services/fomod/` |
| ✏️ Unificar tipos | `services/fomod/fomod-types.ts` ← adicionados campos `dependencies`, `visible`, `id` |

### Critérios de conclusão

- [x] Nenhum arquivo em `games/skyrim/fomod/`
- [x] Todos os imports apontam para `services/fomod/`
- [x] Tipo `FomodPlugin` tem todos os campos das duas cópias
- [x] Build sem erros de tipo

---

## Fase 2: Consolidar buildFilemap (CRIT-2)

**Objetivo:** Única fonte para construção de filemap.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Adicionar | `games/_shared/filemap.ts` → `buildPluginFilemap()`, `stripDataPrefix()`, `ROOT_PLUGIN_EXTS`, `SE_PATTERN_REGEXES` |
| ✏️ Atualizar | `services/mod-deploy/core.ts` → importar `buildPluginFilemap` + `stripDataPrefix` de `filemap.ts` |
| ✏️ Atualizar | `services/mod-deploy-service.ts` → import direto, removido shim deprecated |

### Critérios de conclusão

- [x] `buildFilemap` e `buildPluginFilemap` em `games/_shared/filemap.ts`
- [x] `core.ts` não tem implementação própria de walkDir/filemap (delega para `buildPluginFilemap`)
- [x] `mod-deploy-service.ts` não re-exporta nada deprecated

---

## Fase 3: Dividir deploy() god function (CRIT-3)

**Objetivo:** Dividir `services/mod-deploy/core.ts:deploy()` em funções menores.

**Status:** ✅ Concluído

### Funções extraídas

```
deploy() (orchestrator ~30 linhas)
  ├── forceCopyScriptExtenders() → ~30 linhas
  ├── scanExistingSymlinks()     → ~20 linhas
  ├── createSymlinks()           → ~20 linhas
  ├── writePluginsTxt()          → ~50 linhas
  └── rollbackDeploy()           → ~25 linhas
```

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Refatorar | `services/mod-deploy/core.ts` → funções extraídas, deploy() é só orquestração |

### Critérios de conclusão

- [x] Nenhuma função > 50 linhas
- [x] `deploy()` é só orquestração (chama outras funções)
- [x] Pre-existing bare `return` bug corrigido (agora retorna `DeploymentResult`)

---

## Fase 4: Centralizar SE_PATTERNS (CRIT-4)

**Objetivo:** Única definição de regex de script extenders.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Adicionar | `games/_shared/bethesda-constants.ts` → `SE_REGEXES` (derivado de `SE_PATTERNS`) |
| ✏️ Atualizar | `games/_shared/filemap.ts` → importar `SE_REGEXES` de `bethesda-constants` |
| ✏️ Atualizar | `services/mod-deploy/inventory.ts` → importar `SE_REGEXES` de `bethesda-constants` |

### Critérios de conclusão

- [x] `SE_REGEXES` definido em apenas 1 lugar (`bethesda-constants.ts`)
- [x] Todos os arquivos importam de `bethesda-constants.ts`

---

## Fase 5: Extrair walkDir (HIGH-1)

**Objetivo:** Única implementação de caminhada recursiva de diretórios.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Adicionar | `games/_shared/filemap.ts` → `walkDir()` + `walkDirWithDirs()` |
| ✏️ Atualizar | `games/_shared/filemap.ts` → `buildFilemap` e `buildPluginFilemap` usam walkDir |
| ✏️ Atualizar | `services/mod-deploy/inventory.ts` → usa `walkDirWithDirs` |
| ✏️ Atualizar | `events/mod-media.ts` → usa `walkDir` |

### Critérios de conclusão

- [x] `walkDir` e `walkDirWithDirs` em `games/_shared/filemap.ts`
- [x] Nenhum arquivo reimplementa walkDir recursivo

---

## Fase 6: Dividir scanfix-game.ts (HIGH-2)

**Objetivo:** Dividir god file em módulos focados.

**Status:** ✅ Concluído

### Módulos extraídos

```
scanfix-game.ts (247 linhas → ~100 linhas)
  ├── services/steam-library.ts     → defaultStagingDir, defaultPrefixDir, steamCompatDataPath, findSteamAppPath
  ├── services/prefix-validator.ts  → resolvePrefixDir, isValidPrefix, cleanNestedPfx, dllOverridesMatch
  ├── services/skse-downloader.ts   → downloadSkse, verifySkse, isSkseAvailable
  └── services/scanfix-game.ts      → scanFixGame (orchestrator)
```

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Criar | `services/steam-library.ts` |
| ✏️ Criar | `services/prefix-validator.ts` |
| ✏️ Criar | `services/skse-downloader.ts` |
| ✏️ Simplificar | `services/scanfix-game.ts` → importa dos módulos extraídos |
| ✏️ Atualizar | `events/mod-launch.ts` → importa `downloadSkse` de `skse-downloader` |

### Critérios de conclusão

- [x] Nenhum arquivo > 80 linhas
- [x] Cada módulo tem responsabilidade única
- [x] Import em mod-launch.ts atualizado

---

## Fase 7: Mover launch para service (HIGH-3)

**Objetivo:** Lógica de launch não pertence a event handler.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Criar | `services/launch-service.ts` → pipeline de launch (6 steps) |
| ✏️ Simplificar | `events/mod-launch.ts` → chama launch service (~45 linhas) |

### Critérios de conclusão

- [x] `events/mod-launch.ts` < 50 linhas
- [x] `services/launch-service.ts` tem a lógica

---

## Fase 8: Remover instalação legada (HIGH-4)

**Objetivo:** Um único sistema de instalação.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| 🗑️ Remover | `events/mod-deploy.ts` → handler `installModFromArchive` |
| 🗑️ Remover | `preload/index.ts` → bridge `installModFromArchive` |
| 🗑️ Remover | `declaration.d.ts` → tipo `installModFromArchive` |
| ✏️ Atualizar | `ui/hooks/mods/useInstallMod.ts` → usa `installModOrchestrated` |
| ✏️ Atualizar | `ui/hooks/mods/useMods.ts` → usa `installModOrchestrated` |

### Critérios de conclusão

- [x] `installModFromArchive` não existe mais
- [x] Só `installModOrchestrated` registrado
- [x] UI usa orquestrador para tudo

---

## Fase 9: Unificar ModlistEntry (HIGH-5)

**Objetivo:** Um único tipo para entries da modlist.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| ✏️ Atualizar | `ui/types/mod.types.ts` → re-exporta `ModlistEntry` de `@types` |

### Critérios de conclusão

- [x] `ModlistEntry` definido em apenas 1 lugar (`src/types/mods.types.ts`)
- [x] `ui/types/mod.types.ts` re-exporta de `@types`

---

## Fase 10: Limpar código morto (Médio)

**Objetivo:** Remover facade deprecated, typos, código não utilizado.

**Status:** ✅ Concluído

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| 🗑️ Deletar | `services/mod-deploy-service.ts` (facade deprecated) |
| ✏️ Atualizar | `events/mod-config.ts` → imports diretos (removido `ModDeployService`) |
| ✏️ Atualizar | `src/main/services/index.ts` → removido export de `mod-deploy-service` |
| ✏️ Corrigir | `services/mod-deploy/rules.ts` → `BETTHESDA` → `BETHESDA` |
| ✏️ Corrigir | `services/mod-storage-service.ts` → `hasOwnProperty` → `Object.hasOwn()` |

### Critérios de conclusão

- [x] `mod-deploy-service.ts` deletado
- [x] Typo `BETTHESDA` corrigido
- [x] `Object.hasOwn()` usado em vez de `hasOwnProperty`

---

## Resumo

| Fase | Prioridade | Status | Complexidade |
|------|------------|--------|--------------|
| 1. Consolidar FOMOD | CRITICO | ✅ | Baixa |
| 2. Consolidar buildFilemap | CRITICO | ✅ | Média |
| 3. Dividir deploy() | CRITICO | ✅ | Alta |
| 4. Centralizar SE_PATTERNS | CRITICO | ✅ | Baixa |
| 5. Extrair walkDir | ALTO | ✅ | Baixa |
| 6. Dividir scanfix-game | ALTO | ✅ | Média |
| 7. Mover launch | ALTO | ✅ | Média |
| 8. Remover instalação legada | ALTO | ✅ | Baixa |
| 9. Unificar ModlistEntry | ALTO | ✅ | Baixa |
| 10. Limpar código morto | MEDIO | ✅ | Baixa |

**Estimativa total:** ~40 arquivos modificados, ~10 arquivos deletados

**Ordem recomendada:** Fases 1→4 (críticos), depois 5→10 (altos/médios)

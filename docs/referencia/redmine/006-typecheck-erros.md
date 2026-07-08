# Redmine 006 — Correção de Erros do Typecheck

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Problema** | `npm run typecheck` exibia 129 erros (52 node + 77 web) |
| **Data** | 21/05/2026 |
| **Severidade** | 🔴 Alta (bloqueava typecheck, escondia problemas reais) |

## 🔍 Diagnóstico

### typecheck:node — 52 erros

| Categoria | Quantidade | Descrição |
|-----------|-----------|-----------|
| TS6133 | 27 | Variáveis/imports declarados mas nunca lidos |
| TS18047/TS2531 | 18 | Objeto possivelmente `null` sem verificação |
| TS2322/TS2345/TS2353 | 6 | Erros de tipo (atribuição, argumento, objeto literal) |
| TS2304 | 1 | Variável `artifactResponse` não encontrada |

### typecheck:web — 77 erros

| Categoria | Quantidade | Descrição |
|-----------|-----------|-----------|
| TS2339 | 24 | `forgerApi` não existe no tipo `Electron` |
| TS2353 | 10 | `needsAuth`/`needsSubscription` não existe no type |
| TS2551 | 6 | Método renomeado (ProtonForge → ProtonForge) |
| TS2345/TS2554 | 6 | Erros de argumento/chamada de função |
| TS2352 | 5 | Cast inválido entre tipos que não se sobrepõem |
| TS6133 | 2 | Variável/parâmetro não usado |
| TS7030 | 1 | Caminho sem retorno em useEffect |
| TS2339 (boolean) | 6 | Acesso a propriedade em tipo `boolean` |
| Outros | 17 | Diversos (tipo genérico, etc.) |

## 🔧 Correções aplicadas

### typecheck:node — Arquivos modificados (12)

| Arquivo | O que foi feito |
|---------|----------------|
| `src/main/events/catalogue/get-game-stats.ts` | Removeu interface `GameStatsResult` não utilizada |
| `src/main/events/cloud-save/download-game-artifact.ts` | Removeu imports não utilizados (`Wine`, `tar`, `axios`, `backupsPath`, `normalizePath`, `SystemPath`, `CloudSync`, `YAML`, `LudusaviBackupMapping`); removeu função `restoreLudusaviBackup` não chamada; prefixou `_gameArtifactId` |
| `src/main/events/download-sources/add-download-source.ts` | Adicionou `registerEvent` faltante; corrigiu `status` para `DownloadSourceStatus.Matched`; removeu `isRemote: false` (tipo só aceita `true`) |
| `src/main/events/library/install-game-folder.ts` | Removeu `wait: true` (não existe no tipo options) |
| `src/main/events/library/open-game-installer.ts` | Prefixou `_shop` como não utilizado |
| `src/main/events/profile/update-profile.ts` | Removeu `fs` não utilizado |
| `src/main/events/proton/install-game-with-proton.ts` | Removeu `Umu`, `findInstalledProton`, `ProtonVersion`; prefixou `_speed`; corrigiu tipo do parâmetro `releases` para `ProtonRelease[]` |
| `src/main/services/cloud-sync.ts` | Removeu `os`, `axios`; readicionou `normalizePath`; removeu dead code pós-`return`; removeu `_stat` |
| `src/main/services/decky-plugin.ts` | Adicionou null guard `if (!releaseInfo) return/throw`; adicionou null guard `if (!zipPath) throw` |
| `src/main/services/download-sources-checker.ts` | Removeu imports não utilizados |
| `src/main/services/library-sync/update-game-playtime.ts` | Prefixou parâmetros com `_` |
| `src/main/services/ws/ws-client.ts` | Substituiu `return` por inicialização do WebSocket |

### typecheck:web — Arquivos modificados (3)

| Arquivo | O que foi feito |
|---------|----------------|
| `src/renderer/src/declaration.d.ts` | Adicionou **25+ declarações de métodos faltantes** (`forgerApi`, `onProtonDownloadProgress`, `onInstallLog`, `getLocalResource`, `updateGameConfig`, `openGameWinePrefix`, `runWineTool`, `deleteGameCompletely`, `deleteGameWithPrefix`, `openExeFilePicker`, `setGameExecutablePath`, `recommendProton`, `downloadProtonByFork`, `getProtonTools`, `getProtonReleases`, `downloadProtonTool`, `getInstalledProtonTools`, `removeProtonTool`, `getUserHomePath`, `installForgerDeckyPlugin`, `getForgerDeckyPluginInfo`); corrigiu assinatura de `onInstallProgress`; corrigiu assinatura de `openGameInstaller` |
| `src/renderer/src/pages/downloads/downloads.tsx` | Corrigiu `useEffect` sem return; `openExeFilePicker` tipo de retorno |
| `src/renderer/src/pages/downloads/components/proton-recommendation-modal.tsx` | Prefixou `_installedProtons`; adicionou null check em `result` |

### Arquivo não-declaração mas corrigido

| Arquivo | O que foi feito |
|---------|----------------|
| `src/preload/index.ts` | Adicionou parâmetro `protonPath` em `openGameInstaller` (faltava dos 3 args que a renderer já enviava) |

## ✅ Resultado Final

| Comando | Antes | Depois |
|---------|-------|--------|
| `npm run typecheck:node` | 52 erros ❌ | **0 erros** ✅ |
| `npm run typecheck:web` | 77 erros ❌ | **0 erros** ✅ |
| `npm run build` | ✅ (inalterado) | ✅ |

## 🔗 Arquivos relacionados

- `MODULARIZATION_PLAN.md` — Apêndice de correções
- `docs/redmine/005-typecheck-fix.md` — Correção do MODULE_NOT_FOUND
- `src/renderer/src/declaration.d.ts` — Principal arquivo de tipos corrigido

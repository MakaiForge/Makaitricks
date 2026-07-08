# Desbostificação do Armazenamento — Plano Completo de Migração

## Objetivo
Remover **todo vestígio** do banco antigo (classic-level) do código, substituindo por **JSON direto** e **SQLite**.

---

## ✅ Progresso (Atualizado em 05/06/2026)

### ✅ Fase 0 — Correções de bugs
- [x] Bug 1: `getGameShopDetails` — try/catch no cache lookup
- [x] Bug 2: `getGameAssets` — try/catch no cache lookup
- [x] Bug 3: `store-handlers` — mapeamento downloadSources → sourcesDb
- [x] Bug 4: `getGameByObjectId` IPC — não lançar erro para games fora da biblioteca

### ✅ Fase 1 — Compatflow bridge (ClassicLevel → JSON direto)
- [x] `add-to-library.js` — substituir `ClassicLevel` por `fs.readFileSync`/`writeFileSync`
- [x] Path atualizado de `stores/games.json`
- [x] Path atualizado de `stores/shop.json`

### ✅ Fase 2 — Paths atualizados para `"stores"`
- [x] `databases/app.ts`
- [x] `databases/ui.ts`
- [x] `databases/api.ts`
- [x] `databases/downloads.ts`
- [x] `databases/shop.ts`
- [x] `databases/sources.ts`
- [x] `databases/stats.ts`

### ✅ Fase 3 — `*Sublevel` → `*Store`
- [x] 8 sublevels renomeados + ~130 arquivos de import atualizados

### ✅ Fase 4 — `levelKeys` → `storeKeys`
- [x] `keys.ts` + ~101 arquivos de import atualizados

### ✅ Fase 5 — IPC handlers
- [x] `store-handlers.ts`
- [x] Canais: `storeGet`, `storePut`, etc.

### ✅ Fase 6 — Preload
- [x] `src/preload/index.ts` — namespace `store`
- [x] `src/preload/app.ts` — namespace `store`

### ✅ Fase 7 — Renderer
- [x] `store.service.ts`
- [x] `StoreService` / `storeService`
- [x] 16 arquivos de import atualizados
- [x] `declaration.d.ts` — interface atualizada

### ✅ Fase 9 — Limpeza final
- [x] `classic-level` removido de `package.json`
- [x] `store.types.ts`
- [x] Imports em `types/index.ts` e `download.types.ts` atualizados
- [x] Comentários antigos removidos
- [x] `grep` por referências antigas em `src/` — zero matches
- [x] `npm run typecheck:node` — sem novos erros
- [x] `npm run typecheck:web` — sem erros

### ✅ Fase 8 — Migrar JSON → SQLite (concluído)
- [x] `SqliteStore` criado em `src/main/services/sqlite-store.ts` — API compatível com JsonLevel
- [x] Schema SQLite: 10 tabelas (settings, games, downloads, shop_assets, shop_cache, stats_cache, download_sources, themes, local_notifications)
- [x] `migrateJsonToSqlite()` — migra dados de `stores/*.json` para SQLite na primeira inicialização
- [x] 7 databases substituídos de `JsonLevel` para `SqliteStore`
- [x] `gamesShopCacheStore` → tabela `shop_cache` (separada de `shop_assets`)
- [x] `localNotificationsStore` → tabela `local_notifications` (separada de `themes`)
- [x] `batch()`, `values()`, `iterator()`, `keys()` com suporte a `.all()` e async iteration
- [x] `typecheck:node` e `typecheck:web` — sem novos erros (apenas erros pré-existentes)

---

## 1. Arquitetura Final

### 8 stores (alias para os databases)
| Store | Database real | JSON real | Dados |
|-------|--------------|-----------|-------|
| `gamesStore` | gamesDb | `stores/games.json` | Objetos `Game` keyed por `{shop}:{objectId}` |
| `downloadsStore` | downloadsDb | `stores/downloads.json` | Objetos `Download` keyed por `{shop}:{objectId}` |
| `gamesShopAssetsStore` | shopDb | `stores/shop.json` | Objetos `ShopAssets` keyed por `{shop}:{objectId}` |
| `gamesShopCacheStore` | shopDb | `stores/shop.json` | Objetos `ShopDetails` keyed por `{shop}:{objectId}:{language}` |
| `gamesStatsCacheStore` | statsDb | `stores/stats.json` | Objetos `GameStatsCached` keyed por `{shop}:{objectId}` |
| `themesStore` | uiDb | `stores/ui.json` | Objetos `Theme` |
| `localNotificationsStore` | uiDb | `stores/ui.json` | Objetos `LocalNotification` |
| `downloadSourcesStore` | sourcesDb | `stores/sources.json` | Objetos `DownloadSource` |

### Keys definidas em `sublevels/keys.ts`
```typescript
export const levelKeys = {
  // Constantes simples
  games: "games",                        // NUNCA USADO
  user: "user",                          // USADO em appDb
  auth: "auth",                          // USADO em appDb
  themes: "themes",                      // NUNCA USADO
  gameShopAssets: "gameShopAssets",      // NUNCA USADO
  gameStatsCache: "gameStatsAssets",     // NUNCA USADO
  gameShopCache: "gameShopCache",        // NUNCA USADO
  downloads: "downloads",                // NUNCA USADO
  userPreferences: "userPreferences",    // USADO em appDb
  language: "language",                  // USADO em appDb
  screenState: "screenState",            // USADO em appDb
  rpcPassword: "rpcPassword",            // NUNCA USADO
  downloadSources: "downloadSources",    // NUNCA USADO
  downloadSourcesCheckBaseline: "downloadSourcesCheckBaseline", // USADO em appDb
  downloadSourcesSinceValue: "downloadSourcesSinceValue",       // USADO em appDb
  localNotifications: "localNotifications", // NUNCA USADO
  commonRedistPassed: "commonRedistPassed", // NUNCA USADO
  backupAuth: "backupAuth",              // USADO em appDb

  // Funções geradoras de chave
  game: (shop, objectId) => `${shop}:${objectId}`,           // USADO em 4 DBs
  gameShopCacheItem: (shop, objectId, language) => `${shop}:${objectId}:${language}`, // USADO em shopDb
};
```

---

## 2. Tudo que foi migrado

### 2.1 Compatflow bridge
**`src/compatflow/bridge/add-to-library.js`**
- Substituído: `ClassicLevel` → `fs.readFileSync`/`writeFileSync`
- Paths: `stores/games.json` e `stores/shop.json`

### 2.2 Scripts
- `scripts/migrate-mods-store.js` — migração única (agora comentário)
- `scripts/helpers/populate-download-games.cjs` — seed
- `scripts/populate-download-games.cjs` — seed

### 2.3 Paths (7 arquivos)
- `src/main/store/databases/app.ts` → `path.join(..., "stores", "app")`
- `src/main/store/databases/ui.ts` → `path.join(..., "stores", "ui")`
- `src/main/store/databases/api.ts` → `path.join(..., "stores", "games")`
- `src/main/store/databases/downloads.ts` → `path.join(..., "stores", "downloads")`
- `src/main/store/databases/shop.ts` → `path.join(..., "stores", "shop")`
- `src/main/store/databases/sources.ts` → `path.join(..., "stores", "sources")`
- `src/main/store/databases/stats.ts` → `path.join(..., "stores", "stats")`

### 2.4 IPC handlers: `store-handlers.ts`
**Arquivo:** `src/main/events/store-handlers.ts`
**Canais registrados:**
| Canal IPC | Operação | Store usada |
|-----------|----------|-------------|
| `storeGet` | get | appDb |
| `storePut` | put | appDb |
| `storeDel` | del | appDb |
| `storeClear` | clear | appDb |
| `storeValues` | values | appDb |
| `storeIterator` | iterator | appDb |

**Importado em:** `src/main/events/index.ts`

### 2.5 Preload — `window.electron.store`

**`src/preload/index.ts`**
```typescript
store: {
  get:    (key, sublevelName, valueEncoding) => ipcRenderer.invoke("storeGet", ...),
  put:    (key, value, sublevelName, valueEncoding) => ipcRenderer.invoke("storePut", ...),
  del:    (key, sublevelName) => ipcRenderer.invoke("storeDel", ...),
  clear:  (sublevelName) => ipcRenderer.invoke("storeClear", ...),
  values: (sublevelName) => ipcRenderer.invoke("storeValues", ...),
  iterator: (sublevelName) => ipcRenderer.invoke("storeIterator", ...),
}
```

**`src/preload/app.ts`** — mesmo conteúdo

### 2.6 Renderer — `store.service.ts`

**Arquivo:** `src/renderer/src/services/store.service.ts`
**Export:** `storeService`

**16 arquivos que importam `storeService`:**
| Arquivo | Sublevel usado | Operações |
|---------|---------------|-----------|
| `src/renderer/src/main.tsx` | null (root) | get("userPreferences") |
| `src/renderer/src/app.tsx` | null, "themes" | get, values |
| `src/renderer/src/context/settings/settings.context.tsx` | null | get |
| `src/renderer/src/context/game-details/game-details.context.tsx` | "downloadSources" | values |
| `src/renderer/src/hooks/use-catalogue.ts` | "downloadSources" | values |
| `src/renderer/src/hooks/use-search-history.ts` | null | get, put, del |
| `src/renderer/src/pages/game-details/modals/game-options-modal.tsx` | "games" | get, put |
| `src/renderer/src/pages/game-details/modals/repacks-modal.tsx` | "downloadSources", "games" | values, get, put |
| `src/renderer/src/pages/settings/appearance/settings-appearance.tsx` | "themes" | values |
| `src/renderer/src/pages/settings/appearance/modals/add-theme-modal.tsx` | "themes" | put |
| `src/renderer/src/pages/settings/appearance/modals/delete-theme-modal.tsx` | "themes" | del |
| `src/renderer/src/pages/settings/appearance/modals/import-theme-modal.tsx` | "themes" | put, get, values |
| `src/renderer/src/pages/settings/appearance/modals/delete-all-themes-modal.tsx` | "themes" | values, clear |
| `src/renderer/src/pages/settings/appearance/components/theme-card.tsx` | "themes" | get, values |
| `src/renderer/src/pages/settings/settings-download-sources.tsx` | "downloadSources" | values (pesado) |
| `src/renderer/src/pages/theme-editor/theme-editor.tsx` | "themes" | get |

### 2.7 IPC events que usam stores (~112 handlers)
Ver seção 3 para o mapa completo.

### 2.8 `levelKeys` em ~100 arquivos
A constante é importada de `@main/store` e usada como chave de lookup.

### 2.9 Nomes `*Sublevel` em ~130 arquivos
`gamesSublevel`, `downloadsSublevel`, `gamesShopAssetsSublevel`, etc.

### 2.10 `level.types.ts`
- `src/types/level.types.ts` — contém interfaces `Game`, `Download`, `Auth`, `UserPreferences`, `ScreenState`, `Subscription`
- `src/types/index.ts:3` importa de `./level.types`
- `src/types/index.ts:495` re-exporta

### 2.11 `package.json`
- `"classic-level": "^2.0.0"` ainda listado (linha 66)

---

## 3. Mapa Completo: IPC Events → Stores Usados

### CORE APP — appDb (stores/app.json)
| IPC Channel | Chave | Operação |
|-------------|-------|----------|
| `getSessionHash` | `"auth"` | get |
| `getAuth` | `"auth"` | get |
| `getUserPreferences` | `"userPreferences"` | get |
| `updateUserPreferences` | `"userPreferences"` | get + put |
| `openCheckout` | `"user"` | get |
| `getGamePrices` | `"userPreferences"` | get |
| `getGameLaunchProtonVersion` | `"userPreferences"` | get |
| `backupGetStatus` | `"backupAuth"` | get |
| `backupOAuthLogin` | `"backupAuth"` | put |
| `backupOAuthLogout` | `"backupAuth"` | del |
| `backupStart` | `"backupAuth"` + `"auth"` | get + put |
| `backupRestore` | `"backupAuth"` + `"auth"` | get + put |
| `backupListFiles` | `"backupAuth"` + `"auth"` | get + put |
| `getSteamGameConfig` | `"steam_config:{appId}"` | get |
| `setSteamGameConfig` | `"steam_config:{appId}"` | put |
| `publishNewRepacksNotification` | `"downloadSourcesSinceValue"` | get |
| `signOut` | `"auth"`, `"user"`, `"backupAuth"` | batch(del) |
| `getDownloadSourcesCheckBaseline` | `"downloadSourcesCheckBaseline"` | get |
| `getDownloadSourcesSinceValue` | `"downloadSourcesSinceValue"` | get |
| Store generic CRUD | todas | get/put/del/clear/values/iterator |

### GAMES — gamesDb (stores/games.json)
| IPC Channel | Chave | Operação |
|-------------|-------|----------|
| `getGameByObjectId` | `game(shop, objectId)` | get |
| `getLibrary` | todas (iterator) | iterator + get |
| `addGameToLibrary` | `game(shop, objectId)` | get + put |
| `addCustomGameToLibrary` | todas (iterator) | iterator + put |
| `removeGameFromLibrary` | `game(shop, objectId)` | get + put (isDeleted) |
| `removeGame` | — | del |
| `deleteGameFolder` | `game(shop, objectId)` | get + put |
| `deleteGamePrefix` | `game(shop, objectId)` | get + put |
| `deleteGameCompletely` | `game(shop, objectId)` | get + del |
| `deleteGameWithPrefix` | `game(shop, objectId)` | get + del |
| `updateGameConfig` | `game(shop, objectId)` | get + put |
| `updateLaunchOptions` | `game(shop, objectId)` | get + put |
| `updateExecutablePath` | `game(shop, objectId)` | get + put |
| `updateCustomGame` | `game(shop, objectId)` | get + put |
| `updateGameCustomAssets` | `game(shop, objectId)` | get + put |
| `selectGameWinePrefix` | `game(shop, objectId)` | get + put |
| `selectGameProtonPath` | `game(shop, objectId)` | get + put |
| `selectExecutable` | `game(shop, objectId)` | get + put |
| `confirmExecutableSelection` | `game(shop, objectId)` | get + put |
| `getPendingExecutableSelection` | `game(shop, objectId)` | get |
| `setGameExecutablePath` | `game(shop, objectId)` | get + put |
| `saveInstalledGameExecutable` | `game(shop, objectId)` | get + put |
| `createSteamShortcut` | `game(shop, objectId)` | get + put |
| `deleteSteamShortcut` | `game(shop, objectId)` | get + put |
| `checkSteamShortcut` | `game(shop, objectId)` | get + put |
| `createGameShortcut` | `game(shop, objectId)` | get |
| `toggleGamePin` | `game(shop, objectId)` | get + put |
| `toggleGameMangohud` | `game(shop, objectId)` | get + put |
| `toggleGameGamemode` | `game(shop, objectId)` | get + put |
| `toggleAutomaticCloudSync` | `game(shop, objectId)` | get + put |
| `addGameToFavorites` | `game(shop, objectId)` | get + put |
| `removeGameFromFavorites` | `game(shop, objectId)` | get + put |
| `assignGameToCollection` | `game(shop, objectId)` | get + put |
| `clearNewDownloadOptions` | `game(shop, objectId)` | get + put |
| `changeGamePlayTime` | `game(shop, objectId)` | get + put |
| `repairGame` | `game(shop, objectId)` | get + put |
| `openGame` | `game(shop, objectId)` | get |
| `closeGame` | `game(shop, objectId)` | get |
| `openGameWinePrefix` | `game(shop, objectId)` | get |
| `openGameWinetricks` | `game(shop, objectId)` | get |
| `openGameExecutablePath` | `game(shop, objectId)` | get |
| `checkGameDlls` | `game(shop, objectId)` | get |
| `getGameLaunchProtonVersion` | `game(shop, objectId)` | get |
| `scanInstalledGames` | todas (iterator) | iterator + put |
| `installGameFolder` | `game(shop, objectId)` | get |
| `startGameDownload` | `game(shop, objectId)` | get + put |
| `addGameToQueue` | `game(shop, objectId)` | get + put |
| `extractGameDownload` | `game(shop, objectId)` | get + put |
| `openGameInstaller` | `game(shop, objectId)` | get + put |
| `cleanupUnusedAssets` | todas (iterator) | iterator |
| `transferGameFiles` | `game(shop, objectId)` | get + put |
| `downloadGameArtifact` | `game(shop, objectId)` | get |
| `getGameBackupPreview` | `game(shop, objectId)` | get |
| `verifyExecutablePathInUse` | todas (values) | values |
| `syncSteamLibrary` | `game(shop, objectId)` | get + put |

### DOWNLOADS — downloadsDb (stores/downloads.json)
| IPC Channel | Chave | Operação |
|-------------|-------|----------|
| `getGameByObjectId` | `game(shop, objectId)` | get |
| `getLibrary` | todas (iterator) | iterator + get |
| `pauseGameDownload` | `game(shop, objectId)` | get + put |
| `resumeGameDownload` | `game(shop, objectId)` | get + put |
| `cancelGameDownload` | `game(shop, objectId)` | get + put |
| `addGameToQueue` | `game(shop, objectId)` | get + put |
| `updateDownloadQueuePosition` | todas (values) + `game(shop, objectId)` | values + get + put |
| `startGameDownload` | todas (iterator) | iterator + get + put |
| `pauseGameSeed` | `game(shop, objectId)` | get + put |
| `resumeGameSeed` | `game(shop, objectId)` | get + put |
| `removeGame` | `game(shop, objectId)` | del |
| `deleteGameFolder` | `game(shop, objectId)` | get + del |
| `signOut` | todas | clear |
| `transferGameFiles` | `game(shop, objectId)` | get + put |
| `openGameInstaller` | `game(shop, objectId)` | get |
| `openGameInstallerPath` | `game(shop, objectId)` | get |
| `installGameFolder` | `game(shop, objectId)` | get |
| `getGameInstallerActionType` | `game(shop, objectId)` | get |
| `deleteArchive` | `game(shop, objectId)` | get + put + del |
| `extractGameDownload` | `game(shop, objectId)` | get + put |

### SHOP — shopDb (stores/shop.json)
| IPC Channel | Chave | Operação |
|-------------|-------|----------|
| `getGameShopDetails` | `gameShopCacheItem(shop, objectId, language)` + `game(shop, objectId)` | get + put |
| `getGameAssets` | `game(shop, objectId)` | get + put |
| `addGameToLibrary` | `game(shop, objectId)` | get + del |
| `addCustomGameToLibrary` | `game(shop, objectId)` | put |
| `removeGameFromLibrary` | `game(shop, objectId)` | get + put |
| `updateGameCustomAssets` | `game(shop, objectId)` | get + put |
| `updateCustomGame` | `game(shop, objectId)` | get + put |
| `getLibrary` | todas (iterator) | iterator |

### SOURCES — sourcesDb (stores/sources.json)
| IPC Channel | Chave | Operação |
|-------------|-------|----------|
| `getDownloadSources` | todas (values) | values |
| `syncDownloadSources` | — | put (batch) |
| `addDownloadSource` | UUID | values + put |
| `removeDownloadSource` | — | clear + del |
| `storeValues("downloadSources")` | todas (values) | values |

### STATS — statsDb (stores/stats.json)
| IPC Channel | Chave | Operação |
|-------------|-------|----------|
| `getGameStats` | `game(shop, objectId)` | get |

### UI — uiDb (stores/ui.json)
| IPC Channel | Chave / Subnível | Operação |
|-------------|-----------------|----------|
| `getAllCustomThemes` | themeId (values) | values |
| `getCustomThemeById` | themeId | get |
| `getActiveCustomTheme` | themeId (values) | values |
| `addCustomTheme` | themeId | put |
| `updateCustomTheme` | themeId | get + put |
| `deleteCustomTheme` | themeId | del |
| `deleteAllCustomThemes` | todas | clear |
| `toggleCustomTheme` | themeId | get + put |
| `getThemeSoundPath` | themeId | get |
| `getThemeSoundDataUrl` | themeId | get |
| `importThemeSoundFromStore` | themeId | get + put |
| `storeValues("themes")` | todas (values) | values |
| `storeGet/put/del("themes")` | themeId | get/put/del |
| `storeClear("themes")` | todas | clear |

---

## 4. Plano de Migração Detalhado

### Fase 0: Correções de bugs (JÁ FEITO)
- [x] Bug 1: `getGameShopDetails` — try/catch no cache lookup
- [x] Bug 2: `getGameAssets` — try/catch no cache lookup
- [x] Bug 3: `store-handlers` — mapeamento downloadSources → sourcesDb


### Fase 1: Substituir ClassicLevel no compatflow bridge
**Arquivo:** `src/compatflow/bridge/add-to-library.js`
**Problema:** Usa `require('classic-level')` com `new ClassicLevel(...)`
**Solução:** Substituir por leitura/escrita direta em JSON (fs.readFileSync/writeFileSync)
- O bridge já tem acesso ao `catalogo.db` via SQLite
- Pode ler metadados do jogo do SQLite
- Assets (shop DB): ler do SQLite ou de JSON
- **Risco:** Caminho hardcoded antigo

### Fase 2: Renomear módulo `store/` (cosmético + paths)
- [x] Paths em `databases/` atualizados para `"stores"`

### Fase 3: Renomear `*Sublevel` → `*Store`
- [ ] `gamesSublevel` → `gamesStore` em `sublevels/games.ts`
- [ ] `downloadsSublevel` → `downloadsStore` em `sublevels/downloads.ts`
- [ ] `gamesShopAssetsSublevel` → `gamesShopAssetsStore` em `sublevels/game-shop-assets.ts`
- [ ] `gamesShopCacheSublevel` → `gamesShopCacheStore` em `sublevels/game-shop-cache.ts`
- [ ] `gamesStatsCacheSublevel` → `gamesStatsCacheStore` em `sublevels/game-stats-cache.ts`
- [ ] `themesSublevel` → `themesStore` em `sublevels/themes.ts`
- [ ] `localNotificationsSublevel` → `localNotificationsStore` em `sublevels/local-notifications.ts`
- [ ] `downloadSourcesSublevel` → `downloadSourcesStore` em `sublevels/download-sources.ts`
- [ ] Atualizar **todos os imports** nos ~130 arquivos do main process

### Fase 4: Renomear `levelKeys` → `storeKeys`
- [ ] Em `sublevels/keys.ts`
- [ ] Em todos os ~100 arquivos que importam

### Fase 5: IPC handlers
- [x] `store-handlers.ts` com canais: `storeGet`, `storePut`, `storeDel`, `storeClear`, `storeValues`, `storeIterator`
- [ ] Atualizar import em `src/main/events/index.ts`

### Fase 6: Preload
- [x] `src/preload/index.ts` e `app.ts`: namespace `store` com canais atualizados

### Fase 7: Renderer
- [x] `store.service.ts` com `StoreService` / `storeService`
- [x] 16 arquivos de import atualizados
- [x] `declaration.d.ts` — interface `store`

### Fase 8: Migrar dados para SQLite (opcional mas recomendado)
Para cada store, decidir: manter como JSON ou migrar para SQLite.

**Recomendação:**
| Store | Formato alvo | Motivo |
|-------|-------------|--------|
| app (auth, prefs, etc.) | JSON (`stores/app.json`) | Dados simples, acesso frequente |
| gamesDb (biblioteca) | SQLite (`library.db`) | Relacional, já tem catalogo.db como referência |
| downloadsDb | SQLite (`library.db`) | Mesma tabela de games |
| shopDb (cache) | SQLite (`cache.db`) | Cache expirável, fácil de limpar |
| sourcesDb | SQLite (`catalogo.db`) | Poucos registros |
| statsDb | SQLite (`cache.db`) | Cache expirável |
| uiDb (themes) | JSON (`stores/ui.json`) | Objetos complexos, baixa frequência |

### Fase 9: Limpeza final
- [ ] Remover `classic-level` de `package.json`
- [ ] Rodar `npm uninstall classic-level`
- [ ] Remover `src/types/level.types.ts` (fundir conteúdo em `store.types.ts` ou `game.types.ts`)
- [ ] Atualizar `src/types/index.ts` (remover import de level.types)
- [ ] Remover `src/main/services/json-level.ts` (se tudo migrou para SQLite)
- [x] `grep` por referências antigas em `src/` — zero matches
- [ ] Rodar `npm run typecheck:node && npm run typecheck:web`

---

## 5. Resumo do Impacto

| O quê | Quantos arquivos |
|-------|-----------------|
| Databases (paths para stores) | 7 arquivos |
| Sublevel renaming (*Sublevel → *Store) | 8 arquivos + ~130 imports |
| levelKeys → storeKeys | 1 arquivo + ~100 imports |
| IPC handlers (store-handlers) | 1 arquivo + canais |
| Preload (store) | 2 arquivos |
| Renderer service (store.service) | 1 arquivo + 16 imports + declaration.d.ts |
| Compatflow bridge (ClassicLevel → JSON direto) | 1 arquivo |
| Types (level.types → store.types) | 2 arquivos |
| package.json (remover classic-level) | 1 linha |
| **Total estimado** | **~160+ arquivos** |

---

## 6. Status da Execução

```
Fase 0: ✅ Corrigir bugs
Fase 1: ✅ Migrar compatflow bridge (ClassicLevel → JSON direto)
Fase 2: ✅ Atualizar paths para "stores"
Fase 3: ✅ Renomear *Sublevel → *Store
Fase 4: ✅ Renomear levelKeys → storeKeys
Fase 5: ✅ Renomear IPC handlers + canais
Fase 6: ✅ Atualizar preload (store)
Fase 7: ✅ Atualizar renderer (store.service)
Fase 8: ✅ Migrar JSON → SQLite (SqliteStore)
Fase 9: ✅ Limpeza final (classic-level removido, types renomeado)

Pendência: Remover `src/main/services/json-level.ts` após confirmação de que SQLite está estável.
```

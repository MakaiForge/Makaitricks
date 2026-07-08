# BUILD SEGURA — ProtonForge

## 1. ARQUITETURA: AS TRÊS CAMADAS

O ProtonForge é um aplicativo **Electron** dividido em **três processos independentes** que se comunicam via IPC:

```
┌───────────────────────────────────────────────────────────────┐
│  PROCESSO PRINCIPAL (Main)                                    │
│  src/main/index.ts → compila para out/main/index.js           │
│                                                               │
│  Responsabilidades:                                           │
│  - Ciclo de vida do app (app.whenReady, app.on, etc.)         │
│  - Criação das janelas (BrowserWindow)                        │
│  - Banco de dados (src/main/store/)                   │
│  - Gerenciamento de downloads (qBittorrent + Python RPC)      │
│  - Gerenciamento de Proton/Wine                               │
│  - Processadores IPC (src/main/events/)                       │
│  - WebSocket, autenticação, cloud saves, etc.                 │
└──────────────────┬────────────────────────────────────────────┘
                   │  ipcMain.handle / ipcRenderer.invoke
                   │  webContents.send / ipcRenderer.on
┌──────────────────▼────────────────────────────────────────────┐
│  PONTE (Preload)                                              │
│  src/preload/index.ts → compila para out/preload/index.mjs    │
│                                                               │
│  Única função:                                                │
│  contextBridge.exposeInMainWorld("electron", { ... })         │
│                                                               │
│  Cada função exposta chama ipcRenderer.invoke("canal", args)  │
│  ou ipcRenderer.on("canal", callback) para eventos push       │
│                                                               │
│  ⚠ NADA além do que está aqui fica disponível pro Renderer    │
└──────────────────┬────────────────────────────────────────────┘
                   │  window.electron.*
┌──────────────────▼────────────────────────────────────────────┐
│  INTERFACE (Renderer)                                         │
│  src/renderer/index.html + src/ → compila para out/renderer/  │
│                                                               │
│  - React SPA (HashRouter + Redux + i18next)                   │
│  - Acessa Electron/SO APENAS via window.electron.*            │
│  - Páginas: Home, Catálogo, Downloads, Biblioteca,            │
│             Detalhes, Configurações, Perfil, Proton Tools,     │
│             Notificações, Editor de Temas, Lançador            │
└───────────────────────────────────────────────────────────────┘
```

## 2. O ERRO QUE DEU (E POR QUE VOLTOU A ACONTECER)

### O Build é cego

O `electron-vite build` compila cada uma das 3 camadas **separadamente**. Ele NÃO verifica se:

- A Main expõe os IPC handlers que a Preload chama
- A Preload expõe as funções que a Renderer usa
- Os nomes/types batem entre as camadas

O compilador só vê um arquivo por vez. Se a Main chama `ipcMain.handle("foo")` e a Renderer espera `window.electron.foo()`, o build passa **mesmo que a Preload nunca tenha exposto `foo`**.

### O que aconteceu no seu caso

1. A **Renderer** (código React) foi modificada para usar:
   - `window.electron.forgerApi.get(...)` (API proxy)
   - `window.electron.getForgerDeckyPluginInfo()`
   - `window.electron.onProtonDownloadProgress()`

2. O **Preload** (`src/preload/index.ts`) NUNCA foi atualizado — ele ainda expunha a API velha (sem as funções novas)

3. O **build passou** porque cada camada compila isoladamente

4. No **runtime**, quando a Renderer chamou `window.electron.forgerApi.get()`, o retorno foi `undefined` — porque `forgerApi` não existia no objeto exposto pelo Preload

Resultado: `TypeError: Cannot read properties of undefined (reading 'get')` → React quebra → janela morre → Electron fecha.

### Como evitar

Toda vez que você ADICIONAR uma função nova na Renderer que precisa do Electron/SO, você precisa:

```
1. src/main/events/categoria/seu-arquivo.ts  ← handler no Main
2. src/preload/index.ts                       ← expor no Preload
3. src/renderer/src/...                       ← chamar na Renderer
```

Se pular o passo 2, o build passa mas quebra no runtime.

---

## 3. MAPA COMPLETO DO PRELOAD

O Preload expõe `window.electron` com estes namespaces:

### 3.1 Torrenting / Downloads

```
startGameDownload, addGameToQueue, cancelGameDownload,
pauseGameDownload, resumeGameDownload, pauseGameSeed,
resumeGameSeed, updateDownloadQueuePosition,
checkDebridAvailability, getTorrentFiles,
pauseGameTransfer, resumeGameTransfer, cancelGameTransfer
```

Eventos push:
```
onDownloadProgress, onProtonDownloadProgress,
onInstallProgress, onInstallLog, onHardDelete,
onSeedingStatus, onExtractionComplete,
onExtractionProgress, onExtractionFailed,
onArchiveDeletionPrompt
```

### 3.2 Catálogo

```
getGameShopDetails, getRandomGame, getLocalResource,
getGameStats, getGameAssets
```

### 3.3 Preferências

```
getUserPreferences, updateUserPreferences, autoLaunch
```

### 3.4 Fontes de Download

```
addDownloadSource, removeDownloadSource, getDownloadSources,
syncDownloadSources, getDownloadSourcesCheckBaseline,
getDownloadSourcesSinceValue
```

### 3.5 Biblioteca (Gerenciamento de Jogos)

```
addGameToLibrary, addCustomGameToLibrary, updateGameConfig,
addGameToFavorites, removeGameFromFavorites,
assignGameToCollection, toggleGamePin, getLibrary,
refreshLibraryAssets, getGameByObjectId,
removeGameFromLibrary, removeGame, deleteGameFolder,
deleteGamePrefix, deleteGameCompletely, deleteGameWithPrefix,
openGame, closeGame, openGameExecutablePath,
openGameInstaller, openGameInstallerPath,
openGameWinePrefix, openGameWinetricks,
openGameSaveFolder, runWineTool,
getGameSaveFolder, getGameInstallerActionType,
setGameExecutablePath, updateExecutablePath,
selectGameWinePrefix, selectGameProtonPath,
getInstalledProtonVersions, recommendProton,
getGameLaunchProtonVersion, verifyExecutablePathInUse,
updateLaunchOptions, clearNewDownloadOptions,
downloadGameCovers, changeGamePlayTime,
extractGameDownload, scanInstalledGames,
getDefaultWinePrefixSelectionPath,
createGameShortcut, createSteamShortcut,
deleteSteamShortcut, checkSteamShortcut,
toggleAutomaticCloudSync, toggleGameMangohud,
toggleGameGamemode, isGamemodeAvailable,
isMangohudAvailable, isWinetricksAvailable,
copyCustomGameAsset, updateCustomGame,
updateGameCustomAssets, cleanupUnusedAssets,
deleteArchive, getAvailableDrives,
transferGameFiles, installGameFolder,
saveInstalledGameExecutable
```

### 3.6 Cloud Save

```
uploadSaveGame, downloadGameArtifact, getGameArtifacts,
getGameBackupPreview, selectGameBackupPath,
onUploadComplete
```

### 3.7 Hardware

```
getDiskFreeSpace, checkFolderWritePermission
```

### 3.8 Utilitários

```
ping, getVersion, getDefaultDownloadsPath, getUserHomePath,
isStaging, isPortableVersion, openExternal, openCheckout,
showOpenDialog, showItemInFolder, getImageDataUrl,
canInstallCommonRedist, installCommonRedist,
resetCommonRedistPreflight, saveTempFile, deleteTempFile,
checkHomebrewFolderExists, platform
```

### 3.9 API Proxy (forgerApi)

```
forgerApi.get(url, options)
forgerApi.post(url, options)
forgerApi.put(url, options)
forgerApi.patch(url, options)
forgerApi.delete(url, options)
```

Opções: `needsAuth`, `needsSubscription`, `ifModifiedSince`

### 3.10 Autenticação

```
getAuth, signOut, openAuthWindow, getSessionHash,
onSignIn, onSignOut, onAccountUpdated
```

### 3.11 Perfil

```
getMe, updateProfile, processProfileImage,
updateFriendRequest, onSyncFriendRequests,
onSyncNotificationCount
```

### 3.12 Notificações

```
publishNewRepacksNotification, getLocalNotifications,
getLocalNotificationsCount, markLocalNotificationRead,
markAllLocalNotificationsRead, deleteLocalNotification,
clearAllLocalNotifications, onLocalNotificationCreated
```

### 3.13 Temas

```
addCustomTheme, getAllCustomThemes, deleteAllCustomThemes,
deleteCustomTheme, getCustomThemeById, getActiveCustomTheme,
toggleCustomTheme, updateCustomTheme, openEditorWindow,
closeEditorWindow, getThemeSoundDataUrl, getThemeSoundPath,
importThemeSoundFromStore, copyThemeAchievementSound,
removeThemeAchievementSound
```

### 3.14 Proton Tools

```
getProtonTools, getProtonToolsByCategory, getProtonReleases,
downloadProtonTool, downloadProtonByFork, analyzeGameExe,
getInstalledProtonTools, getProtonInstallDir,
removeProtonTool
```

### 3.15 Decky Plugin

```
getForgerDeckyPluginInfo, installForgerDeckyPlugin
```

### 3.16 Store

```
store: { get, put, del, values, iterator, clear }
```

---

## 4. EVENTOS IPC (Main)

Cadastrados em `src/main/events/`, cada arquivo = 1 handler:

```
auth/           → getSessionHash, openAuthWindow, signOut
autoupdater/    → checkForUpdates, restartAndInstallUpdate
catalogue/      → getGameAssets, getGameShopDetails, getGameStats, getRandomGame
cloud-save/     → downloadGameArtifact, getGameBackupPreview, selectGameBackupPath, uploadSaveGame
download-sources/ → add/get/remove/sync download sources
games-json/     → index
hardware/       → checkFolderWritePermission, getDiskFreeSpace
helpers/        → findGameRoot, getDirectorySize, getDownloadsPath, parseExecutablePath, parseLaunchOptions
store/        → get, put, del, values, iterator, clear
library/        → ~50 handlers (ver seção 3.5)
misc/           → forgerApiCall, getForgerDeckyPluginInfo, getLocalResource,
                  getImageDataUrl, getUserHomePath, isMainWindowOpen,
                  openCheckout, openExternal, openMainWindow,
                  saveTempFile, deleteTempFile, showGameLauncherWindow,
                  showItemInFolder, showOpenDialog, closeGameLauncherWindow
notifications/  → CRUD local notifications
profile/        → getMe, processProfileImage, updateProfile
proton/         → analyzeGameExe, installGameWithProton, recommendProton
themes/         → CRUD themes + editor window
torrenting/     → start/cancel/pause/resume downloads + seeding
user/           → getAuth
user-preferences/ → get/update preferences + autoLaunch
```

---

## 5. CICLO DE VIDA DA APLICAÇÃO

```
app.whenReady()
  ├── session.defaultSession CSP stripping
  ├── protocol.handle("local:", ...)
  ├── protocol.handle("gradient:", ...)
  ├── startQBittorrent()     ← spawn qbittorrent-nox
  ├── waitForQBittorrent()   ← espera porta 8080 (max 7.5s)
  ├── loadState()            ← coração da aplicação
  │   ├── Lock.acquireLock()
  │   ├── import events (registra todos IPC handlers)
  │   ├── GofileApi.initialize()
  │   ├── Ludusavi config + binary copy
  │   ├── Sincroniza fontes de download locais
  │   ├── Normaliza estado de downloads (pausa ativos, etc.)
  │   ├── Resume download interrompido
  │   ├── Inicia serviço de seeding (Python RPC)
  │   ├── startMainLoop()    ← 4 loops concorrentes
  │   └── SystemPath.checkPathsAreAvailable()
  ├── Lê idioma do armazenamento
  ├── Se não --hidden: WindowManager.createMainWindow()
  │   ├── Cria BrowserWindow (1200x860, show:false)
  │   ├── Configura headers/spoofing User-Agent
  │   ├── Carrega renderer/index.html
  │   └── ready-to-show → window.show()
  └── WindowManager.createSystemTray()
```

---

## 6. BANCO DE DADOS

Localização: `app.getPath("userData") + "/stores"`
(~/.config/protonforge/stores no Linux)

```
games                  → Game objects (shop + objectId como chave)
downloads              → Download objects
themes                 → Custom theme objects
downloadSources        → Download source URLs
downloadSourcesCheckTimestamp → Última verificação
gameShopAssets         → Assets cacheados do catálogo
gameShopCache          → Cache de busca do catálogo
gameStatsCache         → Estatísticas cacheadas
localNotifications     → Notificações locais
```

### Chaves raiz (sem sublevel):

```
user                   → Dados do usuário logado
auth                   → Token de autenticação
userPreferences        → Preferências do usuário
language               → Idioma selecionado
screenState            → Posição/tamanho da janela
rpcPassword            → Senha do RPC
downloadSourcesCheckBaseline → Baseline de checagem
downloadSourcesSinceValue    → Since value da API
commonRedistPassed     → Flag de redistribuíveis instalados
```

---

## 7. MAIN LOOP (4 loops concorrentes)

Após `loadState()`, o `main-loop.ts` roda 4 loops:

1. **Download watcher** — monitora progresso de downloads JS e RPC
2. **Process watcher** — monitora processos de jogo em execução (playtime)
3. **Library sync** — sincroniza biblioteca com servidor remoto
4. **Scheduler** — agendador de tarefas periódicas

---

## 8. FLUXO DE UMA CHAMADA IPC (exemplo: "abrir jogo")

```
Renderer:
  window.electron.openGame("steam", "12345", "/path/to/exe", {})

     ↓ ipcRenderer.invoke("openGame", { shop, objectId, exePath, launchOptions })

Preload (src/preload/index.ts):
  openGame: (payload) => ipcRenderer.invoke("openGame", payload),

     ↓ ipcMain.handle("openGame", handler)

Main (src/main/events/library/open-game.ts):
  - Verifica Wine/Proton
  - Monta comando de lançamento
  - Executa processo do jogo
  - Cria game launcher window
  - Inicia process watcher para playtime

     ↓ webContents.send("game-closed", { shop, objectId })

Renderer:
  window.electron.on("game-closed", callback)
```

---

## 9. COMPILAÇÃO (electron-vite)

Config: `electron.vite.config.ts`

3 targets:
- **main** — entry: `src/main/index.ts`, plugins: externalizeDeps + swc
- **preload** — entry: `src/preload/index.ts`
- **renderer** — entry: `src/renderer/index.html`, plugins: svgr + react

Output:
```
out/main/index.js       ← Main process (2.5MB)
out/main/index-*.js     ← Dynamic imports (chunks)
out/preload/index.mjs   ← Preload (23KB)
out/renderer/            ← React SPA completa
```

---

## 10. SERVIÇOS EXTERNOS INTEGRADOS

| Serviço | Descrição | Localização |
|---------|-----------|-------------|
| **qBittorrent** | Torrent client (headless) | resources/qbittorrent/qbittorrent-nox |
| **Python RPC** | Torrent seeding bridge | python_rpc/main.py → frozen binary |
| **Ludusavi** | Game save backup | ludusavi/ludusavi (binary) |
| **Proton/Wine** | Runtime tools | Gerenciado por src/main/services/proton/ |
| **7-Zip** | Extração de arquivos | resources/7zzs |
| **UMU** | Launcher wrapper | resources/umu-run |
| **Decky Plugin** | Steam Deck integração | installForgerDeckyPlugin() |

---

## 11. VARIAVEIS DE AMBIENTE (.env)

```
MAIN_VITE_API_URL=http://localhost:0
MAIN_VITE_AUTH_URL=http://localhost:0
MAIN_VITE_WS_URL=ws://localhost:0
MAIN_VITE_NIMBUS_API_URL=http://localhost:0
MAIN_VITE_LAUNCHER_SUBDOMAIN=
RENDERER_VITE_EXTERNAL_RESOURCES_URL=http://localhost:0
```

Todas apontam para `localhost:0` (desativadas/placeholders).

---

## 12. CHECKLIST: O QUE FAZER QUANDO ADICIONAR FUNCIONALIDADE

- [ ] Criei o handler no Main? `src/main/events/categoria/meu-evento.ts`
- [ ] Importei no index da categoria? `src/main/events/categoria/index.ts`
- [ ] Adicionei ao barrel? `src/main/events/index.ts`
- [ ] Exposei no Preload? `src/preload/index.ts` — `contextBridge.exposeInMainWorld`
- [ ] Testei no Renderer? `window.electron.minhaFuncao()`
- [ ] Compilei? `npm run build`
- [ ] Testei rodando? `echo "1" | node ./node_modules/electron/cli.js . --no-sandbox`

⚠ **Se pular a exposição no Preload, o build passa mas o runtime quebra.**

---

## 13. BACKUP (bbb)

O diretório `/home/cas/Documentos/bbb/protonforgerfull/` é um snapshot funcional.

Para restaurar um arquivo específico:
```bash
cp /home/cas/Documentos/bbb/protonforgerfull/src/caminho/arquivo.ts \
   /home/cas/Documentos/protonforgerfull/src/caminho/arquivo.ts
```

Para restaurar tudo (cuidado, sobrescreve):
```bash
rm -rf /home/cas/Documentos/protonforgerfull/src \
       /home/cas/Documentos/protonforgerfull/out
cp -r /home/cas/Documentos/bbb/protonforgerfull/src \
      /home/cas/Documentos/protonforgerfull/
```

O backup NÃO precisa ser atualizado a cada modificação — ele serve como referência estável.

---

## 14. COMANDOS ÚTEIS

```bash
# Compilar
npm run build

# Desenvolvimento (com hot reload)
npm run dev

# Visualizar apenas preview do build atual
npm run start

# Reinstalar dependências
npm run reinstall

# Build nativo (Rust addon)
npm run build:native
```

---

## 15. DIAGNÓSTICO DE ERROS

| Erro | Causa provável |
|------|---------------|
| `window.electron.X is not a function` | Preload não expõe `X` |
| `Cannot read properties of undefined (reading 'get')` | Objeto da API não exposto no Preload |
| `Database is not open` | Banco de dados corrompido — limpar `~/.config/protonforge/` |
| `qt.qpa.xcb: could not connect to display` | `XAUTHORITY` inválido ou `DISPLAY` errado |
| `Authorization required, no protocol specified` | X11 cookie ausente — `xauth add :0 . <cookie>` |
| App fecha sem janela | Renderer quebrou (erro JS no carregamento) |

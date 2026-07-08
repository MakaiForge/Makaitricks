# MODULARIZAÇÃO DO PROCESSO DE INSTALAÇÃO

## Objetivo

Cada arquivo faz UMA coisa. Cada função faz UMA coisa. O fluxo completo é
uma sequência linear de chamadas — legível de cima pra baixo.

---

## NOVAS PASTAS

```
src/
├── main/
│   ├── events/
│   │   └── library/
│   │       ├── open-game-installer.ts    ← ENTRY POINT (só orquestra)
│   │       └── (outros eventos existentes)
│   │
│   ├── install-flow/                     ← NOVA: fluxo de instalação
│   │   ├── types.ts                      ← tipos compartilhados
│   │   ├── snapshot.ts                   ← takeSnapshot()
│   │   ├── prefix-setup.ts              ← setupPrefix()
│   │   ├── runner.ts                     ← runInstaller() / runExecutable()
│   │   ├── change-detector.ts           ← hasMeaningfulChanges() + findNewExes()
│   │   ├── source-resolver.ts           ← getSourceFolder()
│   │   ├── prefix-copier.ts             ← copyFolderToPrefix() + verifyCopy()
│   │   ├── prefix-scanner.ts            ← scanPrefixForExes()
│   │   ├── candidate-formatter.ts       ← formatCandidates()
│   │   └── orchestrator.ts              ← installAndScan() (junta tudo)
│   │
│   └── helpers/                          ← existente (não mexer)
│       ├── find-game-exe.ts
│       ├── find-exe-in-folder.ts
│       └── copy-game-to-prefix.ts
│
├── renderer/
│   └── src/
│       ├── pages/
│       │   └── downloads/
│       │       ├── downloads.tsx         ← ENTRY POINT (só orquestra UI)
│       │       ├── downloads.scss
│       │       ├── install-flow.ts       ← NOVO: lógica de instalação
│       │       │                           (separada do JSX)
│       │       ├── components/
│       │       │   ├── executable-candidate-modal.tsx
│       │       │   ├── executable-candidate-modal.scss
│       │       │   ├── exe-picker-modal.tsx
│       │       │   ├── exe-picker-modal.scss
│       │       │   ├── scanning-prefix-modal.tsx
│       │       │   ├── scanning-prefix-modal.scss
│       │       │   ├── copying-game-modal.tsx
│       │       │   ├── copying-game-modal.scss
│       │       │   ├── install-progress-modal.tsx
│       │       │   ├── install-progress-modal.scss
│       │       │   ├── proton-recommendation-modal.tsx
│       │       │   └── proton-recommendation-modal.scss
│       │       └── hooks/                ← NOVO
│       │           ├── use-install-flow.ts
│       │           └── use-candidate-selection.ts
│       └── (outras páginas existentes)
```

---

## RESPONSABILIDADE DE CADA ARQUIVO (main process)

### `src/main/install-flow/types.ts`

**Tipos compartilhados entre todos os arquivos do fluxo.**

```typescript
export interface SnapshotEntry {
  path: string
  size: number
  mtimeMs: number
}

export interface InstallCandidate {
  path: string
  name: string
  size: number
}

export interface InstallResult {
  wasOpened: boolean
  candidates: InstallCandidate[]
  suggestedDir: string | null
}

export interface InstallOptions {
  gameId?: string
  winePrefixPath?: string | null
  protonPath?: string | null
  gameTitle?: string | null
  gameKey?: string
  shop?: GameShop
  objectId?: string
}

export interface FolderScanResult {
  candidates: InstallCandidate[]
  suggestedDir: string | null
}
```

### `src/main/install-flow/snapshot.ts`

**Responsabilidade:** Tirar snapshot do `drive_c`.

```typescript
// Recebe o caminho do drive_c
// Retorna array de SnapshotEntry com path relativo, size, mtimeMs
// Percorre recursivamente (pula pastas que não consegue ler)
export function takeSnapshot(driveCPath: string): SnapshotEntry[]
```

- ~25 linhas
- Sem dependência de banco, Electron, ou qualquer outra coisa

### `src/main/install-flow/prefix-setup.ts`

**Responsabilidade:** Criar prefixo e instalar DLLs.

```typescript
// Recebe gameId, protonPath, winePrefixPath
// Chama ProtonRecommendationService.createPrefix()
// Loga DLLs instaladas, erros
// Retorna true/false
export async function setupPrefix(
  gameId: string,
  protonPath: string,
  winePrefixPath: string
): Promise<boolean>
```

- ~30 linhas
- Depende apenas do `ProtonRecommendationService`
- Não faz snapshot, não executa jogo, não escaneia

### `src/main/install-flow/runner.ts`

**Responsabilidade:** Executar um .exe dentro do prefixo e aguardar fechar.

```typescript
// Recebe filePath, winePrefixPath, protonPath, gameId
// Chama Umu.launchInstaller() ou Umu.launchExecutable()
// Aguarda Promise resolver
// Retorna true se executou, false se erro
export async function runExecutable(
  filePath: string,
  winePrefixPath: string,
  protonPath?: string | null,
  gameId?: string
): Promise<boolean>
```

- ~20 linhas
- Só executa e aguarda. Não tira snapshot, não escaneia.

### `src/main/install-flow/change-detector.ts`

**Responsabilidade:** Comparar snapshots before/after e retornar .exe novos.

```typescript
// Recebe snapshotBefore e snapshotAfter
// Filtra: só .exe, que são novos ou tiveram tamanho alterado > 1024 bytes
// Filtra: exclui diretórios internos do Wine (windows/, ProgramData/, users/)
// Ordena por mtimeMs decrescente (mais recente primeiro)
// Retorna top 5
export function findNewExecutables(
  before: SnapshotEntry[],
  after: SnapshotEntry[]
): SnapshotEntry[]

// Função auxiliar: só diz se houveram mudanças significativas
export function hasMeaningfulChanges(
  before: SnapshotEntry[],
  after: SnapshotEntry[]
): boolean
```

- `findNewExecutables` ~25 linhas
- `hasMeaningfulChanges` ~20 linhas
- Puramente funções puras (dado entra, resultado sai)
- Sem dependências externas (só tipos)

### `src/main/install-flow/source-resolver.ts`

**Responsabilidade:** Descobrir a pasta de origem do jogo.

```typescript
// Recebe gameKey
// Busca no armazenamento (downloadsStore)
// Se encontrar folderName, monta caminho completo
// Retorna caminho da pasta ou null
export async function getSourceFolder(
  gameKey: string
): Promise<string | null>

// Recebe filePath (caminho de um .exe)
// Retorna o diretório pai
export function getParentFolder(filePath: string): string
```

- ~25 linhas
- Só resolve caminhos. Não copia, não escaneia.

### `src/main/install-flow/prefix-copier.ts`

**Responsabilidade:** Copiar pasta do jogo para dentro do prefixo.

```typescript
// Recebe sourcePath (pasta do jogo) e winePrefixPath
// Cria pasta destino em drive_c/<folderName>
// Se já existir, apaga e recria
// Copia recursivamente
// Verifica integridade (conta arquivos + tamanho total)
// Retorna o caminho destino
export function copyFolderToPrefix(
  sourcePath: string,
  winePrefixPath: string
): string
```

- ~35 linhas
- Só copia e verifica. Não escaneia.

### `src/main/install-flow/prefix-scanner.ts`

**Responsabilidade:** Escanear o prefixo e retornar candidatos.

```typescript
// Recebe winePrefixPath
// Chama findGameExecutables(winePrefixPath) da helper existente
// Se achou → formata e retorna
// Se não achou → suggestedDir = drive_c
export function scanPrefixForExes(
  winePrefixPath: string
): FolderScanResult
```

- ~15 linhas
- Só escaneia. Não copia, não executa.

### `src/main/install-flow/candidate-formatter.ts`

**Responsabilidade:** Converter SnapshotEntry[] em InstallCandidate[].

```typescript
// Recebe newExes (SnapshotEntry[]) e driveCPath
// Mapeia para InstallCandidate[] com path absoluto
// suggestedDir = path.dirname do primeiro candidato
export function formatCandidates(
  newExes: SnapshotEntry[],
  driveCPath: string
): { candidates: InstallCandidate[]; suggestedDir: string }
```

- ~15 linhas
- Pura formatação

### `src/main/install-flow/orchestrator.ts`

**Responsabilidade:** Orquestrar o fluxo completo de instalar + escanear.

```typescript
// PASSO A PASSO:
// 1. setupPrefix()              → prepara ambiente
// 2. takeSnapshot()             → antes
// 3. runExecutable()            → roda o .exe
// 4. takeSnapshot()             → depois
// 5. findNewExecutables()       → compara e acha novos
// 6. Se achou → formatCandidates() → return
// 7. Se não achou:
// 8.   getSourceFolder()        → descobre pasta do jogo
// 9.   Se não tem pasta → getParentFolder(filePath)
// 10.  copyFolderToPrefix()     → copia pro prefixo
// 11.  scanPrefixForExes()      → escaneia dentro do prefixo
// 12.  Se achou → return
// 13.  Se não → suggestedDir = drive_c → return
export async function installAndScan(
  filePath: string,
  options: InstallOptions
): Promise<InstallResult>
```

- ~40-50 linhas
- **Só chama funções em sequência.**
- Cada if/else tem UMA linha de espessura.
- Legível de cima pra baixo: setup → before → run → after → compare → found? retorna. Não found? resolve pasta → copia → escaneia → retorna.

---

## MUDANÇAS NO `open-game-installer.ts`

O arquivo original (~350 linhas) vira:

```typescript
// SÓ IMPORTA E CHAMA

import { installAndScan } from "../install-flow/orchestrator"
import { findExesInFolder } from "@main/helpers/find-exe-in-folder"
import type { InstallResult } from "../install-flow/types"

async function openGameInstaller(shop, objectId, protonPath): Promise<InstallResult> {
    const download = await downloadsSublevel.get(gameKey)
    const game = await gamesSublevel.get(gameKey)
    const winePrefixPath = Wine.getEffectivePrefixPath(...)
    const gamePath = path.join(downloadPath, download.folderName)

    // ARQUIVO ÚNICO
    if (isFile(gamePath)) {
        if (isExeOrMsi) return await installAndScan(gamePath, { ... })
        shell.showItemInFolder(gamePath)
        return { wasOpened: true, candidates: [], suggestedDir: null }
    }

    // PASTA
    // 1. Procura setup.exe
    for (const name of ["setup.exe", "install.exe", "autorun.exe"]) {
        if (exists) return await installAndScan(path, { ... })
    }

    // 2. Procura outros .exe
    const folderExes = findExesInFolder(gamePath)
    if (folderExes.candidates.length > 0) {
        return { wasOpened: false, candidates: folderExes.candidates, suggestedDir: ... }
    }

    // 3. Nada
    return { wasOpened: true, candidates: [], suggestedDir: gamePath }
}
```

- ~50 linhas
- Só decide qual caminho tomar e delega
- Zero lógica de instalação, zero snapshot, zero cópia

---

## MUDANÇAS NO `install-game-folder.ts`

Esse arquivo (~400 linhas) basicamente faz a MESMA COISA que o `open-game-installer.ts`
mas com pequenas diferenças. Ele deve ser REFATORADO para usar o mesmo `orchestrator.ts`:

```typescript
import { installAndScan } from "../install-flow/orchestrator"
import { findExecutablesRecursive, isInstallerExe } from "./helpers"

async function installGameExe(shop, objectId) {
    const sourcePath = ... // pasta/arquivo do jogo
    const winePrefixPath = ...

    if (isFile(sourcePath)) {
        return await installAndScan(sourcePath, { ... })
    }

    // Pasta: encontra .exe pra executar
    const allExes = findExecutablesRecursive(sourcePath)
    const installer = allExes.find(isInstallerExe)
    const exeToLaunch = installer ?? pickGameExecutable(allExes)
    
    if (!exeToLaunch) return emptyResult
    
    const result = await installAndScan(exeToLaunch, { ... })
    
    // Se o installAndScan retornou vazio depois de copiar
    // e escanear, ainda tenta achar .exe na cópia manualmente:
    if (result.candidates.length === 0 && isSourceFolder) {
        const destPath = path.join(drive_c, basename(sourcePath))
        const copiedExes = findExecutablesRecursive(destPath)
        if (copiedExes.length > 0) return formatResult(copiedExes)
    }
    
    return result
}
```

- ~50 linhas
- Reusa `installAndScan` em vez de duplicar snapshot/scanner/cópia

---

## MUDANÇAS NO RENDERIZADOR

### `src/renderer/src/pages/downloads/install-flow.ts` (NOVO)

**Responsabilidade:** Lógica de instalação separada do JSX.

```typescript
// Toda lógica de:
// - abrir instalador
// - receber resultado
// - tratar wasOpened
// - mostrar modais corretos
// - chamar installAndScan quando necessário

export function useInstallFlow() {
    // Estados: modais, candidatos, progresso
    // handleOpenGameInstaller()
    // handleSelectProton()
    // handleDownloadAndSelect()
    // handleCandidatePicked()  ← NOVO: trata wasOpened
    // handleExePicked()        ← FINAL: salva
}
```

### `src/renderer/src/pages/downloads/downloads.tsx` (SIMPLIFICADO)

Vira SÓ a UI:

```tsx
function Downloads() {
    const flow = useInstallFlow()
    
    return (
        <>
            <InstallProgressModal visible={flow.progress != null} ... />
            <ScanningPrefixModal visible={flow.scanning} />
            <CopyingGameModal visible={flow.copying} />
            <ExecutableCandidateModal
                visible={flow.showCandidates}
                candidates={flow.candidates}
                onSelect={flow.handleCandidatePicked}
                onBrowse={flow.handleBrowse}
            />
            {/* resto da UI existente */}
        </>
    )
}
```

- ~200 linhas a menos
- Zero lógica de instalação no JSX

---

## FLUXO COMPLETO (chamada por chamada)

### Caso: Pasta com setup.exe

```
downloads.tsx
  └── handleOpenGameInstaller()
        └── window.electron.openGameInstaller()     ← IPC
              └── openGameInstaller()                ← entry point
                    └── installAndScan(setupPath)
                          ├── setupPrefix()
                          ├── takeSnapshot()         ← before
                          ├── runExecutable()        ← roda setup.exe
                          ├── takeSnapshot()         ← after
                          ├── findNewExecutables()
                          │
                          ├── ACHOU?
                          │     └── formatCandidates()
                          │           └── return { wasOpened: true, candidates }
                          │
                          └── NÃO ACHOU?
                                ├── getSourceFolder()
                                ├── copyFolderToPrefix()
                                ├── scanPrefixForExes()
                                │
                                ├── ACHOU?
                                │     └── return { wasOpened: true, candidates }
                                │
                                └── return { wasOpened: true, candidates: [], suggestedDir: drive_c }
```

### Caso: Pasta sem setup.exe (só .exe do jogo)

```
downloads.tsx
  └── handleOpenGameInstaller()
        └── window.electron.openGameInstaller()
              └── openGameInstaller()
                    └── findExesInFolder(gamePath)
                          └── return { wasOpened: false, candidates }

RENDERIZADOR:
  └── flow.handleCandidatePicked(path)   ← usuário escolheu um .exe
        └── window.electron.installAndScan(path, options)
              └── installAndScan()
                    ├── setupPrefix()
                    ├── takeSnapshot()
                    ├── runExecutable()
                    ├── takeSnapshot()
                    ├── findNewExecutables()
                    ├── ACHOU? → mostra candidatos ESCANEADOS
                    └── NÃO ACHOU? → copia → escaneia → mostra
```

### Caso: .exe único

```
downloads.tsx
  └── handleOpenGameInstaller()
        └── window.electron.openGameInstaller()
              └── openGameInstaller()
                    └── installAndScan(filePath)
                          ├── setupPrefix()
                          ├── takeSnapshot()
                          ├── runExecutable()
                          ├── takeSnapshot()
                          ├── findNewExecutables()
                          │
                          ├── ACHOU? → mostra
                          │
                          └── NÃO ACHOU?
                                ├── getParentFolder(filePath)  ← diretório pai do .exe
                                ├── copyFolderToPrefix()
                                ├── scanPrefixForExes()
                                └── mostra ou suggestedDir = drive_c
```

---

## RESPONSABILIDADE DO "BUSQUE MANUAL"

Em todos os casos, o `suggestedDir` NUNCA é a raiz do `drive_c` se existirem
candidatos ou se a cópia foi feita.

```
Cenário                          suggestedDir
──────────────────────────────────────────────────────────
Instalador instalou em            drive_c/Program Files/
Program Files/Genshin Impact/     Genshin Impact/

Instalador não modificou,         drive_c/<folderName>/
mas copiamos a pasta do jogo     (pasta copiada)

Nada encontrado                   drive_c/
                                  (usuário navega manualmente)
```

O `suggestedDir` SEMPRE aponta pra pasta DENTRO do prefixo onde os
.exe estão (ou deveriam estar). O file picker abre lá.

---

## CSS / COMPONENTES

Cada modal tem seu próprio arquivo .scss:

```
src/renderer/src/pages/downloads/
├── components/
│   ├── executable-candidate-modal.tsx
│   ├── executable-candidate-modal.scss    ← estilo do modal
│   ├── exe-picker-modal.tsx
│   ├── exe-picker-modal.scss
│   ├── scanning-prefix-modal.tsx
│   ├── scanning-prefix-modal.scss
│   ├── copying-game-modal.tsx
│   ├── copying-game-modal.scss
│   ├── install-progress-modal.tsx
│   ├── install-progress-modal.scss
│   ├── proton-recommendation-modal.tsx
│   └── proton-recommendation-modal.scss
├── hooks/
│   ├── use-install-flow.ts
│   └── use-candidate-selection.ts
├── install-flow.ts
├── downloads.tsx
└── downloads.scss
```

---

---

## DETALHAMENTO DE CADA FUNÇÃO (main process)

### `snapshot.ts`

```typescript
import fs from "node:fs"
import path from "node:path"
import type { SnapshotEntry } from "./types"

export function takeSnapshot(prefixDriveC: string): SnapshotEntry[] {
  const entries: SnapshotEntry[] = []
  const walk = (dir: string, relativePrefix: string) => {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true })
      for (const item of items) {
        const full = path.join(dir, item.name)
        const rel = relativePrefix
          ? `${relativePrefix}/${item.name}`
          : item.name
        if (item.isDirectory()) {
          walk(full, rel)
        } else if (item.isFile()) {
          try {
            const stat = fs.statSync(full)
            entries.push({ path: rel, size: stat.size, mtimeMs: stat.mtimeMs })
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  walk(prefixDriveC, "")
  return entries
}
```

- Pura leitura de disco
- Sem dependência externa
- ~30 linhas

---

### `change-detector.ts`

```typescript
import type { SnapshotEntry } from "./types"

const WINE_INTERNAL_DIRS = ["windows/", "ProgramData/", "users/"]

export function hasMeaningfulChanges(
  before: SnapshotEntry[],
  after: SnapshotEntry[]
): boolean {
  const beforeMap = new Map(before.map((e) => [e.path, e.size]))
  const newItems = after.filter((a) => {
    const bSize = beforeMap.get(a.path)
    if (bSize === undefined) return true
    return Math.abs(a.size - bSize) > 1024
  })
  const nonWineNew = newItems.filter(
    (e) => !WINE_INTERNAL_DIRS.some((d) => e.path.startsWith(d))
  )
  const hasNewExe = nonWineNew.some((e) =>
    e.path.toLowerCase().endsWith(".exe")
  )
  const totalNewSize = nonWineNew.reduce((s, e) => s + e.size, 0)
  return hasNewExe || totalNewSize > 2 * 1024 * 1024
}

export function findNewExecutables(
  before: SnapshotEntry[],
  after: SnapshotEntry[]
): SnapshotEntry[] {
  const beforeMap = new Map(before.map((e) => [e.path, e]))
  const newExes: SnapshotEntry[] = []
  for (const entry of after) {
    if (!entry.path.toLowerCase().endsWith(".exe")) continue
    const beforeEntry = beforeMap.get(entry.path)
    if (!beforeEntry || Math.abs(entry.size - beforeEntry.size) > 1024) {
      newExes.push(entry)
    }
  }
  newExes.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return newExes.slice(0, 5)
}
```

- Funções PURAS: dado entra, resultado sai
- Sem dependência de fs, Electron, banco
- `WINE_INTERNAL_DIRS` contém SÓ os diretórios verdadeiramente internos do Wine
- `Program Files/` e `Program Files (x86)/` NÃO estão aqui (corrigido)
- ~45 linhas

---

### `prefix-setup.ts`

```typescript
import { ProtonRecommendationService } from "@main/services"
import { logger } from "@main/services"

export async function setupPrefix(
  gameId: string,
  protonPath: string,
  winePrefixPath: string,
  onLog?: (msg: string) => void
): Promise<boolean> {
  try {
    if (onLog) onLog(`Criando prefixo Wine em: ${winePrefixPath}`)
    const result = await ProtonRecommendationService.createPrefix(
      gameId,
      protonPath,
      winePrefixPath
    )
    if (!result.success) {
      for (const err of result.errors) logger.error(`Prefix setup error: ${err}`)
      return false
    }
    if (result.dlls_installed.length > 0 && onLog) {
      onLog(`DLLs instaladas: ${result.dlls_installed.join(", ")}`)
    }
    return true
  } catch (error) {
    logger.warn("Failed to call Proton API for prefix setup", error)
    return false
  }
}
```

- ~30 linhas
- Só cria prefixo e instala DLLs
- Aceita callback `onLog` para progresso (sem depender de `sendInstallLog`)

---

### `runner.ts`

```typescript
import { Umu } from "@main/services"
import { logger } from "@main/services"

export async function runInstaller(
  filePath: string,
  winePrefixPath: string,
  protonPath?: string | null,
  gameId?: string
): Promise<boolean> {
  try {
    await Umu.launchInstaller(filePath, [], {
      gameId,
      winePrefixPath,
      protonPath,
    })
    return true
  } catch (err) {
    logger.error("[runInstaller] Launch failed", err)
    return false
  }
}

export async function runExecutable(
  filePath: string,
  winePrefixPath: string,
  protonPath?: string | null,
  gameId?: string
): Promise<boolean> {
  try {
    await Umu.launchExecutable(filePath, [], {
      gameId,
      winePrefixPath,
      protonPath,
    })
    return true
  } catch (err) {
    logger.error("[runExecutable] Launch failed", err)
    return false
  }
}
```

- Duas funções, ~15 linhas cada
- Só executam e aguardam
- Retornam boolean: true = executou e fechou, false = erro

---

### `source-resolver.ts`

```typescript
import path from "node:path"
import fs from "node:fs"
import { downloadsSublevel } from "@main/level"
import { getDownloadsPath } from "../events/helpers/get-downloads-path"

export async function getSourceFolder(
  gameKey?: string
): Promise<string | null> {
  if (!gameKey) return null
  const download = await downloadsSublevel.get(gameKey).catch(() => null)
  if (!download?.folderName) return null

  const gamePath = path.join(
    download.downloadPath ?? (await getDownloadsPath()),
    download.folderName
  )
  if (!fs.existsSync(gamePath) || !fs.lstatSync(gamePath).isDirectory()) {
    return null
  }
  return gamePath
}

export function getParentFolder(filePath: string): string {
  return path.dirname(filePath)
}
```

- ~25 linhas
- Só resolve caminhos
- `getParentFolder` existe para o caso de .exe único sem pasta de jogo

---

### `prefix-copier.ts`

```typescript
import fs from "node:fs"
import path from "node:path"
import { logger } from "@main/services"

export function copyFolderToPrefix(
  sourcePath: string,
  winePrefixPath: string
): string {
  const driveCPath = path.join(winePrefixPath, "drive_c")
  const folderName = path.basename(sourcePath)
  const destPath = path.join(driveCPath, folderName)

  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true })
  }
  fs.cpSync(sourcePath, destPath, { recursive: true, force: true })

  const sourceStats = getDirStats(sourcePath)
  const destStats = getDirStats(destPath)

  if (
    sourceStats.fileCount !== destStats.fileCount ||
    Math.abs(sourceStats.totalSize - destStats.totalSize) > 1024
  ) {
    logger.warn(
      `[copyFolderToPrefix] Copy verification mismatch: ` +
      `source ${sourceStats.fileCount} files / ${sourceStats.totalSize} bytes, ` +
      `dest ${destStats.fileCount} files / ${destStats.totalSize} bytes`
    )
  }

  return destPath
}

function getDirStats(dirPath: string): { totalSize: number; fileCount: number } {
  let totalSize = 0
  let fileCount = 0
  try {
    const walk = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true })
      for (const item of items) {
        const full = path.join(dir, item.name)
        if (item.isDirectory()) { walk(full) }
        else if (item.isFile()) {
          try {
            totalSize += fs.statSync(full).size
            fileCount++
          } catch { /* skip */ }
        }
      }    }
    walk(dirPath)
  } catch { /* skip */ }
  return { totalSize, fileCount }
}
```

- ~55 linhas
- Copia, verifica integridade, retorna caminho destino
- `getDirStats` é função interna (ninguém mais usa)

---

### `prefix-scanner.ts`

```typescript
import { findGameExecutables } from "@main/helpers/find-game-exe"
import type { FolderScanResult } from "./types"

export function scanPrefixForExes(
  winePrefixPath: string
): FolderScanResult {
  const scan = findGameExecutables(winePrefixPath)

  if (scan.candidates.length > 0) {
    return {
      candidates: scan.candidates.map((c) => ({
        path: c.path,
        name: c.name,
        size: c.size,
      })),
      suggestedDir: scan.suggestedDir,
    }
  }

  const driveCPath = winePrefixPath + "/drive_c"
  return {
    candidates: [],
    suggestedDir: driveCPath,
  }
}
```

- ~25 linhas
- Delega para `findGameExecutables` (helper existente, não mexer)
- Só formata resultado

---

### `candidate-formatter.ts`

```typescript
import path from "node:path"
import type { SnapshotEntry, InstallCandidate } from "./types"

export function formatCandidates(
  newExes: SnapshotEntry[],
  driveCPath: string
): { candidates: InstallCandidate[]; suggestedDir: string } {
  const candidates: InstallCandidate[] = newExes.map((e) => ({
    path: path.join(driveCPath, e.path),
    name: path.basename(e.path),
    size: e.size,
  }))

  const suggestedDir = path.dirname(candidates[0].path)

  return { candidates, suggestedDir }
}
```

- ~15 linhas
- Função pura de formatação

---

### `orchestrator.ts`

```typescript
import path from "node:path"
import { setupPrefix } from "./prefix-setup"
import { takeSnapshot } from "./snapshot"
import { runInstaller } from "./runner"
import { findNewExecutables } from "./change-detector"
import { getSourceFolder, getParentFolder } from "./source-resolver"
import { copyFolderToPrefix } from "./prefix-copier"
import { scanPrefixForExes } from "./prefix-scanner"
import { formatCandidates } from "./candidate-formatter"
import type { InstallOptions, InstallResult } from "./types"
import { logger } from "@main/services"

export async function installAndScan(
  filePath: string,
  options: InstallOptions
): Promise<InstallResult> {
  const { gameId, protonPath } = options
  const winePrefixPath = options.winePrefixPath
  if (!winePrefixPath) {
    return { wasOpened: true, candidates: [], suggestedDir: null }
  }

  const driveCPath = path.join(winePrefixPath, "drive_c")

  // 1. Setup prefixo + DLLs
  if (gameId && protonPath) {
    await setupPrefix(gameId, protonPath, winePrefixPath)
  }

  // 2. Snapshot ANTES
  logger.info(`[orchestrator] Snapshot before`)
  const before = takeSnapshot(driveCPath)

  // 3. Executa o instalador/jogo e aguarda fechar
  logger.info(`[orchestrator] Running installer: ${path.basename(filePath)}`)
  const ran = await runInstaller(filePath, winePrefixPath, protonPath, gameId)
  if (!ran) {
    return { wasOpened: true, candidates: [], suggestedDir: null }
  }

  // 4. Snapshot DEPOIS + compara
  logger.info(`[orchestrator] Snapshot after, comparing...`)
  const after = takeSnapshot(driveCPath)
  const newExes = findNewExecutables(before, after)

  // 5. Achou .exe no prefixo → retorna
  if (newExes.length > 0) {
    logger.info(`[orchestrator] Found ${newExes.length} new exe(s) in prefix`)
    const result = formatCandidates(newExes, driveCPath)
    return { wasOpened: true, ...result }
  }

  // 6. Não achou → descobre pasta de origem do jogo
  logger.info(`[orchestrator] No new exe found, resolving source folder...`)
  const sourcePath =
    (await getSourceFolder(options.gameKey)) ?? getParentFolder(filePath)

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return {
      wasOpened: true,
      candidates: [],
      suggestedDir: driveCPath,
    }
  }

  // 7. Copia pasta do jogo pro prefixo
  logger.info(`[orchestrator] Copying "${sourcePath}" to prefix...`)
  copyFolderToPrefix(sourcePath, winePrefixPath)

  // 8. Escaneia dentro do prefixo
  logger.info(`[orchestrator] Scanning prefix for exes...`)
  const scanResult = scanPrefixForExes(winePrefixPath)

  if (scanResult.candidates.length > 0) {
    logger.info(`[orchestrator] Found ${scanResult.candidates.length} exe(s) after copy`)
    return { wasOpened: true, ...scanResult }
  }

  // 9. Nada encontrado
  return {
    wasOpened: true,
    candidates: [],
    suggestedDir: driveCPath,
  }
}
```

- ~65 linhas
- Cada etapa é uma chamada de função
- Nenhuma etapa tem mais de 3 linhas de lógica própria
- Legível de cima pra baixo: setup → before → run → after → compare → found? OK. Não found? resolve → copia → scan → found? OK. Não? drive_c.

---

## RENDERIZADOR: LÓGICA PURA

### `src/renderer/src/pages/downloads/install-flow.ts`

**Responsabilidade:** Toda lógica de instalação do lado do renderizador.
Sem JSX, sem CSS. Só funções e estados.

```typescript
import type { InstallCandidate, GameShop } from "@types"
import type { ProtonVersion, ProtonFork } from "@types"

// Estados da instalação
export interface InstallFlowState {
  // Modais
  showRecommendationModal: boolean
  showScanningModal: boolean
  showCopyingModal: boolean
  showCandidateModal: boolean
  showInstallSuccessModal: boolean

  // Dados
  installedProtons: ProtonVersion[]
  candidates: InstallCandidate[]
  progress: { status: string; percent: number; gameTitle?: string } | null

  // Controle de fluxo
  wasOpened: boolean        // ← ESSENCIAL: false = precisa executar primeiro
  suggestedDir: string | null
  pendingRef: [GameShop, string] | null
}

// Abre o instalador (chamado pelo onClick do botão "Instalar")
export async function openInstaller(
  shop: GameShop,
  objectId: string,
  state: InstallFlowState,
  setState: (s: InstallFlowState) => void
): Promise<void> {
  const versions = await window.electron.getInstalledProtonVersions()
  if (!versions || versions.length === 0) {
    navigate("/proton-tools")  // redireciona
    return
  }
  setState({ ...state, installedProtons: versions, showRecommendationModal: true })
}

// Usuário selecionou um Proton
export async function selectProton(
  protonPath: string,
  state: InstallFlowState,
  setState: (s: InstallFlowState) => void
): Promise<void> {
  const [shop, objectId] = state.pendingRef!
  await window.electron.selectGameProtonPath(shop, objectId, protonPath)
  
  setState({ ...state, showRecommendationModal: false, showScanningModal: true })
  
  const result = await window.electron.openGameInstaller(shop, objectId, protonPath)
  
  // Resultado veio: fecha modal de scanning
  setState({ ...state, showScanningModal: false, showCopyingModal: false })
  
  if (result.wasOpened === false && result.candidates.length > 0) {
    // ─── PASTA SEM INSTALADOR ───
    // Usuário precisa ESCOLHER qual .exe executar primeiro
    // Só mostra candidatos, não salva ainda
    setState({
      ...state,
      wasOpened: false,
      candidates: result.candidates,
      showCandidateModal: true,
      suggestedDir: null,  // só vai ter suggestedDir DEPOIS do scan
    })
  } else if (result.candidates.length > 0) {
    // ─── INSTALADOR OU .exe ÚNICO JÁ ESCANEADO ───
    // Candidates já são do PREFIXO (escaneados)
    setState({
      ...state,
      wasOpened: true,
      candidates: result.candidates,
      showCandidateModal: true,
      suggestedDir: result.suggestedDir,
    })
  } else {
    // ─── NADA ENCONTRADO ───
    // Abre file picker no suggestedDir
    setState({ ...state, suggestedDir: result.suggestedDir })
    await handleBrowse(result.suggestedDir)
  }
}
```

**FLUXO COMPLETO do `selectProton`:**

```
selectProton(protonPath)
  │
  ├── window.electron.selectGameProtonPath()
  ├── window.electron.openGameInstaller()
  │
  ├── result.wasOpened === false AND candidates > 0?
  │     └── Mostra candidatos da PASTA (não salvou nada ainda)
  │         └── Usuário clica num candidato
  │               └── handleCandidatePicked(path)  ← NOVO!
  │                     ├── showScanningModal = true
  │                     ├── window.electron.installAndScan(path, options)
  │                     │     └── roda o .exe, escaneia, retorna
  │                     ├── showScanningModal = false
  │                     ├── candidates = resultado DO ESCANEAMENTO
  │                     └── showCandidateModal = true (AGORA SÃO DO PREFIXO)
  │                           └── Usuário seleciona → handleExePicked → SALVA
  │
  ├── result.wasOpened === true AND candidates > 0?
  │     └── Já são do PREFIXO → mostra direto
  │         └── Usuário seleciona → handleExePicked → SALVA
  │
  └── candidates === 0?
        └── Abre file picker → seleciona → SALVA
```

---

### `use-install-flow.ts` (Hook React)

```typescript
import { useState, useRef, useCallback } from "react"
import type { GameShop, ProtonFork, ProtonVersion } from "@types"
import type { InstallCandidate } from "@main/install-flow/types"

export function useInstallFlow() {
  const [showRecommendationModal, setShowRecommendationModal] = useState(false)
  const [showScanningModal, setShowScanningModal] = useState(false)
  const [showCopyingModal, setShowCopyingModal] = useState(false)
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const [showInstallSuccessModal, setShowInstallSuccessModal] = useState(false)
  const [installedProtons, setInstalledProtons] = useState<ProtonVersion[]>([])
  const [candidates, setCandidates] = useState<InstallCandidate[]>([])
  const [progress, setProgress] = useState<...>(null)
  const [wasOpened, setWasOpened] = useState<boolean>(true)
  const suggestedDirRef = useRef<string | null>(null)
  const pendingRef = useRef<[GameShop, string] | null>(null)
  const pendingGameRef = useRef<[GameShop, string] | null>(null)

  const handleOpenInstaller = useCallback(async (shop, objectId) => {
    const versions = await window.electron.getInstalledProtonVersions()
    if (!versions || versions.length === 0) return navigate("/proton-tools")
    pendingRef.current = [shop, objectId]
    setInstalledProtons(versions)
    setShowRecommendationModal(true)
  }, [])

  const handleSelectProton = useCallback(async (protonPath) => {
    const [shop, objectId] = pendingRef.current!
    setShowRecommendationModal(false)
    await window.electron.selectGameProtonPath(shop, objectId, protonPath)

    setShowScanningModal(true)
    const result = await window.electron.openGameInstaller(shop, objectId, protonPath)
    setShowScanningModal(false)

    // wasOpened=false + candidates → USUÁRIO PRECISA ESCOLHER O QUE EXECUTAR
    if (!result.wasOpened && result.candidates.length > 0) {
      setWasOpened(false)
      setCandidates(result.candidates)
      setShowCandidateModal(true)
      return
    }

    // wasOpened=true + candidates → JÁ SÃO RESULTADO DO ESCANEAMENTO
    if (result.candidates.length > 0) {
      setWasOpened(true)
      setCandidates(result.candidates)
      suggestedDirRef.current = result.suggestedDir
      setShowCandidateModal(true)
      return
    }

    // candidates vazio → file picker
    suggestedDirRef.current = result.suggestedDir
    await handleBrowse()
  }, [])

  // NOVO: usuário escolheu um .exe da pasta → agora EXECUTA + ESCANEIA
  const handleCandidatePicked = useCallback(async (path: string) => {
    setShowCandidateModal(false)
    setShowScanningModal(true)
    const [shop, objectId] = pendingRef.current!
    
    const result = await window.electron.installAndScan(path, {
      gameId: objectId,
      winePrefixPath: ...,    // precisa do prefixo do jogo
      protonPath: ...,        // precisa do proton selecionado
    })

    setShowScanningModal(false)
    setWasOpened(true)

    // Mostra RESULTADO DO ESCANEAMENTO (não os arquivos da pasta)
    if (result.candidates.length > 0) {
      setCandidates(result.candidates)
      suggestedDirRef.current = result.suggestedDir
      setShowCandidateModal(true)
    } else {
      suggestedDirRef.current = result.suggestedDir
      await handleBrowse()
    }
  }, [])

  // FINAL: usuário escolheu o .exe certo → SALVA
  const handleExePicked = useCallback(async (path: string) => {
    setShowCandidateModal(false)
    const [shop, objectId] = pendingGameRef.current!
    pendingGameRef.current = null
    await window.electron.setGameExecutablePath(shop, objectId, path)
    setShowInstallSuccessModal(true)
  }, [])

  // "Busque manual" → abre file picker
  const handleBrowse = useCallback(async (dirOverride?: string) => {
    const path = await window.electron.openExeFilePicker(
      dirOverride ?? suggestedDirRef.current ?? undefined
    )
    if (path) await handleExePicked(path)
  }, [])

  return {
    // Estados
    showRecommendationModal, showScanningModal, showCopyingModal,
    showCandidateModal, showInstallSuccessModal,
    installedProtons, candidates, progress, wasOpened,
    // Ações
    handleOpenInstaller, handleSelectProton, handleCandidatePicked,
    handleExePicked, handleBrowse,
  }
}
```

---

## PRELOAD BRIDGE

O preload precisa expor o novo evento `installAndScan`:

### `src/preload/app.ts`

```typescript
// NOVO:
installAndScan: (filePath: string, options: InstallOptions) =>
  ipcRenderer.invoke("installAndScan", filePath, options),
```

### `src/main/events/library/install-and-scan.ts` (NOVO ARQUIVO)

```typescript
import { registerEvent } from "../register-event"
import { installAndScan } from "../../install-flow/orchestrator"
import type { InstallOptions } from "../../install-flow/types"

registerEvent(
  "installAndScan",
  async (
    _event: Electron.IpcMainInvokeEvent,
    filePath: string,
    options: InstallOptions
  ) => {
    return await installAndScan(filePath, options)
  }
)
```

- ~10 linhas
- Só registra o evento IPC e delega

---

## RESUMO: O QUE MUDA EM CADA ARQUIVO EXISTENTE

| Arquivo | Tamanho atual | Tamanho novo | Mudança |
|---------|:---:|:---:|---------|
| `open-game-installer.ts` | ~350 linhas | ~50 linhas | Só orquestra, delega para `installAndScan` |
| `install-game-folder.ts` | ~430 linhas | ~60 linhas | Reusa `installAndScan` |
| `downloads.tsx` | ~440 linhas | ~200 linhas | Lógica vai pro hook |
| | | | |
| **NOVOS** | | | |
| `install-flow/types.ts` | — | ~30 linhas | Tipos compartilhados |
| `install-flow/snapshot.ts` | — | ~30 linhas | takeSnapshot() |
| `install-flow/prefix-setup.ts` | — | ~30 linhas | setupPrefix() |
| `install-flow/runner.ts` | — | ~30 linhas | runInstaller/runExecutable |
| `install-flow/change-detector.ts` | — | ~45 linhas | hasMeaningfulChanges + findNewExes |
| `install-flow/source-resolver.ts` | — | ~25 linhas | getSourceFolder |
| `install-flow/prefix-copier.ts` | — | ~55 linhas | copyFolderToPrefix |
| `install-flow/prefix-scanner.ts` | — | ~25 linhas | scanPrefixForExes |
| `install-flow/candidate-formatter.ts` | — | ~15 linhas | formatCandidates |
| `install-flow/orchestrator.ts` | — | ~65 linhas | installAndScan (junta tudo) |
| `events/library/install-and-scan.ts` | — | ~10 linhas | Evento IPC |
| `renderer/install-flow.ts` | — | ~120 linhas | Lógica pura do renderer |
| `renderer/hooks/use-install-flow.ts` | — | ~120 linhas | Hook React |

**Total de linhas novas:** ~600
**Total removido dos arquivos antigos:** ~500
**Saldo:** ~100 linhas a mais, mas cada arquivo tem RESPONSABILIDADE ÚNICA.

---

## COMO TESTAR (passo a passo)

### 1. Typecheck
```bash
npm run typecheck:node    # main process
npm run typecheck:web     # renderer
```

### 2. Compilar
```bash
npm run build
```

### 3. Rodar em modo dev (com logs)
```bash
npm run dev 2>&1 | tee /tmp/protonforge.log
```

### 4. Ver logs de cada etapa
Cada arquivo loga sua ação com prefixo:
```
[orchestrator] Snapshot before
[orchestrator] Running installer: setup.exe
[orchestrator] Snapshot after, comparing...
[orchestrator] Found 3 new exe(s) in prefix
[orchestrator] No new exe found, resolving source folder...
[orchestrator] Copying "/path/to/game" to prefix...
[orchestrator] Scanning prefix for exes...
[orchestrator] Found 2 exe(s) after copy
```

### 5. Verificar candidatos no modal
O modal `ExecutableCandidateModal` mostra:
- Nome do .exe
- Caminho relativo ao prefixo
- Tamanho
- Ordenado por data de modificação (mais recente primeiro)

### 6. Verificar "Busque manual"
O file picker abre no `suggestedDir`. Para confirmar:
```typescript
console.log("suggestedDir:", suggestedDirRef.current)
// Deve ser: .../pfx/drive_c/Program Files/Genshin Impact/
// Ou: .../pfx/drive_c/Black Fetal Movement/
// Ou: .../pfx/drive_c/ (se nada encontrado)
```

---

## RESTAURAÇÃO (voltar ao original)

Se precisar voltar ao estado original do código:

```bash
cd /home/cas/Documentos/protonforgerfull
git checkout -- src/main/events/library/open-game-installer.ts
git checkout -- src/main/events/library/install-game-folder.ts
git checkout -- src/renderer/src/pages/downloads/downloads.tsx
git checkout -- src/main/services/proton/extractor.ts
git checkout -- src/main/services/proton/index.ts
git checkout -- src/main/services/proton/manager.ts
git checkout -- src/main/events/proton/install-game-with-proton.ts
```

Isso reverte todas as correções que eu fiz (incluindo as erradas).

Os novos arquivos em `src/main/install-flow/` e `src/renderer/.../hooks/` e
`src/renderer/.../install-flow.ts` não existiam antes, então `git checkout`
não afeta eles.

Para remover os novos arquivos e voltar ao estado original COMPLETO:
```bash
git clean -fd
```

---

## INDEX

```
src/main/install-flow/
├── types.ts                  Tipos: SnapshotEntry, InstallCandidate,
│                             InstallResult, InstallOptions, FolderScanResult
│
├── snapshot.ts               takeSnapshot(driveCPath) → SnapshotEntry[]
│
├── change-detector.ts        hasMeaningfulChanges(before, after) → boolean
│                             findNewExecutables(before, after) → SnapshotEntry[]
│
├── prefix-setup.ts           setupPrefix(gameId, protonPath, winePrefixPath)
│                             → Promise<boolean>
│
├── runner.ts                 runInstaller(filePath, winePrefix, proton, gameId)
│                             runExecutable(filePath, winePrefix, proton, gameId)
│                             → Promise<boolean>
│
├── source-resolver.ts        getSourceFolder(gameKey) → Promise<string | null>
│                             getParentFolder(filePath) → string
│
├── prefix-copier.ts          copyFolderToPrefix(sourcePath, winePrefixPath)
│                             → string (destPath)
│
├── prefix-scanner.ts         scanPrefixForExes(winePrefixPath)
│                             → FolderScanResult
│
├── candidate-formatter.ts    formatCandidates(newExes, driveCPath)
│                             → { candidates, suggestedDir }
│
└── orchestrator.ts           installAndScan(filePath, options)
                              → Promise<InstallResult>
```

Cada arquivo pode ser lido de forma independente. As únicas dependências
entre eles são via TYPE (tipos) → o arquivo importa o tipo e a função
do arquivo que precisa. Sem dependência circular, sem função de 100
linhas, sem "essa função faz 8 coisas".

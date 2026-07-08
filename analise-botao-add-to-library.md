# Análise: Botão "Adicionar à Biblioteca" — Catálogo

## Estrutura dos projetos

### Old Project (`/home/cas/Desktop/protonforgerfull`)
- Catalogue: `src/renderer/src/pages/catalogue/game-item.tsx`
- Games page: `src/renderer/src/pages/games/games.tsx` (próprio componente, inline no código)
- Store: LevelDB (vários arquivos em `src/main/level/`)
- IPC handlers: `src/main/events/library/`
- `useGames` hook: `src/renderer/src/pages/games/hooks/use-games.ts`
- `gamesService.getAll()`: `src/renderer/src/pages/games/services/games-service.ts`

### Current App (`/home/cas/Documentos/Makai-forge`)
- Catalogue: `src/renderer/src/pages/catalogue/components/game-item.tsx`
- Games page: **`@provision/Games`** (`data/install-api/Games/index.tsx`) — componente externo
- Store: SQLite (`src/main/services/sqlite-store.ts`)
- IPC handlers: `src/main/events/library/` (mesmo path)
- `useGames` hook: `src/renderer/src/pages/games/hooks/use-games.ts` (mesmo path)
- `gamesService.getAll()`: `data/install-api/AddGame/games-service.ts`

---

## Fluxo do clique no botão "+" (catálogo)

### 1. Componente: `game-item.tsx`

**Old** (`protonforgerfull/src/renderer/src/pages/catalogue/game-item.tsx:46-63`):
```ts
const addGameToLibrary = async () => {
  if (added || isAddingToLibrary) return;
  setIsAddingToLibrary(true);
  try {
    await window.electron.addGameToLibrary(game.shop, game.objectId, game.title);
    updateLibrary();
  } catch (error) {
    console.error(error);
  } finally {
    setIsAddingToLibrary(false);
  }
};
```

**Current** (`Makai-forge/src/renderer/src/pages/catalogue/components/game-item.tsx:57-73`):
```ts
const addGameToLibrary = async () => {
  if (added || isAddingToLibrary) return;
  setIsAddingToLibrary(true);
  try {
    await window.electron.addGameToLibrary(game.shop, game.objectId, game.title);
    updateLibrary();
  } catch (error) {
    console.error(error);
  } finally {
    setIsAddingToLibrary(false);
  }
};
```

**IDÊNTICO.** Mesma função, mesmos parâmetros, mesmo `updateLibrary()`.

### 2. IPC: `addGameToLibrary`

**Old** (`add-game-to-library.ts:12-56`):
- LevelDB: `gamesSublevel.get(gameKey)` → retorna `undefined` se não existe
- Salva com `gamesSublevel.put(gameKey, game)` 
- Objeto salvo: `{ title, iconUrl, libraryHeroImageUrl, logoImageUrl, objectId, shop, remoteId: null, isDeleted: false, playTimeInMilliseconds: 0, lastTimePlayed: null }`

**Current** (`add-game-to-library.ts:12-71`):
- SQLite: `gamesStore.get(gameKey).catch(() => null)` → retorna `null` se não existe
- Salva com `gamesStore.put(gameKey, game)`
- Objeto salvo: **MESMA ESTRUTURA**

**IDÊNTICO** (exceto `.catch(() => null)` vs LevelDB nativo).

### 3. IPC: `getLibrary`

**Old** (`get-library.ts:13-77`):
- LevelDB: `gamesSublevel.iterator().all()` → itera todas as entradas
- Para cada uma: `downloadsSublevel.get(key)` e `gamesShopAssetsSublevel.get(key)` (sem `.catch()` — LevelDB retorna `undefined`)
- Retorna `LibraryGame[]`

**Current** (`get-library.ts:13-88`):
- SQLite: `gamesStore.iterator().all()` → itera todas as entradas
- Para cada uma: `downloadsStore.get(key).catch(() => null)` e `gamesShopAssetsStore.get(key).catch(() => null)`
- Retorna `LibraryGame[]`

**IDÊNTICO** (exceto `.catch()`).

### 4. Redux: `updateLibrary()`

**Ambos** (`use-library.ts`):
```ts
const updateLibrary = useCallback(async () => {
  return window.electron.getLibrary()
    .then((updatedLibrary) => dispatch(setLibrary(updatedLibrary)));
}, [dispatch]);
```

**IDÊNTICO.**

### 5. `gamesService.getAll()`

**Old** (`games-service.ts:80-101`):
```ts
async getAll(): Promise<GameConfig[]> {
  const library = await window.electron.getLibrary();
  return library.map((g: any) => ({
    ...g,
    isDeleted: g.isDeleted || false,
    favorite: g.favorite || false,
    runner: (["proton", "wine", "steam"] as const).includes(g.runner)
      ? g.runner : "proton",
    slug: (g.title || "").toLowerCase()...,
  })) as GameConfig[];
}
```

**Current** (`games-service.ts:79-101`):
```ts
async getAll(): Promise<GameConfig[]> {
  const library = await window.electron.getLibrary();
  return library.map((g: any) => ({
    ...g,
    isDeleted: g.isDeleted || false,
    favorite: g.favorite || false,
    runner: (["proton", "wine", "steam"] as const).includes(g.runner)
      ? g.runner : "proton",
    slug: (g.title || "").toLowerCase()...,
  })) as GameConfig[];
}
```

**IDÊNTICO.**

### 6. `useGames()` hook

**Old** (`use-games.ts:60-77`):
```ts
const loadGames = useCallback(async () => {
  const loadedGames = await gamesService.getAll();
  setGames(loadedGames);
}, []);
```

**Current** (`use-games.ts:60-77`):
```ts
const loadGames = useCallback(async () => {
  const loadedGames = await gamesService.getAll();
  setGames(loadedGames);
}, []);
```

**IDÊNTICO.**

---

## ONDE ESTÁ O BUG — DIFERENÇA CRÍTICA

### Old Project: Games Page (`games.tsx`)

**Linha 511-514** — Filtragem de jogos locais:
```ts
const localGames = sortedGames.filter(
  (g) => g.shop !== "steam" && ...
);
```

**Linhas 719-834** — Renderiza `localGames.map(...)`

**Linha 138-162** — `filteredGames` = TODOS os jogos da biblioteca via `useGames()`

A Games page do OLD project mostrava TODOS os jogos retornados por `useGames()`. A seção "Biblioteca Local" exibia `localGames.filter(g.shop !== "steam")`, enquanto jogos Steam apareciam na seção "Steam" que também vinha do `useGames()`.

MAS: no old project, a seção Steam era populada por `gamesService.getAll()` — ou seja, os jogos Steam TAMBÉM vinham da library (do `getLibrary()`), e a filtragem era por `runner === "steam"`.

### Current App: Games Page (`@provision/Games`)

**`useGamesDerivedData.ts:80-81`**:
```ts
const localGames = sortedGames.filter(
  (g) => g.shop !== "steam" && (showAllGames || modCompatibleNames.has(...))
);
```

**`useGamesDerivedData.ts:62-77`** — `filteredSteam`:
```ts
const filteredSteam = sortGames(
  steamGames.filter(...),  // steamGames = SteamInstalledGame[] (jogos INSTALADOS)
  (g) => g.name, sortBy
);
```

**DIFFERENÇA FUNDAMENTAL:**

No **current app**, `filteredSteam` NÃO vem do `gamesService.getAll()` / `getLibrary()`.
Ele vem de `useSteamState().steamGames` — que são `SteamInstalledGame[]`, populados por `syncSteamLibrary()` (jogos Steam INSTALADOS no disco).

Já `localGames` FILTRA `g.shop !== "steam"` — removendo qualquer jogo com `shop === "steam"`.

### CONSEQUÊNCIA:

**Quando um jogo Steam é adicionado do catálogo:**
1. `addGameToLibrary("steam", "730", "CS:GO")` → salva na `gamesStore` com key `"steam:730"`, `shop: "steam"`
2. `gamesService.getAll()` → retorna `GameConfig` com `shop: "steam"`, `runner: "proton"` (fallback, pois `Game` não tem `runner`)
3. `useGamesDerivedData`:
   - `filteredSteam`: vem de `steamGames` (Steam instalados) → NÃO inclui o jogo recém-adicionado
   - `localGames`: `g.shop !== "steam"` → FALSE → **EXCLUÍDO**
4. **RESULTADO: O jogo não aparece em LUGAR NENHUM na aba Games!**

### POR QUE FUNCIONAVA NO OLD PROJECT:

O old project também separava `localGames` com `g.shop !== "steam"`, MAS a seção "Steam" também vinha do `getLibrary()`. Jogos com `shop: "steam"` apareciam na seção Steam porque vinham da MESMA fonte de dados.

No current app, jogos Steam NÃO vêm do `getLibrary()` — vêm de `syncSteamLibrary()` que só encontra jogos INSTALADOS no disco.

---

## BUG DO CSS — BOTÃO BRANCO

### Old project (`game-item.scss:59`):
```scss
&__plus-wrapper {
    color: rgba(255, 255, 255, 0.7);  // BRANCO INTENCIONAL
}
```

### Current app (`_game-item-layout.scss:56`):
```scss
&__plus-wrapper {
    color: #5865f2;   // AZUL hardcoded
}
```

O CSS atual já tem `color: #5865f2` com `svg, svg path` com `fill: #5865f2`. O bundler compila corretamente — as regras estão no `index-BR-GqDbz.css`.

Provável causa: o usuário não rebuildou (ou usou `npm run dev` em vez de `npm run build`). A cor azul deve aparecer após rebuild.

---

## O QUE PRECISA SER CORRIGIDO

### Bug 1: Jogos Steam invisíveis na aba Games

**Causa:** `useGamesDerivedData.ts:81` filtra `g.shop !== "steam"`, e `filteredSteam` só vem de Steam instalados.

**Solução:** Em `useGamesDerivedData.ts`, incluir jogos da library com `shop === "steam"` em `filteredSteam`, ou remover o filtro `g.shop !== "steam"` de `localGames` e criar uma seção "Steam" que inclua jogos da library.

**Sugestão 1 (simples):** Remover `g.shop !== "steam"` do `localGames` — jogos Steam adicionados via catálogo aparecerão como "Local" com `runner: "proton"`.

**Sugestão 2 (correta):** Criar `librarySteamGames` no `useGamesDerivedData` que filtra `g.shop === "steam"` de `filteredGames` e inclui em `filteredSteam` ou mostra como seção separada.

### Bug 2: Cor do botão

**Causa:** Pode ser cache, rebuild necessário, ou usar `npm run dev`.

**Solução:** Confirmar rebuild. Se persistir, a regra CSS já está correta (`#5865f2`).

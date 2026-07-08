# ADMIN: Integração da API Python + Restauração de Stubs

## Contexto

O projeto tem **duas APIs** que foram confundidas:

| API | Tipo | O que faz | Status |
|-----|------|-----------|--------|
| `protonforge-api/` (Python) | JSON-RPC stdin/stdout | Recomendação Proton, prefixos Wine, DLLs, launch args | ✅ Completa em bbb/, ❌ **FALTA** no atual |
| `ProtonApi`/`ProtonForgeApi` (TypeScript) | HTTP REST stub | Placeholder para backend remoto (game stats, cloud sync, checkout, decky) | ❌ `ProtonApi` foi **esvaziada** (2 linhas), `ProtonForgeApi` intacta |

---

## Fase A — Copiar protonforge-api/ Python (a sua API de verdade)

### A.1 Copiar diretório

De: `/home/cas/Documentos/bbb/protonforgerfull/protonforge-api/`
Para: `/home/cas/Documentos/protonforgerfull/protonforge-api/`

Excluir `__pycache__/`, `*.pyc`, `*.egg-info`.

```
protonforge-api/
├── server.py              ← Entry point stdio JSON-RPC
├── requirements.txt       ← Zero dependências externas (só stdlib)
├── README.md
├── api/
│   ├── __init__.py
│   ├── handler.py         ← Dispatcher: 10 métodos RPC
│   ├── services/
│   │   ├── recommendation/core.py   ← Motor de recomendação
│   │   ├── recommendation/matching.py
│   │   ├── recommendation/options.py
│   │   ├── prefix/core.py           ← Criação/config Wine prefix
│   │   ├── prefix/winetricks.py
│   │   ├── dlls.py                  ← Catálogo DLLs
│   │   ├── proton_versions.py       ← Detecção Protons instalados
│   │   ├── launch_args/core.py      ← Montagem launch command
│   │   ├── launch_args/catalog.py
│   │   ├── anticheat.py             ← Anti-cheat detection
│   │   ├── catalog.py               ← Catálogo SQLite
│   │   ├── compatflow_bridge.py     ← Bridge CompatFlow
│   │   ├── data.py                  ← Dados da API
│   │   └── gacha.py                 ← (não usado)
│   └── db/
│       └── connection.py            ← SQLite connection
├── scripts/
│   └── migrate_to_sqlite.py
└── tests/
    ├── test_recommendation.py
    └── test_prefix.py
```

**Total: ~30 arquivos Python, zero dependências externas.**

### A.2 Fix `proton-recommendation.ts` paths

Arquivo: `src/main/services/proton-recommendation.ts`

| Linha | Atual (quebrado) | Correto |
|-------|-------------------|---------|
| 38 | `"tools/venv/bin/python3"` | Manter (venv está em tools/venv/) |
| 42 | `"tools/python-rpc/protonforge-api/server.py"` | `"protonforge-api/server.py"` |

O resto do arquivo já está correto: chama `recommend_proton`, `create_prefix`, `get_recommended_dlls`, `get_launch_command`, `analyze_exe`, `check_anticheat`, `list_available_forks`.

---

## Fase B — Restaurar classes Stub

### B.1 Restaurar `forger-api.ts` (ProtonApi)

**Antes** (atual — 2 linhas, esvaziado):
```ts
export class ProtonApi {
}
```

**Depois** (restaurado do HydraApi original, renomeado):
```ts
import { db } from "@main/level";
import { levelKeys } from "@main/level/sublevels";

export interface ProtonApiOptions {
  needsAuth?: boolean;
  needsSubscription?: boolean;
  ifModifiedSince?: Date;
}

export class ProtonApi {
  public static isLoggedIn() { return false; }
  public static hasActiveSubscription() { return false; }
  static async setupApi() { ... }
  static handleExternalAuth(_uri: string) {}
  static handleSignOut() {}
  static async refreshToken() { return { accessToken: "" }; }
  static async checkDownloadSourcesChanges(...) { return []; }
  static async get<T>(...) { return null; }
  static async post<T>(...) { return null; }
  static async put<T>(...) { return null; }
  static async patch<T>(...) { return null; }
  static async delete<T>(...) { return null; }
}
```

A classe **continua retornando null** — é um placeholder até o backend remoto ficar pronto. Mas pelo menos os métodos existem para o código que os chama poder compilar.

### B.2 Manter `protonforge-api.ts` (ProtonForgeApi)

Já está intacto (53 linhas, stub completo). Nada a fazer.

---

## Fase C — Restaurar chamadas de API nos eventos

### C.1 `get-game-stats.ts` (`src/main/events/catalogue/`)

**Arquivo atual**: 30 linhas, `return null` onde antes chamava a API.

**Restaurar**: Adicionar import de `ProtonApi`, chamar `ProtonApi.get('/games/${shop}/${objectId}/stats')` com cache de 30min.

**Antes** (atual):
```ts
return null;
```

**Depois**:
```ts
import { ProtonApi } from "@main/services";

// ... dentro da função, após verificar cache:
return ProtonApi.get<GameStatsResult>(`/games/${shop}/${objectId}/stats`, null, {
  needsAuth: false,
}).then(async (data) => {
  if (!data) return data;
  await gamesStatsCacheSublevel.put(levelKeys.game(shop, objectId), {
    ...data,
    updatedAt: Date.now(),
  });
  return data;
});
```

### C.2 `cloud-sync.ts` (`src/main/services/`)

**Arquivo atual**: 141 linhas — `uploadSaveGame` faz backup, envia evento de sucesso, deleta tar, mas **não faz upload real**.

**Restaurar**: Adicionar import de `ProtonApi` + `axios`, chamar `ProtonApi.post('/profile/games/artifacts', ...)` para obter `uploadUrl`, depois fazer `axios.put(uploadUrl, fileBuffer)`.

### C.3 `open-checkout.ts` (`src/main/events/misc/`)

**Arquivo atual**: Passa `auth.refreshToken` diretamente como `token` na URL.

**Restaurar**: Obter `paymentToken` via `ProtonApi.post('/auth/payment', { refreshToken })` antes de abrir o checkout.

### C.4 `get-forger-decky-plugin-info.ts` (`src/main/events/misc/`)

**Arquivo atual**: `expectedVersion: null` fixo, `outdated: false`.

**Restaurar**: Adicionar `ProtonApi.get<DeckyReleaseInfo>('/decky/release', {}, { needsAuth: false })` para obter `expectedVersion`.

---

## Fase D — Verificações

### D.1 Modularização

| Item | Status atual | Ação |
|------|-------------|------|
| `proton-recommendation-modal.scss` | ✅ Co-localizado com o componente | Nada |
| Barrels de services | ✅ `services/index.ts` exporta `ProtonApi` + `ProtonForgeApi` + `ProtonRecommendationService` | Verificar se nada quebrou |
| Python em diretório separado | ✅ `protonforge-api/` na raiz (mesmo padrão de `server/`) | Nada |
| `proton-recommendation.ts` | ✅ Arquivo único, bem modularizado | Só corrigir paths |

### D.2 Dependências

A API Python usa **zero dependências externas** (stdlib only: json, os, sys, subprocess, shutil, threading, sqlite3).

### D.3 Build / Typecheck

`npm run typecheck` e `npm run build` após cada fase.

---

## Fase E — Backups e Documentação

1. Backup antes de começar: `protonforgerfull.BACKUP-20260522-pre-api-integration.tar.gz`
2. Redmine: `docs/redmine/020-integracao-api-python.md`
3. Backup após aprovação visual
4. Atualizar `MODULARIZATION_PLAN.md`

---

## Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| `venv` Python não existe em `tools/venv/` | Média | `python-rpc.ts` já tem fallback para `PROTONFORGE_PYTHON_BIN` env var |
| `catalogo.db` está em `resources/database/` mas API espera `resources/` | Baixa | Verificar e criar symlink se necessário |
| Arquivo `gacha.py` não usado | Baixa | Ignorar (inerte) |
| ProtonApi stub continua retornando null | Certa (intencional) | Backend real não existe — é placeholder |

---

## Resumo das alterações

| Arquivo | Ação | Linhas |
|---------|------|--------|
| `protonforge-api/` (30+ arquivos) | **Copiar** de bbb/ | ~3000 linhas Python |
| `src/main/services/proton-recommendation.ts` | **Corrigir** 1 path (linha 42) | 1 linha |
| `src/main/services/forger-api.ts` | **Restaurar** classe (2→59 linhas) | +57 linhas |
| `src/main/events/catalogue/get-game-stats.ts` | **Restaurar** API call (30→54 linhas) | +24 linhas |
| `src/main/services/cloud-sync.ts` | **Restaurar** API call + upload (141→178 linhas) | +37 linhas |
| `src/main/events/misc/open-checkout.ts` | **Restaurar** paymentToken (24→29 linhas) | +5 linhas |
| `src/main/events/misc/get-forger-decky-plugin-info.ts` | **Restaurar** release check (70→95 linhas) | +25 linhas |
| `docs/ADMIN-PLAN-API-INTEGRATION.md` | **Criar** (este) | — |
| `docs/redmine/020-integracao-api-python.md` | **Criar** | — |
| `MODULARIZATION_PLAN.md` | **Atualizar** | — |

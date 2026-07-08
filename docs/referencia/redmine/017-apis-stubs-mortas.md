# Redmine 017 — APIs stub: `forger-api.ts` e `protonforge-api.ts`

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Documentar estado atual das APIs ProtonForge e ProtonForge |
| **Classificação** | 🟡 Documentação |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

### `src/main/services/forger-api.ts` (2 linhas)

```ts
export class ProtonForgeApi {
}
```

Classe **vazia** — é o placeholder para a **API do ProtonForge** (backend oficial do ProtonForge, repo `protonforge/protonforge-api`). A implementação real ainda não foi feita.

### `src/main/services/protonforge-api.ts` (53 linhas)

```ts
export class ProtonForgeApi {
  public static isLoggedIn() { return false; }
  public static hasActiveSubscription() { return false; }
  static async setupApi() {}
  static handleExternalAuth(_uri: string) {}
  static handleSignOut() {}
  static async refreshToken() { return { accessToken: "" }; }
  static async checkDownloadSourcesChanges(...) { return []; }
  static async get<T = any>(...) { return null; }
  static async post<T = any>(...) { return null; }
  // ... todos os métodos retornam null/false/[]
}
```

**Todos os métodos são stubs** — retornam valores hardcoded (null, false, []). Nenhuma implementação real.

### Quem importa?

| Importador | O que importa |
|------------|---------------|
| `services/index.ts` | `export * from "./forger-api"` |
| `services/index.ts` | `export * from "./protonforge-api"` |
| `events/misc/forger-api-call.ts` | Interface `ProtonForgeApiCallPayload` (definida localmente) + roteamento local |
| `events/misc/get-protonforge-decky-plugin-info.ts` | `ProtonForgeApi` |
| `services/download/protonforge-debrid.ts` | `ProtonForgeApi` |
| `events/misc/protonforge-api-call.ts` | `ProtonForgeApi` |

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Remover `forger-api.ts` | ❌ | **Manter** — é o placeholder da API ProtonForge, será implementado |
| Remover `protonforge-api.ts` | ❌ | **Manter** — 3 arquivos dependem dele mesmo que stub |
| Adicionar comentário explicativo | ✅ | Explicar que é stub e onde fica a implementação real |
| Nada | ✅ | Só documentar — não há ação de correção |

### Decisão

Ambos os arquivos são **placeholders intencionais** para APIs que ainda não foram implementadas. A `ProtonForgeApi` (forger-api) é a API do backend ProtonForge; `ProtonForgeApi` é a API do backend ProtonForge. Nenhum dos dois backend está pronto, então os stubs ficam até a implementação real.

## ⚠️ Riscos

Nenhum — só documentação. Sem alteração de código.

## 🔧 Procedimento

Nenhuma correção necessária. Apenas registro da situação.

## 🔄 Rollback

N/A

## ✅ Verificação

N/A — sem alterações.

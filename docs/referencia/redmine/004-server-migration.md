# Redmine 004 — Separação do Servidor Express para `server/`

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Fase do plano** | 3 |
| **Data** | 21/05/2026 |
| **Risco** | 🟡 Médio |

## 🎯 Objetivo

Separar o servidor Express do código Electron. O servidor web estava misturado dentro de `src/` junto com o Electron, causando confusão arquitetural. Agora está em `server/` na raiz, isolado.

## 📄 Estrutura antes

```
src/
├── server.cjs                         ← entry point Express
├── routes/                            ← rotas Express
│   ├── catalogue.cjs
│   ├── download-sources.cjs
│   └── games.cjs
├── services/                          ← serviços Express
│   ├── local-sources.cjs
│   ├── protondb.cjs
│   └── steam.cjs
├── main/                              ← código Electron (TypeScript)
├── renderer/
├── preload/
├── ...
```

## 📄 Estrutura depois

```
server/
├── server.cjs                         ← entry point Express
├── routes/
│   ├── catalogue.cjs
│   ├── download-sources.cjs
│   └── games.cjs
├── services/
│   ├── local-sources.cjs
│   ├── protondb.cjs
│   └── steam.cjs
src/
├── main/                              ← código Electron (TypeScript) — intacto
├── renderer/                          ← intacto
├── preload/                           ← intacto
├── ...
```

## 🔧 Mudanças realizadas

### 1. Criação da estrutura

```bash
mkdir -p server/routes server/services
```

### 2. Arquivos movidos

| Origem | Destino |
|--------|---------|
| `src/server.cjs` | `server/server.cjs` |
| `src/routes/catalogue.cjs` | `server/routes/catalogue.cjs` |
| `src/routes/download-sources.cjs` | `server/routes/download-sources.cjs` |
| `src/routes/games.cjs` | `server/routes/games.cjs` |
| `src/services/local-sources.cjs` | `server/services/local-sources.cjs` |
| `src/services/protondb.cjs` | `server/services/protondb.cjs` |
| `src/services/steam.cjs` | `server/services/steam.cjs` |

### 3. Caminhos de `require()` — NENHUMA alteração necessária

Os `require()` relativos entre `server.cjs`, `routes/` e `services/` permanecem idênticos porque a estrutura de diretórios é a mesma:

| Arquivo | Requer | Path (antes) | Path (depois) | Mudou? |
|---------|--------|-------------|--------------|--------|
| `server.cjs` | `routes/` | `./routes/...` | `./routes/...` | ❌ Não |
| `routes/*.cjs` | `services/` | `../services/...` | `../services/...` | ❌ Não |

### 4. Caminhos de `__dirname` — 2 alterações

Dois services usam `path.join(__dirname, "..", "cache")` para acessar `src/cache/`. Com a mudança para `server/services/`, o `__dirname` mudou:

**Antes** (resolvia de `src/services/`):
```
path.join(__dirname, "..", "cache") → src/cache ✅
```

**Depois** (resolvia de `server/services/`):
```
path.join(__dirname, "..", "cache") → server/cache ❌ (não existe)
```

**Correção aplicada** em ambos:
| Arquivo | Antes | Depois |
|---------|-------|--------|
| `server/services/protondb.cjs:6` | `path.join(__dirname, "..", "cache")` | `path.join(__dirname, "..", "..", "src", "cache")` |
| `server/services/steam.cjs:6` | `path.join(__dirname, "..", "cache")` | `path.join(__dirname, "..", "..", "src", "cache")` |

## 📝 Dependências externas

Verificou-se que os arquivos movidos **não são importados** por nenhum código do Electron:

```bash
# Busca por referências a src/server.cjs, src/services/*, src/routes/*
# Fora dos próprios arquivos → NENHUM resultado
```

O Electron tem seu próprio `local-sources-handler.ts` em `src/main/services/` — é uma implementação separada.

## 🚀 Como iniciar o servidor

```bash
node server/server.cjs
# ProtonForgerFull API rodando em http://localhost:3456
```

## 🔗 Arquivos relacionados

- `MODULARIZATION_PLAN.md` — Fase 3
- `server/server.cjs`
- `server/routes/`
- `server/services/`

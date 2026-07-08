# Redmine 003 — Migração de `scripts/games-data/` para `data/games-data/`

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Pasta origem** | `scripts/games-data/` |
| **Pasta destino** | `data/games-data/` |
| **Fase do plano** | 2.3 |
| **Data** | 21/05/2026 |
| **Risco** | 🟢 Baixo |

## 🎯 Objetivo

Mover a base de dados de jogos (12.200 JSONs, ~49 MB) de `scripts/` (que deve conter apenas código executável) para `data/` (local apropriado para dados).

## 📄 Estrutura antes

```
scripts/
├── games-data/          ← 12.200 JSONs (~49 MB) - LUGAR ERRADO
│   ├── 000x.json
│   ├── 006w.json
│   ├── ...
├── helpers/
│   ├── fetch-games.cjs
│   ├── ...
├── bild.cjs
├── setup.sh
├── scrape.sh
├── ...
```

## 📄 Estrutura depois

```
data/
├── games-data/          ← 12.200 JSONs (~49 MB) - LUGAR CERTO
│   ├── 000x.json
│   ├── 006w.json
│   ├── ...
├── catalogs/
├── logs/
├── compatflow-src/
├── ...
```

## 🔧 O que foi feito

1. `mv scripts/games-data data/games-data`
2. Nenhum código precisou ser alterado (nenhuma referência relativa a `scripts/games-data/` existe)

## 📝 Verificação de dependências

| Arquivo consultado | Referencia `scripts/games-data`? | Impacto |
|--------------------|----------------------------------|---------|
| `scripts/helpers/fetch-games.cjs` | ❌ (usa path absoluto externo) | Nenhum |
| `scripts/setup.sh` | ❌ (usa `--exclude='games-data'` — funciona com glob) | Nenhum |
| `.gitignore` | ❌ (regra `games-data/` cobre qualquer local) | Nenhum |
| `src/` (todo código TypeScript) | ❌ (sem menção a games-data) | Nenhum |

## 🔗 Cobertura do `.gitignore`

A regra `games-data/` no `.gitignore` já cobre o novo caminho `data/games-data/`:

```bash
git check-ignore data/games-data/
# Saída: data/games-data/
```

## 🧪 Verificação

```bash
ls scripts/games-data/
# Saída esperada: "no such file or directory"

ls data/games-data/ | wc -l
# Saída esperada: ~12200
```

## 🔗 Arquivos relacionados

- `MODULARIZATION_PLAN.md` — Fase 2.3
- `.gitignore` — regra `games-data/`

# Redmine 009 — Mover `scrapers/` para fora do projeto (Fase 6)

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Mover `scrapers/` (1,6 GB / 396K arquivos) para fora do repositório |
| **Fase** | 6 |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`scrapers/` continha **1,6 GB de dados coletados** (estudos, games-data, games-with-downloads) dentro do repositório do código-fonte. Isso poluía o git, backups e navegação do projeto.

## 🔧 Modificações aplicadas

| Ação | Detalhe |
|------|---------|
| Criado `~/Documentos/protonforgerfull-data/` | Novo diretório externo para dados |
| Movido `scrapers/` | `protonforgerfull/scrapers/` → `protonforgerfull-data/scrapers/` |
| `.gitignore` | Já tinha `scrapers/` (Fase 2.1), sem alterações |

### Estrutura final

```
~/Documentos/
├── protonforgerfull/           ← só código fonte (~500 MB)
│   ├── src/
│   ├── scripts/
│   └── ...
└── protonforgerfull-data/      ← só dados (~1,6 GB)
    └── scrapers/
        ├── estudos/
        ├── games-data/
        └── games-with-downloads/
```

## ✅ Verificação

| Verificação | Resultado |
|-------------|-----------|
| `scrapers/` no projeto | Removido |
| `scrapers/` no diretório de dados | ✅ ~1,6 GB |
| `npm run build` | ✓ sem erros |
| Referências em `src/` ou `scripts/` | Nenhuma (já verificado) |

## 📁 Arquivos relacionados

- `~/Documentos/protonforgerfull-data/scrapers/`
- `.gitignore` (linha `scrapers/`)

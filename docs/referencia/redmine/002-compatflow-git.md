# Redmine 002 — Limpeza de git aninhado em `data/compatflow-src/`

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Pasta alvo** | `data/compatflow-src/` |
| **Fase do plano** | 2.2 |
| **Data** | 21/05/2026 |
| **Risco** | 🟢 Baixo |

## 🎯 Objetivo

Remover o repositório git aninhado dentro de `data/compatflow-src/` para evitar que ferramentas, IDE e o git principal se confundam com um `.git/` interno.

## 📄 Estrutura original (antes)

```
data/compatflow-src/
├── .git/                    ← repositório git separado (confunde o git pai)
├── compatflow.py
├── compatflow.svg
├── install-compatflow.sh
├── README.md
├── uninstall-compatflow.sh
└── version.json
```

## 📄 Estrutura atual (depois)

```
data/compatflow-src/
├── compatflow.py
├── compatflow.svg
├── install-compatflow.sh
├── README.md
├── uninstall-compatflow.sh
└── version.json
```

## 🔧 O que foi feito

1. Deletado `data/compatflow-src/.git/` (pasta completa)
2. Nenhum arquivo de código foi alterado ou removido

## 📦 Conteúdo do `compatflow-src`

| Arquivo | Descrição |
|---------|-----------|
| `compatflow.py` | Script principal do CompatFlow (Python) |
| `compatflow.svg` | Ícone/logo do CompatFlow |
| `install-compatflow.sh` | Script de instalação |
| `README.md` | Documentação do CompatFlow |
| `uninstall-compatflow.sh` | Script de desinstalação |
| `version.json` | Metadados de versão |

## 📝 Notas

- O `.git` interno pertencia ao desenvolvimento do CompatFlow antes de ser integrado ao ProtonForge
- Os arquivos do CompatFlow são parte do projeto e devem permanecer soltos (sem git próprio)
- Nenhum código referencia caminhos absolutos dentro de `.git/`, portanto risco zero

## 🧪 Verificação

```bash
ls data/compatflow-src/.git
# Saída esperada: "no such file or directory"

git -C data/compatflow-src status 2>&1
# Saída esperada: "fatal: not a git repository"
```

## 🔗 Arquivos relacionados

- `MODULARIZATION_PLAN.md` — Fase 2.2
- `data/compatflow-src/compatflow.py`
- `data/compatflow-src/README.md`

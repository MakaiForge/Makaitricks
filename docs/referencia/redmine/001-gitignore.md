# Redmine 001 — `.gitignore`

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Arquivo alvo** | `.gitignore` (raiz do projeto) |
| **Fase do plano** | 1.2 e 2.1 |
| **Data da última modificação** | 21/05/2026 |
| **Responsável** | ProtonForge Agents |

## 🎯 Objetivo

Manter o repositório git limpo de artefatos de build, dependências instaláveis, e dados externos que não pertencem ao código fonte.

## 📄 Estrutura do `.gitignore`

### Bloco 1 — Dependências e build (linhas 1-5)

```
node_modules/
out/
dist/
venv/
__pycache__/
```

Protege contra commits de `node_modules` (npm), `out/` e `dist/` (build Electron), `venv/` (virtualenv Python) e `__pycache__/` (bytecode Python).

### Bloco 2 — Arquivos compilados Python (linha 6)

```
*.pyc
```

Arquivos `.pyc` são bytecode compilado do Python, gerados automaticamente.

### Bloco 3 — Dados de jogos (linhas 7-11)

```
games-data/
games-with-downloads/
cache/
data/releases/
data/sources/
```

Diretórios que contêm dados baixados ou cacheados. `games-data/` tem **12.218 JSONs (49 MB)**. `cache/` armazena thumbnails e metadados temporários.

### Bloco 4 — Dependências Python empacotadas (linhas 12-14)

```
protonforge-python-rpc/
resources/protonforge-python-rpc/
resources/catalogo/
```

Pastas com bibliotecas Python que foram copiadas para o projeto, mas são mantidas externamente.

### Bloco 5 — Arquivos de banco de dados (linhas 15-18, 27)

```
*.bak
*.db
*.db-shm
*.db-wal
logs/
fetch-logs.txt
*.tsbuildinfo
*.log
.env
opencode
image.jpg
catalogo.db
proton_data.db
```

Bancos SQLite, logs, arquivos de ambiente, e artefatos diversos que não devem versionar.

### Bloco 6 — Rust build artifacts (linha 29-30)

```
# Rust build artifacts
tools/native/**/target/
```

Adicionado na **Fase 1.2**. A pasta `target/` do Rust contém artefatos de compilação (.o, .rlib, .d) — ~200 MB. O glob `**/target/` cobre qualquer profundidade.

### Bloco 7 — Scrapers data (linha 32-33) ✨ NOVO

```
# Scrapers data (1.6 GB, 396K JSON files — base de dados externa)
scrapers/
```

Adicionado na **Fase 2.1**. A pasta `scrapers/` contém **396.000 arquivos JSON (1,6 GB)** — dados de jogos baixados por scrapers. Não é código fonte, nunca deve entrar no git.

## 🔁 Histórico de modificações

| Data | Fase | O que mudou |
|------|------|-------------|
| 21/05/2026 | 1.2 | Adicionado `tools/native/**/target/` (Rust build artifacts) |
| 21/05/2026 | 2.1 | Adicionado `scrapers/` (base de dados externa) |

## 🧪 Verificação

```bash
# Verificar se scrapers/ está sendo ignorado
git check-ignore scrapers/
# Saída esperada: scrapers/
```

## 🔗 Arquivos relacionados

- `MODULARIZATION_PLAN.md` — Fases 1.2 e 2.1
- `docs/redmine/002-compatflow-git.md`
- `docs/redmine/003-games-data-migration.md`

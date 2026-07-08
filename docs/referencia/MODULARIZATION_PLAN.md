# Plano de Modularização — ProtonForge

## 📋 Como ler este documento

```
✅ = Tarefa concluída (com data)
🔲 = Tarefa pendente
📁 = Pasta
📄 = Arquivo
```

Cada fase termina com:
1. Build (`npm run build`) — verificar se compila sem erros
2. Sua aprovação visual
3. Backup atualizado (deleta o anterior, cria novo)
4. Avanço para próxima fase

---

## 🔁 Regra do Backup

| Momento | Ação |
|---|---|
| Último backup | `protonforgerfull.BACKUP-20260522-fase9.tar.gz` (pós-Fase 9) |
| Após cada fase aprovada | Deletar backup anterior → criar novo backup |
| Se algo quebrar | `scripts/restore.sh` restaura o último backup |

---

## 📊 Diagnóstico Inicial

| Item | Status |
|---|---|
| `scrapers/` está no `.gitignore`? | ❌ **Não** — 1,6 GB / 396K arquivos podem travar o git |
| `target/` Rust no `.gitignore`? | ❌ Não |
| `scripts/games-data/` no `.gitignore`? | ✅ Sim (via regra `games-data/`) |
| `src/middleware/` existe? | ✅ Sim, vazia |
| `data/compatflow-src/.git` aninhado? | ✅ Sim |
| Build compila? | ✅ Sim |

---

## Fase 1 — Limpeza Leve (🟢 Prioridade Baixa)

> Risco mínimo. Remoção de diretórios vazios e atualização de `.gitignore`.

### 1.1 Remover `src/middleware/` 📁

| Item | Detalhe |
|---|---|
| **O que é** | Uma pasta vazia dentro de `src/` que nunca foi usada |
| **Por que remover** | Pasta vazia polui a navegação e não faz nada |
| **O que acontece** | Só deletar a pasta, nada mais |
| **Risco** | Zero — pasta vazia |
| **Como verificar** | `ls src/middleware/` deve retornar "no such file or directory" |

**Antes:**
```
src/
├── middleware/   ← vazia, inútil
├── main/
├── renderer/
...
```

**Depois:**
```
src/
├── main/
├── renderer/
...
```

Status: ✅ (21/05/2026)

---

### 1.2 Adicionar `target/` do Rust ao `.gitignore`

| Item | Detalhe |
|---|---|
| **O que é** | A pasta `tools/native/native/protonforge-native/target/` contém artefatos de compilação do Rust (arquivos .o, .rlib, .d). São gerados automaticamente ao compilar |
| **Por que adicionar** | Se alguém der `git add .`, esses 200 MB de lixo vão para o repositório |
| **O que muda** | Só uma linha extra no `.gitignore` |
| **Risco** | Zero — só impede que lixo entre no git |

**Arquivo editado:** `.gitignore` (na raiz)

**Linha a adicionar:**
```
tools/native/**/target/
```

Status: ✅ (21/05/2026)

---

## Fase 2 — Gitignore + Dados (🟡 Prioridade Média)

### 2.1 Adicionar `scrapers/` ao `.gitignore`

| Item | Detalhe |
|---|---|
| **O que é** | `scrapers/` tem **1,6 GB e 396 mil arquivos** JSON. É base de dados de jogos baixada por scrapers |
| **Por que adicionar** | Se não estiver no `.gitignore`, qualquer `git add .` ou `git status` vai processar 396K arquivos — trava o terminal |
| **Risco** | Baixo — `scrapers/` nunca foi adicionado ao git |
| **Como verificar** | `git check-ignore scrapers/` deve retornar `scrapers/` |

Status: ✅ (21/05/2026)

---

### 2.2 Limpar repositório git aninhado em `data/compatflow-src/`

| Item | Detalhe |
|---|---|
| **O que é** | A pasta `data/compatflow-src/` tem um `.git/` próprio — é um repositório git dentro do nosso repositório |
| **Por que limpar** | Gita aninhados confundem ferramentas, IDE, e podem causar erros. O código do compatflow pertence ao projeto, não precisa de git próprio aqui |
| **O que fazer** | Deletar `data/compatflow-src/.git/` e manter os arquivos soltos |
| **Risco** | Baixo — o git interno só servia para desenvolvimento do compatflow. Os arquivos (.py, .sh, README) ficam |

**Antes:**
```
data/compatflow-src/
├── .git/        ← repositório separado (confuso)
├── compatflow.py
├── README.md
...
```

**Depois:**
```
data/compatflow-src/
├── compatflow.py
├── README.md
...
```

Status: ✅ (21/05/2026)

---

### 2.3 Mover `scripts/games-data/` para `data/games-data/`

| Item | Detalhe |
|---|---|
| **O que é** | `scripts/games-data/` tem 12.218 arquivos JSON (49 MB). São dados de jogos baixados, usados pelos scrapers |
| **Por que mover** | Não é script — é **dado**. Deveria estar em `data/`, não em `scripts/` |
| **O que muda** | O conteúdo é movido. Nenhum código referencia essa pasta (já é ignorada pelo git) |
| **Risco** | Baixo — nada referencia essa pasta no código |

**Antes:**
```
scripts/
├── games-data/   12.218 JSONs (49 MB) ← lugar errado
├── helpers/
├── bild.cjs
...
```

**Depois:**
```
scripts/
├── helpers/
├── bild.cjs
...
data/
├── games-data/   12.218 JSONs (49 MB) ← lugar certo
├── catalogs/
├── logs/
...
```

Status: ✅ (21/05/2026)

---

## Fase 3 — Separação do Servidor Express (🟡 Prioridade Média)

### 3.1 Mover servidor Express para `server/` na raiz

| Item | Detalhe |
|---|---|
| **O que é** | O projeto tem um servidor web Express embutido. Os arquivos estão espalhados dentro de `src/` junto com o código Electron |
| **Arquivos envolvidos** | `src/server.cjs`, `src/routes/` (3 arquivos), `src/services/` (3 arquivos) |
| **Por que separar** | Misturar servidor web com Electron confunde. O servidor Express não é Electron — é um serviço separado que roda junto |
| **O que muda** | Os arquivos vão para `server/` na raiz. Caminhos de `require()` precisam ser atualizados |
| **Risco** | **Médio** — requer atualizar `require()` com caminhos relativos |

**Estrutura nova proposta:**
```
server/
├── server.cjs          ← entry point (antes em src/server.cjs)
├── routes/
│   ├── catalogue.cjs   ← antes em src/routes/
│   ├── download-sources.cjs
│   └── games.cjs
├── services/
│   ├── local-sources.cjs  ← antes em src/services/
│   ├── protondb.cjs
│   └── steam.cjs
```

**Etapas:**
1. Criar `server/` e subpastas
2. Mover arquivos
3. Atualizar `require('./routes/...')` para `require('./routes/...')` — os caminhos relativos entre routes/ e services/ mudam porque agora estão um nível acima

Status: ✅ (21/05/2026)

---

## Fase 4 — Padronização CSS (🟡 Prioridade Média)

### 4.1 Unificar padrão de estilos

| Item | Detalhe |
|---|---|
| **Problema** | O projeto tem **dois padrões CSS diferentes** convivendo: |
| **Padrão A** (maioria) | SCSS co-localizado: `pagina/pagina.scss` ao lado de `pagina.tsx` |
| **Padrão B** (games/ e proton-tools/) | SCSS em `styles/` com subpastas `base/`, `components/`, `utils/` |
| **Por que unificar** | Desenvolvedor novo não sabe qual padrão seguir. Manutenção fica confusa |
| **O que fazer** | Migrar **Padrão B → Padrão A**. Mover os SCSS de `games/styles/` e `proton-tools/styles/` para junto dos componentes |
| **Risco** | Médio — requer entender quais SCSS importam o quê e atualizar `@use`/`@import` |

**Exemplo de migração (games):**

**Antes:**
```
pages/games/
├── styles/
│   ├── base/_variables.scss
│   ├── components/game-card/_game-card.scss
│   ├── components/grid/_grid.scss
│   └── utils/_mixins.scss
├── games.scss  (importa os partials acima)
├── games.tsx
```

**Depois:**
```
pages/games/
├── _variables.scss
├── _mixins.scss
├── games.scss
├── games.tsx
├── components/
│   ├── game-card.scss   ← estilo colado no componente
│   ├── game-card.tsx
│   ├── grid.scss
│   ├── grid.tsx
...
```

Status: ✅ (21/05/2026)

---

## Fase 5 — Refatoração do Preload (🟠 Prioridade Alta)

### 5.1 Quebrar `src/preload/index.ts` em módulos

| Item | Detalhe |
|---|---|
| **O que é** | `src/preload/index.ts` tem **500+ linhas** com todas as APIs IPC num arquivo só |
| **Por que quebrar** | Dificuldade de manutenção. Cada API (library, auth, downloads, settings) deveria estar em seu próprio módulo |
| **O que muda** | `index.ts` vira um barrel que importa de módulos. Nenhuma quebra no IPC |
| **Risco** | Médio — requer cuidado para não quebrar nomes de canal IPC |

**Estrutura nova proposta:**
```
src/preload/
├── index.ts              ← barrel: re-exporta tudo
├── library.ts            ← APIs da biblioteca de jogos
├── auth.ts               ← login, signOut, getMe
├── downloads.ts          ← startGameDownload, pause, resume, cancel
├── settings.ts           ← userPreferences, autoLaunch, themes
├── catalogue.ts          ← getGameAssets, getRandomGame
├── torrenting.ts         ← torrent APIs
├── notifications.ts      ← local notifications
└── types.ts              ← tipos compartilhados
```

Status: ✅ (21/05/2026)

---

## Fase 6 — Grande Limpeza (🔴 Prioridade Crítica)

### 6.1 Mover `scrapers/` para fora do projeto

| Item | Detalhe |
|---|---|
| **O que é** | `scrapers/` contém **396.000 arquivos (1,6 GB)** de dados de jogos coletados |
| **Por que mover** | Não é código fonte. É **base de dados**. Polui o repositório, trava git |
| **Para onde** | `~/Documentos/protonforgerfull-data/scrapers/` (fora do projeto, ao lado) |
| **Risco** | Baixo — código não referencia scrapers/ como path fixo (só scripts de scraping usam) |

**Antes:**
```
protonforgerfull/
├── scrapers/    ← 1,6 GB (396K arquivos)
├── src/
├── scripts/
...
```

**Depois:**
```
protonforgerfull/          ← só código fonte (~500 MB)
├── src/
├── scripts/
...

protonforgerfull-data/     ← só dados (~1,6 GB)
├── scrapers/
├── (futuro: outros dados)
```

Status: ✅ (21/05/2026)

---

## 📈 Resumo das Fases

| Fase | O quê | Risco | Depois do build |
|---|---|---|---|
| 1.1 | Remover `src/middleware/` | 🟢 Zero | ✅ |
| 1.2 | `target/` Rust no `.gitignore` | 🟢 Zero | ✅ (21/05/2026) |
| 2.1 | `scrapers/` no `.gitignore` | 🟢 Zero | ✅ (21/05/2026) |
| 2.2 | Limpar git aninhado | 🟢 Baixo | ✅ (21/05/2026) |
| 2.3 | Mover `games-data/` | 🟢 Baixo | ✅ (21/05/2026) |
| 3 | Separar servidor Express | 🟡 Médio | ✅ (21/05/2026) |
| 4 | Unificar padrão CSS | 🟡 Médio | ✅ |
| 5 | Quebrar preload | 🟡 Médio | ✅ (21/05/2026) |
| 6 | Mover `scrapers/` p/ fora | 🟢 Baixo | ✅ (21/05/2026) |

---

## Fase 7 — Correção de Bugs Críticos (🔴 Prioridade Alta)

> Correções localizadas com backup antes de cada uma. Aprovação visual após cada correção.

### 7.1 Adicionar `.catch()` no `register-event.ts`

| Item | Detalhe |
|------|---------|
| **O quê** | Handler IPC sem `.catch()` trava o renderer se o listener rejeitar |
| **Arquivo** | `src/main/events/register-event.ts` |
| **Correção** | Envolver em try/catch com `logger.error` |
| **Risco** | 🟢 Baixo — mudança localizada |
| **Redmine** | `docs/redmine/011-register-event-sem-catch.md` |

Status: ✅ (21/05/2026)

---

### 7.2 Declarar variável `matched` em `local-sources.cjs`

| Item | Detalhe |
|------|---------|
| **O quê** | `getGameDownloadSources` usa `matched` sem declarar — crash em runtime |
| **Arquivo** | `server/services/local-sources.cjs` |
| **Correção** | `const matched = new Set();` no início da função |
| **Risco** | 🟢 Baixo — só adiciona declaração |
| **Redmine** | `docs/redmine/012-local-sources-matched-nao-declarada.md` |

Status: ✅ (21/05/2026)

---

### 7.3 Remover `getSourceFiles()` duplicada

| Item | Detalhe |
|------|---------|
| **O quê** | Função definida duas vezes no mesmo arquivo (linhas 8 e 80) |
| **Arquivo** | `server/services/local-sources.cjs` |
| **Correção** | Remover primeira definição (linhas 8-19) |
| **Risco** | 🟢 Baixo — segunda definição é idêntica |
| **Redmine** | `docs/redmine/013-local-sources-funcao-duplicada.md` |

Status: ✅ (21/05/2026)

---

### 7.4 Corrigir lógica do `--no-sandbox`

| Item | Detalhe |
|------|---------|
| **O quê** | `--no-sandbox` adicionado em Windows/macOS em vez de Linux |
| **Arquivo** | `src/main/index.ts:36` |
| **Correção** | `if (process.platform === "linux")` |
| **Risco** | 🟢 Baixo — inverte condicional |
| **Redmine** | `docs/redmine/014-nosandbox-invertido.md` |

Status: ✅ (22/05/2026)

---

### 7.5 Mover `html-sanitizer.ts` para o renderer

| Item | Detalhe |
|------|---------|
| **O quê** | Arquivo em `shared/` usa DOM API (`document.createElement`) — só funciona no renderer |
| **Correção** | Mover para `src/renderer/src/utils/` + atualizar barrel |
| **Risco** | 🟡 Médio — requer atualizar imports |
| **Redmine** | `docs/redmine/015-html-sanitizer-local-errado.md` |

Status: ✅ (21/05/2026)

---

## Fase 8 — Infraestrutura de Testes (🔴 Prioridade Alta)

### 8.1 Setup vitest + testes iniciais

| Item | Detalhe |
|------|---------|
| **O quê** | Projeto sem nenhum teste automatizado |
| **Correção** | Adicionar vitest, config, e testes nas funções puras |
| **Risco** | 🟡 Médio — pode conflitar com config do electron-vite |
| **Redmine** | `docs/redmine/010-zero-testes.md` |

Status: ✅ (21/05/2026)

---

## Fase 9 — Refatoração de Arquivos Grandes (🟡 Prioridade Média)

### 9.1 Extrair dados de proton.ts

| Item | Detalhe |
|------|---------|
| **O quê** | 584 linhas — extrair dados das 16 ferramentas (Proton, Wine, DXVK) |
| **Correção** | `proton-tools-data.ts` criado com ~190 linhas, `proton.ts` reduzido para ~394 linhas |
| **Risco** | 🟡 Médio |
| **Redmine** | `docs/redmine/016-arquivos-grandes.md` |

Status: ✅ (22/05/2026)

---

### 9.2 Quebrar `window-manager.ts`

| Item | Detalhe |
|------|---------|
| **O quê** | 555 linhas — extrair system-tray.ts |
| **Correção** | `system-tray.ts` criado (~80 linhas), `window-manager.ts` reduzido para ~410 linhas |
| **Risco** | 🟡 Médio |
| **Redmine** | `docs/redmine/016-arquivos-grandes.md` |

Status: ✅ (22/05/2026)

---

### 9.3 Quebrar `gofile.ts`

| Item | Detalhe |
|------|---------|
| **O quê** | 502 linhas — extrair types para gofile-types.ts |
| **Correção** | `gofile-types.ts` criado (~35 linhas), `gofile.ts` reduzido para ~435 linhas |
| **Risco** | 🟡 Médio |
| **Redmine** | `docs/redmine/016-arquivos-grandes.md` |

Status: ✅ (22/05/2026)

---

### 9.4 Quebrar `download/index.ts`

| Item | Detalhe |
|------|---------|
| **O quê** | 354 linhas — DownloadManager com RPC, seeding, sync de torrents |
| **Correção** | Extrair `download-rpc.ts`, `download-seeding.ts`, `sync-removed.ts` |
| **Risco** | 🟡 Médio |
| **Redmine** | `docs/redmine/016-arquivos-grandes.md` |

Status: ✅ (22/05/2026)

---

## 📈 Resumo das Fases

| Fase | O quê | Risco | Status |
|------|-------|-------|--------|
| 1.1 | Remover `src/middleware/` | 🟢 Zero | ✅ (21/05/2026) |
| 1.2 | `target/` Rust no `.gitignore` | 🟢 Zero | ✅ (21/05/2026) |
| 2.1 | `scrapers/` no `.gitignore` | 🟢 Zero | ✅ (21/05/2026) |
| 2.2 | Limpar git aninhado | 🟢 Baixo | ✅ (21/05/2026) |
| 2.3 | Mover `games-data/` | 🟢 Baixo | ✅ (21/05/2026) |
| 3 | Separar servidor Express | 🟡 Médio | ✅ (21/05/2026) |
| 4 | Unificar padrão CSS | 🟡 Médio | ✅ |
| 5 | Quebrar preload | 🟡 Médio | ✅ (21/05/2026) |
| 6 | Mover `scrapers/` p/ fora | 🟢 Baixo | ✅ (21/05/2026) |
| 7.1 | `.catch()` no register-event | 🟢 Baixo | ✅ (21/05/2026) |
| 7.2 | Declarar `matched` | 🟢 Baixo | ✅ (21/05/2026) |
| 7.3 | Remover função duplicada | 🟢 Baixo | ✅ (21/05/2026) |
| 7.4 | Corrigir `--no-sandbox` | 🟢 Baixo | ✅ (22/05/2026) |
| 7.5 | Mover html-sanitizer | 🟡 Médio | ✅ (21/05/2026) |
| 8.1 | Setup vitest + testes | 🟡 Médio | ✅ (21/05/2026) |
| 9.1 | Extrair proton.ts | 🟡 Médio | ✅ (22/05/2026) |
| 9.2 | Quebrar window-manager.ts | 🟡 Médio | ✅ (22/05/2026) |
| 9.3 | Quebrar gofile.ts | 🟡 Médio | ✅ (22/05/2026) |
| 9.4 | Quebrar download/index.ts | 🟡 Médio | ✅ (22/05/2026) |

---

## 🚨 Instruções de Emergência

**Se algo quebrar durante uma fase:**

```bash
cd /home/cas/Documentos/protonforgerfull
bash scripts/restore.sh   # restaura do último backup
```

O backup fica em `../protonforgerfull.BACKUP-YYYYMMDD-HHMMSS`.

---

## 🔧 Apêndice — Correções não-planejadas

### Typecheck quebrado (MODULE_NOT_FOUND)

| Item | Detalhe |
|------|---------|
| **Problema** | `npm run typecheck` falhava com `Cannot find module '../lib/tsc.js'` |
| **Causa** | `node_modules/.bin/tsc` e `node_modules/.bin/tsserver` eram cópias do shim (45 bytes) em vez de symlinks para `../typescript/bin/tsc` |
| **Correção** | `rm node_modules/.bin/tsc node_modules/.bin/tsserver && ln -s ../typescript/bin/tsc node_modules/.bin/tsc && ln -s ../typescript/bin/tsserver node_modules/.bin/tsserver` |
| **Redmine** | `docs/redmine/005-typecheck-fix.md` |
| **Data** | 21/05/2026 |

> ⚠️ Se `node_modules/` for reinstalado, os symlinks podem se perder. Verificar com `npm run typecheck:node`.

### Typecheck com 129 erros (todos corrigidos)

| Item | Detalhe |
|------|---------|
| **Problema** | `npm run typecheck` exibia 129 erros (52 node + 77 web) |
| **Causa raiz** | Imports não utilizados, falta de null checks, tipo `Electron` desatualizado (herdado do ProtonForge), preload incompatível com a UI |
| **Correção** | 12 arquivos `.ts` do main + 3 do renderer + 1 `.d.ts` + 1 preload |
| **Redmine** | `docs/redmine/006-typecheck-erros.md` |
| **Data** | 21/05/2026 |

---

### qBittorrent fecha sozinho (exit code 0)

| Item | Detalhe |
|------|---------|
| **Problema** | qBittorrent-nox iniciava e fechava com exit code 0 em 5s, travando os downloads |
| **Causa raiz** | `killQBittorrent()` enviava SIGTERM mas não esperava o processo morrer; `app.quit()` fechava o Node antes do setTimeout(3s) pro SIGKILL disparar. O qBittorrent virava órfão segurando a porta 8080. Na próxima execução, o novo spawn detectava conflito de lockfile/porta e morria silenciosamente |
| **Correção** | `killQBittorrent()` virou `async` com Promise que aguarda o processo morrer. Adicionado `killOrphanQBittorrent()` (mata órfãos via `pkill`). Adicionado `waitForPortFree()` (aguarda porta 8080 liberar). Retry automático (3 tentativas). `before-quit` agora `await killQBittorrent()` |
| **Arquivo** | `src/main/index.ts` |
| **Redmine** | `docs/redmine/019-qbittorrent-exit-code-0.md` |
| **Data** | 22/05/2026 |

---

---

## Fase 10 — Integração da API Python (🔴 Prioridade Alta)

> Copiar `protonforge-api/` (Python JSON-RPC) de bbb/ e corrigir paths para funcionar no projeto atual.

### 10.1 Copiar `protonforge-api/` de bbb/

| Item | Detalhe |
|------|---------|
| **O quê** | 29 arquivos Python (stdlib only) — motor de recomendação Proton, prefixo Wine, DLLs, launch args |
| **Origem** | `/home/cas/Documentos/bbb/protonforgerfull/protonforge-api/` |
| **Destino** | `/home/cas/Documentos/protonforgerfull/protonforge-api/` |
| **Excluído** | `__pycache__/`, `*.pyc`, `*.egg-info` |
| **Risco** | 🟢 Baixo — não afeta TypeScript |
| **Redmine** | `docs/redmine/020-integracao-api-python.md` |

Status: ✅ (22/05/2026)

### 10.2 Corrigir path do server.py em proton-recommendation.ts

| Item | Detalhe |
|------|---------|
| **Arquivo** | `src/main/services/proton-recommendation.ts:42` |
| **Antes** | `"tools/python-rpc/protonforge-api/server.py"` |
| **Depois** | `"protonforge-api/server.py"` |
| **Risco** | 🟢 Baixo — 1 linha |
| **Redmine** | `docs/redmine/020-integracao-api-python.md` |

Status: ✅ (22/05/2026)

### 10.3 Copiar `compatflow/` (dependência Python)

| Item | Detalhe |
|------|---------|
| **O quê** | Pacote Python `compatflow/` (8 arquivos) — importado por `compatflow_bridge.py` |
| **Problema** | `ModuleNotFoundError: No module named 'compatflow'` — API quebrava |
| **Origem** | `/home/cas/Documentos/bbb/protonforgerfull/compatflow/` |
| **Destino** | `/home/cas/Documentos/protonforgerfull/compatflow/` |
| **Risco** | 🟢 Baixo — só Python |
| **Redmine** | `docs/redmine/020-integracao-api-python.md` |

Status: ✅ (22/05/2026)

### 10.4 Symlinks dos DBs

| Item | Detalhe |
|------|---------|
| **Problema** | API Python espera `resources/catalogo.db` e `resources/proton_data.db`, mas estão em `resources/database/` |
| **Solução** | Symlinks: `resources/catalogo.db → resources/database/catalogo.db` |
| **Risco** | 🟢 Zero — symlinks inócuos |
| **Redmine** | `docs/redmine/020-integracao-api-python.md` |

Status: ✅ (22/05/2026)

---

---

## Fase 11 — Scan de executáveis pós-instalação (3 Modos)

> Implementação dos 3 modos de instalação de jogos com scan automático de .exe no prefixo Wine.

### Arquivos criados/modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/main/helpers/find-game-exe.ts` | 🔄 Modificado | Full scan no `drive_c/`, top 5 por data |
| `src/main/helpers/find-exe-in-folder.ts` | ✅ Novo | Scan na pasta do jogo (Modo 2) |
| `src/main/helpers/copy-game-to-prefix.ts` | ✅ Novo | Copia jogo pro prefixo + hash (Modo 3) |
| `src/main/events/library/open-game-installer.ts` | 🔄 Modificado | Conecta 3 modos |
| `src/renderer/src/pages/downloads/components/executable-candidate-modal.tsx` | ✅ Novo | Modal 1: seleção de candidatos |
| `src/renderer/src/pages/downloads/components/executable-candidate-modal.scss` | ✅ Novo | CSS do Modal 1 |
| `src/renderer/src/pages/downloads/components/scanning-prefix-modal.tsx` | ✅ Novo | Modal 2: escaneando prefixo |
| `src/renderer/src/pages/downloads/components/scanning-prefix-modal.scss` | ✅ Novo | CSS do Modal 2 |
| `src/renderer/src/pages/downloads/components/copying-game-modal.tsx` | ✅ Novo | Modal 3: copiando jogo |
| `src/renderer/src/pages/downloads/components/copying-game-modal.scss` | ✅ Novo | CSS do Modal 3 |
| `src/renderer/src/pages/downloads/downloads.tsx` | 🔄 Modificado | Integração dos novos modais |
| `src/renderer/src/declaration.d.ts` | 🔄 Modificado | Tipo `candidates` no IPC |
| `src/locales/*/translation.json` | 🔄 Modificado | 8 novas chaves de tradução |
| `docs/ADMIN-3-MODOS-INSTALACAO.md` | ✅ Novo | Documentação do plano |

### Modos implementados

| Modo | Descrição | Fluxo |
|------|-----------|-------|
| 1 | Instalador único (.exe) | Prepara prefixo → executa → scan no prefixo → 5 candidatos |
| 2 | Pasta com vários arquivos | Scan na pasta do jogo → candidatos → executa → scan no prefixo |
| 3 | Jogo não criou nada no prefixo | Copia pasta pro prefixo → re-scan → candidatos |

### Admin

`docs/ADMIN-3-MODOS-INSTALACAO.md`

Status: ✅ (22/05/2026)

---

## 📈 Resumo das Fases (atualizado)

| Fase | O quê | Risco | Status |
|------|-------|-------|--------|
| 1–9 | Ver seções anteriores | — | ✅ |
| 10.1 | Copiar `protonforge-api/` Python | 🟢 Baixo | ✅ (22/05/2026) |
| 10.2 | Corrigir path server.py | 🟢 Baixo | ✅ (22/05/2026) |
| 10.3 | Copiar `compatflow/` (Python) | 🟢 Baixo | ✅ (22/05/2026) |
| 10.4 | Symlinks dos DBs | 🟢 Zero | ✅ (22/05/2026) |
| 11 | Scan de executáveis (3 modos) | 🟡 Médio | ✅ (22/05/2026) |

---

*Documento criado em: 21/05/2026*
*Última atualização: 22/05/2026 — Fase 11 (3 modos instalação) concluída*

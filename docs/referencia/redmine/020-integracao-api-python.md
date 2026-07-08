# Redmine 020 — Integração da API Python (protonforge-api)

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Copiar `protonforge-api/` de bbb/ e corrigir paths |
| **Classificação** | 🔴 Prioridade Alta |
| **Data** | 22/05/2026 |
| **Admin** | `docs/ADMIN-PLAN-API-INTEGRATION.md` |

## 🔍 O que foi feito

### A.1 Copiar `protonforge-api/` (Python)

De: `/home/cas/Documentos/bbb/protonforgerfull/protonforge-api/`
Para: `/home/cas/Documentos/protonforgerfull/protonforge-api/`

29 arquivos copiados (excluindo `__pycache__/`, `*.pyc`, `*.egg-info`).

Estrutura:
```
protonforge-api/
├── server.py              ← Entry point stdio JSON-RPC
├── requirements.txt       ← Zero dependências externas (stdlib only)
├── README.md
├── api/
│   ├── __init__.py
│   ├── handler.py         ← Dispatcher: 10 métodos RPC
│   ├── services/
│   │   ├── recommendation/core.py   ← Motor de recomendação Proton
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

### A.1.1 Copiar `compatflow/` (dependência Python)

A API importa `from compatflow.core.analyzer import analyze`. O módulo `compatflow/` (pacote Python com 8 arquivos) estava em bbb/ mas faltava no projeto atual.

Copiado de: `/home/cas/Documentos/bbb/protonforgerfull/compatflow/`
Para: `/home/cas/Documentos/protonforgerfull/compatflow/`

Estrutura:
```
compatflow/
├── __init__.py
├── cli.py
├── assets/compatflow.svg
├── core/
│   ├── __init__.py
│   ├── analyzer.py
│   └── database.py
└── utils/
    ├── __init__.py
    └── system.py
```

### A.2 Corrigir path em `proton-recommendation.ts`

**Arquivo:** `src/main/services/proton-recommendation.ts:42`

| Antes | Depois |
|-------|--------|
| `"tools/python-rpc/protonforge-api/server.py"` | `"protonforge-api/server.py"` |

O path do venv (`tools/venv/bin/python3`) já estava correto.

### A.3 Symlinks dos DBs

A API Python espera os DBs em `resources/`, mas o projeto atual os mantém em `resources/database/`.

**Criados:**
- `resources/catalogo.db` → `resources/database/catalogo.db`
- `resources/proton_data.db` → `resources/database/proton_data.db`

### A.4 Dados da API

A API carrega JSONs (`protons.json`, `prefixo_dlls.json`, `launch_args.json`, etc.) de:
```
~/Documentos/plania proton aqui/api proton/
```
Este diretório existe e contém todos os dados necessários.

## 🧪 Teste funcional

```json
// Request:
{"id":1,"method":"recommend_proton","params":{"game_id":"1245620"}}

// Response (ELDEN RING):
{"id":1,"result":{"game_id":"1245620","title":"ELDEN RING","primary":{"fork":"ge-proton","version":"latest","tier":"gold","tierScore":100.0,"confidence":"medium"},"alternatives":[...6 forks...],"launch_options":{"dlls":["d3dcompiler_47","vcrun2022"],"winetricks":["vcrun2022","d3dcompiler_47"],"wine_overrides":"d3dcompiler_47=n,b"}}}
```

API funcional — recomendação Proton gerada corretamente. ✅

## ✅ Verificação

| Item | Resultado |
|------|-----------|
| `npm run typecheck` | 0 erros ✅ |
| `npm run build` | 0 erros ✅ (~24s) |

## 🔧 Métodos RPC disponíveis

| Método | Descrição |
|--------|-----------|
| `recommend_proton` | Recomenda Proton pra um jogo |
| `get_game_info` | Info do jogo do catálogo |
| `search_games` | Busca jogos por nome |
| `create_prefix` | Cria/configura prefixo Wine |
| `get_recommended_dlls` | DLLs recomendadas pro jogo |
| `get_launch_command` | Monta comando de lançamento |
| `get_installed_protons` | Lista Protons instalados |
| `analyze_exe` | Analisa .exe/.msi |
| `list_available_forks` | Lista forks disponíveis |
| `check_anticheat` | Verifica anti-cheat |

## 📝 Observações

1. A API Python é **zero-dependências** (stdlib only) — não precisa de `pip install`
2. A comunicação com o Electron é via **stdin/stdout JSON-RPC** (mesmo padrão do `python-rpc.ts`)
3. O arquivo `gacha.py` não é usado por nenhum handler — é inerte
4. Os paths para dados JSON são absolutos locais (`~/Documentos/plania proton aqui/api proton/`) — frágeis para distribuição futura

## 🔄 Rollback

```bash
cd /home/cas/Documentos/protonforgerfull
rm -rf protonforge-api/
rm -f resources/catalogo.db resources/proton_data.db
# restaurar do backup
```

## 📎 Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `protonforge-api/` (29 arquivos) | ✅ Copiado de bbb/ |
| `src/main/services/proton-recommendation.ts` | ✅ Path corrigido (1 linha) |
| `resources/catalogo.db` | ✅ Symlink criado |
| `resources/proton_data.db` | ✅ Symlink criado |
| `docs/ADMIN-PLAN-API-INTEGRATION.md` | ✅ Criado |
| `compatflow/` (8 arquivos Python) | ✅ Copiado de bbb/ — dependência necessária |
| `docs/redmine/020-integracao-api-python.md` | ✅ Criado |

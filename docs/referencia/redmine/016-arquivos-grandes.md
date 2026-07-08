# Redmine 016 — Arquivos grandes que merecem refatoração

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Documentar e planejar refatoração dos 4 arquivos mais extensos do `src/main/services/` |
| **Classificação** | 🟡 Manutenibilidade |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `services/proton.ts` | 584 | Configuração de forks de Proton embutida no código (props, nomes, categorias) — deveria ser dados externos |
| `services/hosters/gofile.ts` | 502 | Lógica de CDN, rate-limit, quota, file management — vários conceitos no mesmo arquivo |
| `services/window-manager.ts` | 555 | Gerenciamento de janelas, system tray, deep links — responsabilidades demais |
| `services/download/index.ts` | 354 | Classe DownloadManager com muitas responsabilidades: start, pause, resume, RPC, seeding |

### `proton.ts` (584 linhas)

Contém dados hardcoded de forks de Proton:
- Nomes, descrições, cores, ícones
- URLs de download, categorias
- Versões e changelogs

Isso deveria ser um JSON externo em `data/` ou `assets/`.

### `window-manager.ts` (555 linhas)

Faz tudo isso no mesmo arquivo:
- Criação/gerenciamento de janelas
- System tray
- Deep link handling
- Redirect logic
- Controle de visibilidade

### `gofile.ts` (502 linhas)

Mistura:
- API calls
- CDN resolution
- Rate limiting
- Quota management
- File/folder management

### `download/index.ts` (354 linhas)

Classe `DownloadManager` com:
- Gerenciamento de fila
- RPC (Python)
- Seeding
- Download HTTP
- Integração com qBittorrent

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Refatorar agora | 🔲 | Documentar e planejar apenas |
| Extrair dados de proton.ts para JSON | 🔲 | Propor como fazer |
| Quebrar window-manager.ts | 🔲 | Propor como fazer |
| Quebrar gofile.ts | 🔲 | Propor como fazer |
| Quebrar download/index.ts | 🔲 | Propor como fazer |

### Plano de refatoração (futuro)

#### `proton.ts` → `data/proton-forks.json`

```json
[
  {
    "id": "wine-ge",
    "name": "Wine-GE",
    "description": "GloriousEggroll's Wine builds",
    "category": "wine",
    "color": "#4CAF50",
    "icon": "wine-ge",
    "downloadUrl": "https://github.com/GloriousEggroll/wine-ge/releases",
    "versions": ["8.25", "8.24", "8.23"]
  }
]
```

O arquivo TS passaria a importar e tipar esse JSON.

#### `window-manager.ts` → extrair:
- `window-manager.ts` (criação/gerenciamento)
- `system-tray.ts` (bandeja do sistema)
- `deep-links.ts` (handling de deep links)

#### `gofile.ts` → extrair:
- `gofile-api.ts` (API calls)
- `gofile-cdn.ts` (CDN resolution)
- `gofile-rate-limit.ts` (rate limiting)

#### `download/index.ts` → extrair:
- `download-manager.ts` (core)
- `download-rpc.ts` (Python RPC integration)
- `download-seeding.ts` (seeding logic)

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Quebrar funcionalidade na refatoração | Alta | Exige testes antes (Redmine 010) |
| Perder contexto dos dados | Média | Manter tipos TS junto com JSON |

## 🔧 Procedimento (quando for executar)

1. Backup antes
2. Criar arquivos de dados externos
3. Mover lógica para módulos menores
4. Atualizar imports
5. `npm run build` + `npm run typecheck`
6. Backup pós-correção
7. Apresentar para aprovação

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| `npm run build` | Build sem erros |
| `npm run typecheck:node` | 0 erros |
| Funcionalidade equivalente | Mesmo comportamento antes/depois |

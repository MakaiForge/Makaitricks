# Redmine 008 — Refatoração do Preload (Fase 5)

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Quebrar `src/preload/index.ts` (900 linhas) em módulos |
| **Fase** | 5 |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`src/preload/index.ts` continha **900 linhas** num único arquivo, com todas as APIs IPC expostas via `contextBridge.exposeInMainWorld`. Isso tornava a manutenção difícil — cada nova API exigia alteração no mesmo arquivo gigante.

## 🔧 Modificações aplicadas

### Estrutura antiga

```
src/preload/
└── index.ts          ← 900 linhas, tudo num arquivo
```

### Estrutura nova

```
src/preload/
├── index.ts          ← barrel: importa e mescla os 5 módulos
├── downloads.ts      ← download/torrent/transfer APIs
├── library.ts        ← biblioteca de jogos, wine/proton, extração
├── catalogue.ts      ← catálogo + fontes de download
├── auth.ts           ← autenticação + perfil + amigos
└── app.ts            ← preferências, cloud-save, temas, notificações, auto-update, store, proton-manager etc.
```

### Módulos criados

| Módulo | Conteúdo | Linhas (approx.) |
|--------|----------|------------------|
| `downloads.ts` | start/queue/pause/resume/cancel downloads, seeding, debrid, torrent files, game transfer, raw IPC on/off | ~110 |
| `library.ts` | CRUD da biblioteca, config wine/proton, atalhos, extração, instaladores, favorites, collections, cloud sync | ~160 |
| `catalogue.ts` | game shop details, random game, assets, stats, download sources CRUD | ~30 |
| `auth.ts` | auth (getAuth, signOut, openAuthWindow), profile (getMe, updateProfile), friend requests, listeners | ~65 |
| `app.ts` | user preferences, hardware, cloud-save/backup, misc (ping, version, forgerApi), auto-update, notificações, temas, editor, game launcher, store, proton-manager | ~250 |

## ✅ Verificação

| Verificação | Resultado |
|-------------|-----------|
| `npm run build` | ✓ built sem erros |
| `npm run typecheck:node` | 0 erros |
| `npm run typecheck:web` | 0 erros |

## 📁 Arquivos relacionados

- `src/preload/index.ts` (barrel)
- `src/preload/downloads.ts`
- `src/preload/library.ts`
- `src/preload/catalogue.ts`
- `src/preload/auth.ts`
- `src/preload/app.ts`

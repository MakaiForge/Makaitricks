# Auditoria — `tools/proton-tools/`

## Fases

### Fase 1 — Código morto (fácil, seguro)
Remover arquivos que **ninguém importa**. Zero risco de quebrar algo.

| Item | Arquivos | O quê |
|------|----------|-------|
| 1.1 | `main/services/tools/index.ts` | Barrel file morto — alternativo ao `tools.ts` |
| 1.2 | `main/services/tools/boxtron.ts` | Tool definition individual — ninguém importa |
| 1.3 | `main/services/tools/dw-proton.ts` | — |
| 1.4 | `main/services/tools/luxtorpeda.ts` | — |
| 1.5 | `main/services/tools/proton-cachyos.ts` | — |
| 1.6 | `main/services/tools/proton-em.ts` | — |
| 1.7 | `main/services/tools/proton-ge-rtsp.ts` | — |
| 1.8 | `main/services/tools/proton-ge.ts` | — |
| 1.9 | `main/services/tools/proton-tkg.ts` | — |
| 1.10 | `main/services/tools/proton-valve.ts` | — |
| 1.11 | `main/services/tools/roberta.ts` | — |
| 1.12 | `main/services/tools/steam-tinker-launch.ts` | — |
| 1.13 | `renderer/pages/proton-tools/components/proton-card/proton-card.tsx` | Componente `ProtonCard` — nunca importado |
| 1.14 | `renderer/pages/proton-tools/components/proton-card/proton-card.scss` | SCSS do ProtonCard |

**Linhas removidas**: ~1.100

### Fase 2 — Diretórios vazios
| Item | Caminho | O quê |
|------|---------|-------|
| 2.1 | `tools/proton-tools/data/` | Vazio (JSONs deletados, DB é fonte única) |
| 2.2 | `tools/proton-tools/shared/` | Vazio (nunca usado) |
| 2.3 | `tools/proton-tools/renderer/pages/proton-tools/types/` | Vazio |
| 2.4 | `tools/proton-tools/renderer/pages/proton-tools/components/download-prospect/` | Placeholder vazio |

### Fase 3 — Unificar tool definitions (3 cópias → 1)
Problema: mesmo dado em 3 lugares com shapes diferentes.

| Item | O quê |
|------|-------|
| 3.1 | **Renderer não precisa de `data/tools.ts`** — `ProtonTool` no renderer só usa `id, title, description, category` pra exibir. Dá pra usar o `tools.ts` do main via IPC, ou manter só a lista mínima de categorias. |
| 3.2 | **`src/main/services/proton-tools-data.ts`** — 3ª cópia fora do proton-tools. Verificar se é dead code ou se alguém importa. |
| 3.3 | `ProtonToolExtra` copiado em 2 `types.ts` — extrair pra shared. |

**Solução possível**: o renderer busca tools via `getProtonTools` IPC (já implementado). O `data/tools.ts` do renderer pode ser removido se a UI migrar pra usar o IPC.

### Fase 4 — SCSS quebrado
| Item | Arquivo | Problema |
|------|---------|----------|
| 4.1 | `renderer/components/proton-path-picker/_layout.scss:1` | `@use "../../scss/tokens/utility"` — caminho relativo quebrou depois da movida. Original era relativo a `src/renderer/src/`. |

### Fase 5 — Simplificação
| Item | O quê |
|------|-------|
| 5.1 | **`manager.ts`** (18 linhas) — só re-exporta funções do `index.ts`. Dava pra eliminar e importar direto de `./index`. |
| 5.2 | **`renderer/pages/proton-tools/proton-tools.scss`** — 1 linha que só dá `@use "layout"`. Dá pra in-line no componente. |

### Fase 6 — Verificação
| Item | O quê |
|------|-------|
| 6.1 | Rodar `npm run typecheck:main` e `npm run typecheck:renderer` |
| 6.2 | Testar download de um Proton (GE-Proton) |
| 6.3 | Testar download da Valve (source tarball) |

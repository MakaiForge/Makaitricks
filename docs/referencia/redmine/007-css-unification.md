# Redmine 007 — Unificação de Padrão CSS (Fase 4)

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Unificar os dois padrões CSS do projeto para o padrão co-localizado |
| **Fase** | 4 |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

O projeto tinha dois padrões CSS/SCSS coexistindo:

- **Padrão A** (maioria das páginas): SCSS co-localizado — cada componente tem seu `.scss` no mesmo diretório, importado diretamente pelo `.tsx`
- **Padrão B** (apenas `games/` e `proton-tools/`): SCSS centralizado em pastas `styles/` com subpastas (`base/`, `utils/`, `components/`), importados via entry point `games.scss`/`proton-tools.scss`

### Problemas identificados:

| Problema | Local |
|----------|-------|
| Duplicação de estilos (`games.scss` inline vs `styles/` partials) | `games/games.scss` e `games/styles/components/header/_games.scss`, `games/styles/components/grid/_grid.scss` |
| 10+ arquivos SCSS órfãos (não usados por nenhum TSX) | `games/styles/components/header/`, `games/styles/components/actions/`, `games/styles/components/menu/`, etc. |
| 3 arquivos SCSS órfãos em `proton-tools/` raiz | `_version-list.scss`, `_download-progress.scss`, `_proton-info-modal.scss` |
| Componentes proton-tools sem import SCSS direto (estilo via entry point apenas) | `version-list.tsx`, `download-progress.tsx`, `proton-info-modal.tsx` |
| Import paths inconsistentes (ex: `../../styles/base/variables` ao invés de `../../base/variables`) | `games/styles/components/header/_games.scss` |

## 🔧 Modificações aplicadas

### `games/` — 7 SCSS co-localizados criados, 1 atualizado

| Arquivo novo | Origem |
|-------------|--------|
| `_variables.scss` | Movido de `styles/base/_variables.scss` |
| `_mixins.scss` | Movido de `styles/utils/_mixins.scss`, import atualizado para `./variables` |
| `components/game-bar.scss` | Criado a partir de `styles/components/game-bar/_game-bar.scss` |
| `components/game-config-modal.scss` | Criado a partir de `styles/components/config-modal/_config-modal.scss` |
| `components/game-card-profile.scss` | Criado a partir de `styles/components/game-card/_game-card-profile.scss` |
| `components/game-card-cover.scss` | Criado a partir de `styles/components/game-card/_game-card-cover.scss` |
| `components/game-card-profile-large.scss` | Criado a partir de `styles/components/game-card/_game-card-profile-large.scss` |
| `components/delete-game-modal.scss` | Criado a partir de `styles/components/modals/_delete-modal.scss` |
| `components/wine-tools-menu/wine-tools-menu.scss` | Criado a partir de `styles/components/wine-tools-menu/_wine-tools-menu.scss` |

| Arquivo atualizado | Mudança |
|--------------------|---------|
| `components/add-game-modal.scss` | Import `@use` alterado de `../styles/base/variables` para `../variables` |

### `games/games.scss` — Simplificado

- Removidos todos os `@use` de partials que foram co-localizados ou eram código morto
- Adicionados `@use "./variables"` e `@use "./mixins"`
- Mesclados estilos únicos de view mode: `games__grid--grid`, `games__grid--compact`, `games__list`, `games__list--large`
- Removidos `@use` para partials duplicados ou não utilizados (header, add-button, grid, game-card, game-actions, context-menu, empty-state)

### `games/` — 7 imports TSX atualizados

| Arquivo | Import antigo | Import novo |
|---------|--------------|-------------|
| `game-bar.tsx` | `../styles/components/game-bar/_game-bar.scss` | `./game-bar.scss` |
| `game-config-modal.tsx` | `../styles/components/config-modal/_config-modal.scss` | `./game-config-modal.scss` |
| `game-card-profile.tsx` | `../styles/components/game-card/_game-card-profile.scss` | `./game-card-profile.scss` |
| `game-card-cover.tsx` | `../styles/components/game-card/_game-card-cover.scss` | `./game-card-cover.scss` |
| `game-card-profile-large.tsx` | `../styles/components/game-card/_game-card-profile-large.scss` | `./game-card-profile-large.scss` |
| `delete-game-modal.tsx` | `../styles/components/modals/_delete-modal.scss` | `./delete-game-modal.scss` |
| `wine-tools-menu.tsx` | `../../styles/components/wine-tools-menu/_wine-tools-menu.scss` | `./wine-tools-menu.scss` |

### `proton-tools/` — 3 SCSS co-localizados criados

| Arquivo novo | Origem |
|-------------|--------|
| `_variables.scss` | Movido de `styles/base/_variables.scss` |
| `_mixins.scss` | Movido de `styles/utils/_mixins.scss`, import atualizado para `./variables` |
| `components/version-list.scss` | Criado a partir de `styles/components/_version-list.scss`, import atualizado |
| `components/download-progress.scss` | Criado a partir de `styles/components/_download-progress.scss`, import atualizado |
| `components/proton-info-modal.scss` | Criado a partir de `styles/components/_modal.scss`, import atualizado |

### `proton-tools/proton-tools.scss` — Simplificado

- Removidos `@use` para component partials (cada TSX importa o seu agora)
- Card e Tabs styles inlinados diretamente no entry point (usados pelo `index.tsx`)
- Import paths de variáveis atualizados

### `proton-tools/` — 3 imports TSX adicionados

| Arquivo | Import adicionado |
|---------|-------------------|
| `version-list.tsx` | `./version-list.scss` |
| `download-progress.tsx` | `./download-progress.scss` |
| `proton-info-modal.tsx` | `./proton-info-modal.scss` |

### Arquivos deletados

| Caminho | Motivo |
|---------|--------|
| `games/styles/` (19 arquivos) | Substituído por SCSS co-localizados |
| `proton-tools/styles/` (7 arquivos) | Substituído por SCSS co-localizados ou inlinados |
| `proton-tools/_version-list.scss` | Órfão (duplicata do que estava em `styles/components/`) |
| `proton-tools/_download-progress.scss` | Órfão (duplicata) |
| `proton-tools/_proton-info-modal.scss` | Órfão (duplicata) |

## ✅ Verificação

| Verificação | Resultado |
|-------------|-----------|
| `npm run build` | ✓ built in ~30s sem erros |
| `npm run typecheck:node` | 0 erros |
| `npm run typecheck:web` | 0 erros |

## 📁 Arquivos relacionados

- `src/renderer/src/pages/games/games.scss`
- `src/renderer/src/pages/games/_variables.scss`
- `src/renderer/src/pages/games/_mixins.scss`
- `src/renderer/src/pages/games/components/*.scss` (8 arquivos co-localizados)
- `src/renderer/src/pages/home/proton-tools/proton-tools.scss`
- `src/renderer/src/pages/home/proton-tools/_variables.scss`
- `src/renderer/src/pages/home/proton-tools/_mixins.scss`
- `src/renderer/src/pages/home/proton-tools/components/*.scss` (3 arquivos co-localizados)

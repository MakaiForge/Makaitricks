# ADMIN: 3 Modais de Instalação de Jogos

## Estrutura

```
src/renderer/src/pages/downloads/
├── downloads.tsx
├── components/
│   ├── executable-candidate-modal.tsx     ← NOVO (Modal 1)
│   ├── executable-candidate-modal.scss    ← NOVO
│   ├── scanning-prefix-modal.tsx          ← NOVO (Modal 2)
│   ├── scanning-prefix-modal.scss         ← NOVO
│   ├── copying-game-modal.tsx             ← NOVO (Modal 3)
│   └── copying-game-modal.scss            ← NOVO

src/main/helpers/
├── find-game-exe.ts          ← MODIFICADO (full scan sempre)
├── find-exe-in-folder.ts     ← NOVO (Modo 2)
└── copy-game-to-prefix.ts    ← NOVO (Modo 3)

src/main/events/library/
└── open-game-installer.ts    ← MODIFICADO
```

---

## Modal 1 — "Executável não encontrado"

### Quando aparece
- Scan no prefixo achou .exe (Modo 1 pós-instalador)
- Scan na pasta do jogo achou .exe (Modo 2)
- Scan no prefixo achou .exe após cópia (Modo 3)

### Textos (traduzíveis via `src/locales/*/translation.json`, namespace "downloads")

| Chave | pt-BR |
|-------|-------|
| `candidate_title` | Não temos certeza qual é o seu executável |
| `candidate_description` | Por favor, selecione nos arquivos sugeridos abaixo. Se não tiver, clique em "Procurar". |
| `candidate_fallback_desc` | Achamos alguns executáveis plausíveis que podem ser o seu jogo. |
| `candidate_browse` | Procurar |
| `candidate_browse_tooltip` | Abrir na pasta onde estão os possíveis executáveis |
| `candidate_confirm` | Confirmar |

### Layout (rascunho)

```
┌──────────────────────────────────────────────┐
│  Não temos certeza qual é o seu executável    │
│                                                │
│  Por favor, selecione nos arquivos sugeridos   │
│  abaixo. Se não tiver, clique em "Procurar".   │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │ 📄 nome-do-exe-1.exe                   │   │
│  │    drive_c/Program Files/jogo/         │   │
│  └────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────┐   │
│  │ 📄 nome-do-exe-2.exe                   │   │
│  │    drive_c/outra/pasta/                │   │
│  └────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────┐   │
│  │ 📄 nome-do-exe-3.exe                   │   │
│  │    drive_c/pasta/                      │   │
│  └────────────────────────────────────────┘   │
│  ... (até 5)                                 │
│                                                │
│         [Procurar]    [Confirmar]              │
└──────────────────────────────────────────────┘
```

---

## Modal 2 — "Escaneando prefixo"

### Quando aparece
- Após instalador/jogo fechar
- Enquanto escaneia `drive_c/` atrás de .exe

### Textos

| Chave | pt-BR |
|-------|-------|
| `scanning_title` | Escaneando executáveis |
| `scanning_description` | Vamos escanear o prefixo buscando o jogo lá dentro. Travou, espere. |

### Layout

```
┌──────────────────────────────────────────────┐
│  Escaneando executáveis                       │
│                                                │
│  ⟳ Vamos escanear o prefixo buscando o jogo   │
│    lá dentro. Travou, espere.                  │
│                                                │
│  [████████████░░░░░░░░░░]  60%                │
└──────────────────────────────────────────────┘
```

---

## Modal 3 — "Copiando jogo pro prefixo"

### Quando aparece
- Scan no prefixo não achou nada
- Modo 3: copia pasta do jogo pro prefixo

### Textos

| Chave | pt-BR |
|-------|-------|
| `copying_title` | Copiando jogo |
| `copying_description` | Estamos copiando o executável inteiro do seu jogo pra dentro do prefixo. |

### Layout

```
┌──────────────────────────────────────────────┐
│  Copiando jogo                                │
│                                                │
│  📁 Estamos copiando o executável inteiro     │
│    do seu jogo pra dentro do prefixo.          │
│                                                │
│  [████████████████░░░░░░]  80%                │
└──────────────────────────────────────────────┘
```

---

## Fluxo completo

```
Instalador .exe único
    → executa com Proton
    → fecha
    → Modal 2 (escaneando)
    → findGameExecutables(drive_c/)
    → achou? → Modal 1 (candidatos)
    → não achou? → Modal 3 (copiando)
        → copyGameToPrefix()
        → re-scan
        → achou? → Modal 1
        → não achou? → "confira mais uma vez"

Pasta do jogo
    → findExesInFolder(gamePath)
    → achou? → Modal 1 (candidatos)
        → usuário escolhe → executa jogo
        → fecha → Modal 2 → etc
    → não achou? → Modal 1 vazio → "Procurar"
```

---

## Plano de Implementação

| Fase | O que | Status |
|------|-------|--------|
| 1 | `find-game-exe.ts`: full scan sempre, top 5 | 🔲 |
| 2 | `find-exe-in-folder.ts`: scan na pasta do jogo | 🔲 |
| 3 | `copy-game-to-prefix.ts`: copiar + hash | 🔲 |
| 4 | Modal 1: `executable-candidate-modal.tsx + .scss` | 🔲 |
| 5 | Modal 2: `scanning-prefix-modal.tsx + .scss` | 🔲 |
| 6 | Modal 3: `copying-game-modal.tsx + .scss` | 🔲 |
| 7 | `open-game-installer.ts`: conectar tudo | 🔲 |
| 8 | `downloads.tsx`: integrar modais | 🔲 |
| 9 | Traduções em `src/locales/` | 🔲 |
| 10 | npm run typecheck + npm run build | 🔲 |

## Notas
- Criado: 22/05/2026
- Traduções via `react-i18next`, namespace "downloads"
- CSS separado por componente (padrão BEM)
- Ícones: usar `@primer/octicons-react` (já disponível no projeto)

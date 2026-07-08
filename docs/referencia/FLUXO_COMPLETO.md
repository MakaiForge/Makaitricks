# FLUXO COMPLETO DO PROTONFORGE

## Como o código DEVE funcionar (do início ao fim)

---

## CASO 1: ARQUIVO ÚNICO (.exe / .msi)

**Exemplo:** `/home/cas/Downloads/GenshinImpact_install_20260302_UGC.exe`

```
1. USUÁRIO CLICA "INSTALAR JOGO"
   │
2. SELETOR DE PROTON aparece
   │   └── Usuário escolhe versão
   │   └── Se não tem instalada → baixa + extrai
   │
3. CRIA PREFIXO na pasta correta do jogo
   │   └── Exemplo: /home/cas/games/ProtonForger/GenshinImpact/pfx/
   │   └── Baixa DLLs necessárias via Python API
   │   └── Prepara ambiente
   │
4. ABRE O ARQUIVO .exe DENTRO DO PREFIXO
   │   └── Umu.launchInstaller() ou Umu.launchExecutable()
   │   └── O instalador/jogo roda dentro do Wine/Proton
   │   └── TELA PARA USUÁRIO:
   │       "Feche assim que o jogo ou instalador abrir.
   │        No instalador, apenas feche quando terminar."
   │
5. USUÁRIO FECHA O PROGRAMA
   │
6. SCANNER VERIFICA DENTRO DO PREFIXO
   │   └── Tira snapshot ANTES de rodar (drive_c/)
   │   └── Tira snapshot DEPOIS que fechou (drive_c/)
   │   └── Compara: found().exe NOVOS ou com tamanho alterado
   │   └── Filtra arquivos modificados há mais tempo
   │   └── Ordena por data de modificação (mais recente primeiro)
   │   └── Pega TOP 5 candidatos
   │
   ├── 7a. ACHOU 1 OU MAIS .exe NOVOS?
   │      │
   │      ▼
   │   MODAL ("ExecutableCandidateModal") MOSTRA:
   │   ┌──────────────────────────────────────────┐
   │   │  "Encontramos estes executáveis no       │
   │   │   prefixo Wine."                         │
   │   │                                          │
   │   │  [📁] GenshinImpact.exe                  │
   │   │       Program Files/Genshin Impact/      │
   │   │                          52.3 MB         │
   │   │                                          │
   │   │  [📁] GenshinImpact_launcher.exe         │
   │   │       Program Files/Genshin Impact/      │
   │   │                          8.1 MB          │
   │   │                                          │
   │   │  (ATÉ 5 BOTÕES)                          │
   │   │                                          │
   │   │  [🔍 Não encontrou? Procure manualmente] │
   │   └──────────────────────────────────────────┘
   │      │
   │      ├── USUÁRIO CLICA NUM CANDIDATO
   │      │      └── handleExePicked(path)
   │      │             └── SALVA NA ABA JOGOS:
   │      │                 • Caminho do executável
   │      │                 • Caminho do prefixo
   │      │                 • Versão do Proton
   │      │
   │      └── USUÁRIO CLICA "PROCURE MANUALMENTE"
   │             └── openExeFilePicker(suggestedDir)
   │                    └── ABRE O DIÁLOGO EXATAMENTE
   │                        NA PASTA ONDE OS .exe
   │                        ESTÃO (dentro do prefixo)
   │                        Ex: .../pfx/drive_c/Program Files/Genshin Impact/
   │
   └── 7b. NÃO ACHOU .exe NOVO?
          │
          ▼
       MODAL:
       ┌──────────────────────────────────────────┐
       │  "Por favor, aguarde, estamos copiando   │
       │   o seu jogo, a pasta do jogo inteira    │
       │   para dentro do prefixo. Aguarde."      │
       └──────────────────────────────────────────┘
          │
          ▼
       COPIA A PASTA DO JOGO PARA O PREFIXO
       │   └── MAS SE É UM ARQUIVO ÚNICO,
       │       NÃO TEM O QUE COPIAR!
       │       → O código precisa MANUSEAR este caso
       │       → Se for .exe único e não instalou
       │         nada no prefixo, use o DIRETÓRIO
       │         PAI do .exe como "pasta do jogo"
       │
          ▼
       VERIFICA SE COPIOU TUDO (integridade)
          │
          ▼
       ESCANEIA DENTRO DO PREFIXO (findGameExecutables)
          │
          ├── ACHOU .exe?
          │      ▼
          │   MODAL:
          │   "Não encontramos seu jogo.
          │    Achamos alguns que podem ser."
          │   └── ATÉ 5 BOTÕES DE CANDIDATOS
          │        ├── Seleciona → SALVA
          │        └── "Busque manual" → ABRE NA
          │             PASTA COPIADA (dentro do prefixo)
          │
          └── NÃO ACHOU?
                 ▼
              suggestedDir = drive_c/
              "Busque manual" → ABRE NA RAIZ DO PREFIXO
              → USUÁRIO SELECIONA MANUALMENTE → SALVA

---

## CASO 2: PASTA

**Exemplo:** `/home/cas/Downloads/Black Fetal Movement [Agunosutosu]/`

```
1. USUÁRIO CLICA "INSTALAR JOGO"
   │
2. SELETOR DE PROTON
   │   └── Escolhe versão
   │
3. CRIA PREFIXO na pasta correta
   │   └── Ex: /home/cas/games/ProtonForger/Black Fetal Movement/pfx/
   │   └── DLLs, ambiente
   │
4. É UMA PASTA → PROCURA .exe DENTRO DA PASTA
   │   └── findExesInFolder(gamePath, depth=3)
   │   └── Exclui: uninstall.exe, vc_redist*, etc.
   │   └── Filtra: tamanho > 1024 bytes
   │   └── Ordena: data de modificação
   │   └── Top 5 candidatos
   │
   ├── 4a. ACHOU setup.exe / install.exe / autorun.exe?
   │      │
   │      ▼
   │   TRATA COMO INSTALADOR (mesmo fluxo do Caso 1)
   │   └── executeGameInstaller(installerPath)
   │        └── snapshot antes → roda installer →
   │            snapshot depois → scan → resultados
   │
   └── 4b. NÃO ACHOU INSTALADOR, mas ACHOU OUTROS .exe?
          │
          ▼
       MODAL:
       ┌──────────────────────────────────────────┐
       │  "Não temos certeza. Selecione seu       │
       │   executável ou instalador."             │
       │                                          │
       │  [📁] Game.exe             52.3 MB       │
       │  [📁] Launcher.exe         8.1 MB        │
       │                                          │
       │  (ATÉ 5 BOTÕES)                          │
       └──────────────────────────────────────────┘
          │
          ▼
5. USUÁRIO CLICA NUM .exe
   │
   ▼
6. 🔻 EXECUTA O .exe DENTRO DO PREFIXO (IMPORTANTE!)
   │   └── Umu.launchInstall() ou Umu.launchExecutable()
   │   └── snapshot ANTES de rodar
   │   └── TELA: "Feche quando o jogo/instalador terminar"
   │
7. USUÁRIO JOGA / INSTALA / FECHA
   │
8. snapshot DEPOIS → SCANNER VERIFICA PREFIXO
   │   └── findNewExecutables()
   │
   ├── 9a. ACHOU .exe NOVOS? → 5 botões → salva
   │
   └── 9b. NÃO ACHOU?
          │
          ▼
       "Copiando pasta do jogo para o prefixo..."
          │
          ▼
       COPIA A PASTA INTEIRA pro prefixo
          │   └── copyGameToPrefix(gamePath, winePrefixPath)
          │
          ▼
       VERIFICA INTEGRIDADE DA CÓPIA
          │
          ▼
       ESCANEIA DENTRO DO PREFIXO
          │   └── findGameExecutables(winePrefixPath)
          │
          ├── ACHOU? → 5 botões → salva
          │
          └── NÃO ACHOU?
                 ▼
              suggestedDir = drive_c/
              "Busque manual" → usuário seleciona
```

---

## O QUE ESTÁ QUEBRADO NO CÓDIGO ATUAL

### 1. Pasta sem setup.exe — o .exe escolhido NUNCA é executado

**Arquivo:** `src/main/events/library/open-game-installer.ts`

Linhas 309-319 (Modo 2b):
```typescript
/* sem installer → busca exe do jogo na pasta */
const folderExes = findExesInFolder(gamePath);
if (folderExes.candidates.length > 0) {
    return {
      wasOpened: false,  // ← "não abriu" — certo, mas...
      candidates: folderExes.candidates,
      suggestedDir: folderExes.suggestedDir,
    };
}
```

**Problema:** O renderer recebe os candidatos, mostra pro usuário, usuário clica, e o código SALVA DIRETO (`handleExePicked → setGameExecutablePath`). **O jogo nunca roda.** O scanner nunca roda.

**O que deveria acontecer:** Depois que o usuário seleciona um .exe da pasta, o código DEVERIA:
1. Executar aquele .exe dentro do prefixo (igual o `executeGameInstaller` faz)
2. Aguardar fechar
3. Escanear o prefixo
4. Mostrar OS RESULTADOS DO ESCANEAMENTO (não os arquivos da pasta)

**Renderizador:** `src/renderer/src/pages/downloads/downloads.tsx`
Linha ~181-198: o `handleSelectProton`/`handleDownloadAndSelect` tratam `result.candidates` como FINAIS, não como "escolha qual executar primeiro".

---

### 2. "Busque manual" abre na raiz do prefixo em vez da pasta correta

**Arquivo:** `src/main/events/library/open-game-installer.ts`

Quando `newExes.length === 0` OU `changed === false` E não há `gameKey`:
```typescript
return {
    wasOpened: true,
    candidates: [],
    suggestedDir: driveCPath,  // ← RAIZ DO drive_c!
};
```

**Problema:** O `suggestedDir` é a raiz do `drive_c`. O "Busque manual" abre lá. O usuário precisa navegar manualmente por pastas e subpastas até achar o jogo.

**O que deveria ser:** Se o instalador instalou em `Program Files/Genshin Impact/`, o `suggestedDir` deveria ser `drive_c/Program Files/Genshin Impact/` — a pasta onde os .exe realmente estão.

---

### 3. Arquivo único sem pasta pai não tem o que copiar

Para .exe único que não modifica o prefixo (ex: jogo portátil), o código tenta `copyGameToPrefix` mas não tem pasta para copiar porque o jogo é um único arquivo.

**O que deveria acontecer:** Usar o diretório PAI do .exe como "pasta do jogo" e copiá-la para o prefixo.

---

### 4. `wasOpened` não é usado para nada no renderizador

**Arquivo:** `src/renderer/src/pages/downloads/downloads.tsx`

O campo `wasOpened` é retornado pelo `openGameInstaller` mas o renderizador **nunca verifica ele**. Quando `wasOpened: false` (caso pasta), o renderizador deveria:
1. Mostrar a lista de .exe da pasta
2. Quando usuário escolher um → CHAMAR `executeGameInstaller` com o caminho escolhido
3. Aguardar o resultado do escaneamento
4. MOSTRAR O RESULTADO DO ESCANEAMENTO

---

## ARQUIVOS ENVOLVIDOS

| Arquivo | Papel |
|---------|-------|
| `src/main/events/library/open-game-installer.ts` | Handler principal do "Instalar jogo" |
| `src/main/events/library/install-game-folder.ts` | Handler alternativo (pode ser o correto para pasta) |
| `src/renderer/src/pages/downloads/downloads.tsx` | UI que recebe resultados e mostra modais |
| `src/renderer/src/pages/downloads/components/executable-candidate-modal.tsx` | Modal de candidatos pós-escaneamento |
| `src/main/helpers/find-game-exe.ts` | Escaneia prefixo inteiro (depth 6) |
| `src/main/helpers/find-exe-in-folder.ts` | Escaneia pasta do jogo (depth 3) |
| `src/main/services/proton/extractor.ts` | Extração de Proton (já corrigido) |
| `src/main/events/proton/install-game-with-proton.ts` | Download/instalação de Proton (já corrigido) |

---

## CORREÇÕES JÁ FEITAS (não mexer)

### Proton fallback
- `src/main/services/proton/extractor.ts` — detecta diretório real da extração
- `src/main/services/proton/index.ts` — `downloadTool` retorna `string | null`
- `src/main/services/proton/manager.ts` — wrapper atualizado
- `src/main/events/proton/install-game-with-proton.ts` — sem recomputação, sem fallback

### WINE_INTERNAL_DIRS
- `src/main/events/library/open-game-installer.ts` — removido `Program Files/`, `Program Files (x86)/`
- `src/main/events/library/install-game-folder.ts` — removido `Program Files/`, `Program Files (x86)/`

---

## O QUE AINDA PRECISA SER CORRIGIDO

### 1. Fluxo da pasta: executar .exe escolhido antes de escanear

No `open-game-installer.ts` (Modo 2b), quando não tem setup.exe mas tem outros .exe:

```typescript
// Em vez de retornar candidates direto:
return {
    wasOpened: false,
    candidates: folderExes.candidates,
    suggestedDir: folderExes.suggestedDir,
};

// DEVERIA retornar com wasOpened:false MAS o renderizador
// PRECISA tratar isso como "escolha qual .exe rodar",
// não como "escolha qual .exe salvar"
```

No `downloads.tsx`, quando `wasOpened === false` e o usuário seleciona um candidato:

```typescript
// Em vez de salvar direto:
handleExePicked(path) → setGameExecutablePath(...)

// DEVERIA:
// 1. Chamar executeGameInstaller(path) ou installGameExe()
// 2. Aguardar scan
// 3. Mostrar NOVOS candidatos do scan (do prefixo)
// 4. Usuário seleciona → salva
```

### 2. "Busque manual" abrir na pasta correta

Garantir que `suggestedDir` aponte para a subpasta dentro do prefixo onde os .exe estão, não para a raiz `drive_c/`.

### 3. Arquivo único sem pasta para copiar

No `executeGameInstaller`, quando o instalador não modifica o prefixo:
- Se for um arquivo único, usar `path.dirname(filePath)` como pasta de origem
- Copiar essa pasta para o prefixo
- Escanear dentro do prefixo

---

## COMO COMPILAR E TESTAR

```bash
# 1. Instalar dependências
cd /home/cas/Documentos/protonforgerfull
yarn install

# 2. Verificar tipo
npm run typecheck:node

# 3. Compilar
npm run build

# 4. Rodar em modo dev
npm run dev

# 5. Ver logs
# Os logs aparecem no console do Electron
# Para logs detalhados, executar com:
# electron . --enable-logging

# 6. Para testar compilação Linux:
npm run build:linux
```

---

## LOGS PARA DEPURAÇÃO

Se algo ainda estiver errado, executar:

```bash
cd /home/cas/Documentos/protonforgerfull
npm run dev 2>&1 | tee /tmp/protonforge.log
```

Os logs importantes estão marcados com `[executeGameInstaller]`, `[downloadProtonByFork]`, `[installGameExe]`, etc. Eles mostram:
- `snapshotBefore` → quantos arquivos antes
- `snapshotAfter` → quantos arquivos depois
- `hasMeaningfulChanges` → true/false
- `findNewExecutables` → quantos .exe novos encontrados
- `suggestedDir` → para onde o "Busque manual" aponta
- `copyGameToPrefix` → se a cópia foi feita

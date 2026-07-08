# Fluxo de Instalação — ProtonForge

## Visão Geral

Quando o usuário clica **"Instalar"** em um jogo baixado, o aplicativo deve:

1. **Abrir o gerenciador de instalação** (modal de recomendação) — **NUNCA** abrir a pasta do jogo
2. Deixar o usuário escolher entre **Automático** (recomendado pelo app) ou **Manual** (Proton já instalado)
3. Executar todo o pipeline: download do Proton (se necessário) → criação do prefixo → instalação de DLLs → execução do instalador → limpeza

---

## 1. Gerenciador de Instalação (Modal)

### Acionamento
- Quando o usuário clica "Instalar" em um jogo baixado
- **IMPOSSIBILITAR** o fallback que abre a pasta — se não conseguir determinar o `.exe`, **ainda assim abre o modal**

### Funcionamento
- Se o jogo **já tem** `protonPath` salvo → pula o modal, executa o instalador direto
- Se **não tem** `protonPath`:
  - Busca recomendação via API Python (`recommend_proton`)
  - Exibe o modal com:
    - **Recomendação primária** (tier gold/platinum/etc.)
    - **Alternativas**
    - **Seleção manual** (só Protons instalados)

---

## 2. Escolha Automática (Recomendado)

Usuário clica no Proton recomendado (ex: "GE-Proton 10-28 — Gold").

### 2.1 Se o Proton **não** está instalado
1. Botão **"Baixar e Instalar"** aparece no modal
2. Ao clicar:
   - Mapeia o fork (ex: `"GE-Proton"`) para o toolId (`"proton-ge"`)
   - Busca release em `data/releases/proton-ge.json` que corresponde à versão
   - **Baixa o Proton** via `downloadProtonTool` (com progresso na UI)
   - Extrai na pasta de compat-tools
   - Após download, descobre o `protonPath` final

### 2.2 Se o Proton **já** está instalado
- Usa o `protonPath` direto da lista de instalados

### 2.3 Criar o Prefixo
- Diretório do prefixo: `$HOME/.local/share/protonforge/games/{objectId}/`
- Terceirizar para `ProtonRecommendationService.createPrefix()` via API Python
- A API Python:
  1. Cria o diretório do prefixo
  2. Executa `wineboot -u` para inicializar o prefixo com o Proton correto
  3. Configura arquitetura (win64)
  4. Instala DLLs essenciais (vcrun2022, d3dcompiler_47, xact)
  5. Retorna `{ success, prefix_path, initialized, dlls_installed, errors }`

### 2.4 Instalar DLLs do Jogo
- Chamar `get_recommended_dlls(gameId)` via API Python
- A API retorna DLLs essenciais e opcionais para o jogo específico
- Instalar via winetricks ou diretamente copiando para o prefixo
- DLLs comuns para jogos: `mfplat`, `dxvk`, `vcrun`, `dotnet`, etc.

### 2.5 Executar o Instalador
- Determinar qual `.exe` rodar:
  - Procurar `setup.exe`, `install.exe`, `launcher.exe`, `*.msi`
  - **Se múltiplos `.exe`**: mostrar seletor para o usuário (NUNCA abrir pasta)
  - Se apenas um `.exe`: usar ele
- Chamar `get_launch_command(gameId, prefixPath, protonPath, executable)` via API Python
- A API retorna `{ command, args, env_vars }`
- Executar com `umu-run` e as env vars configuradas

### 2.6 Monitorar Instalação
- Acompanhar o processo do instalador
- Quando o processo **fecha**: considerar instalação concluída
- Rodar pós-instalação:
  - Detectar executável principal do jogo (procurar `.exe` que não é instalador)
  - Salvar no registro do jogo
  - Limpar o instalador (setup.exe) da pasta?

### 2.7 Primeira Execução ("Jogar")
- Se o jogo **não** tem executável salvo:
  - Escanear pasta do jogo por `.exe` principal
  - Salvar no armazenamento
- Executar com `umu-run` + prefixo + Proton
- Se for um launcher (Genshin, etc.), ele gerencia updates sozinho

---

## 3. Escolha Manual

### Pré-requisito
- Usuário **já baixou** o Proton manualmente via **Proton Tools**
- A lista manual só mostra **Protons instalados na máquina**

### Fluxo
1. Usuário expande um grupo (ex: "GE-Proton")
2. Escolhe uma versão específica instalada
3. Clica "Instalar com ..."
4. Mesmo fluxo do automático **a partir da criação do prefixo** (2.3 em diante)
5. **Não baixa Proton** — usa o que já está instalado

---

## 4. Regras de Negócio

| Situação | Comportamento |
|----------|--------------|
| Nenhum Proton instalado | Redirecionar para Proton Tools |
| Proton recomendado não instalado | Oferecer "Baixar e Instalar" |
| Proton recomendado instalado | Selecionar direto |
| Múltiplos `.exe` na pasta | Mostrar seletor pro usuário |
| Instalador fechou | Instalação concluída, detectar .exe do jogo |
| Primeira execução do jogo | Detectar executável principal |

## 5. Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/renderer/src/pages/downloads/downloads.tsx` | Orquestra o fluxo |
| `src/renderer/src/pages/downloads/components/proton-recommendation-modal.tsx` | Modal de recomendação |
| `src/main/events/proton/install-game-with-proton.ts` | IPC: downloadProtonByFork |
| `src/main/events/library/open-game-installer.ts` | Execução do instalador + prefixo |
| `src/main/services/proton-recommendation.ts` | RPC para API Python |
| `src/main/services/proton/tools.ts` | Mapeamento fork → toolId |
| `src/main/services/umu.ts` | Execução com umu-run |

---

## 6. O que ainda precisa ser implementado / corrigido

- [ ] **Bug**: quando múltiplos `.exe` existem, abrir seletor ao invés da pasta
- [ ] **Monitoramento**: detectar quando o instalador fechou
- [ ] **Pós-instalação**: detectar executável principal do jogo e salvar
- [ ] **Seletor de `.exe`**: componente UI para escolher qual executável rodar
- [ ] **Tracker de progresso**: mostrar progresso do download + instalação na UI

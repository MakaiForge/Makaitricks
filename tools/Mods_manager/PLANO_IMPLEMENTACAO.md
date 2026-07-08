# Plano de Implementação — Configuração de Jogos (Mod Manager)

## Fase 0: Fundação — Game DLL Database
**Arquivo:** `tools/Mods_manager/data/game-dlls.json`

Banco de dados central com configuração por jogo:
- `gameId`: identificador único
- `name`: nome legível
- `steamIds[]`: App IDs Steam
- `detectExe`: nome do executável pra detecção
- `wineDllOverrides`: DLL overrides (Amethyst pattern)
- `winetricks`: componentes winetricks
- `autoInstallDeps`: dependências (vcredist, d3dcompiler_47)
- `scriptExtender`: info do SE (nome, URL, loader.exe)
- `registryTweaks[]`: tweaks de registro adicionais
- `reshade`: DLL + arch

---

## Fase 1: Detecção de Jogo
**Arquivos:**
- `tools/Mods_manager/services/detection/detect-steam.ts`
- `tools/Mods_manager/services/detection/detect-gog.ts`
- `tools/Mods_manager/services/detection/index.ts`
- UI: popup de detecção + auto-config

### Fluxo:
1. Usuário seleciona jogo na lista OU clica "Adicionar Jogo"
2. Sistema tenta detectar automaticamente:
   - **Steam:** varre `~/.steam/steam/steamapps/appmanifest_*.acf` → match por nome ou AppID
   - **GOG/Heroic:** lê config do Heroic Games Launcher
   - **Manual:** fallback — usuário navega até a pasta
3. Se detectado → preenche path do jogo + seta paths padrão:
   - `~/Games/Mods/<nome-do-jogo>/`
   - `~/Games/Prefix/<nome-do-jogo>/`
4. Se não detectado → popup pra seleção manual
5. Tudo salvo em `gameConfig` via electron store

### Paths Padrão:
```
Game Path:    ~/.steam/steam/steamapps/common/Skyrim Special Edition/
Mods Dir:     ~/Games/Mods/Skyrim Special Edition/
Prefix Dir:   ~/Games/Prefix/Skyrim Special Edition/
Proton:       auto-detectado (Steam Proton ou GE)
```

---

## Fase 2: Health Check + Auto-fix do Prefixo
**Arquivos:**
- `tools/Mods_manager/services/prefix/health-check.ts`
- `tools/Mods_manager/services/prefix/dll-overrides.ts`
- `tools/Mods_manager/services/prefix/registry-tweaks.ts`

### O que acontece quando o jogo é selecionado:
1. **Verificar** se prefixo existe, se `user.reg` é legível
2. **Comparar** DLL overrides atuais vs. esperadas (do game-dlls.json)
3. **Corrigir** se divergirem (escrever no `[Software\\\\Wine\\\\DllOverrides]`)
4. **Aplicar** registry tweaks específicos do jogo
5. **Logar** o que foi alterado

### Disparado em:
- Seleção de jogo na UI
- Antes de iniciar o jogo
- Botão manual "Reparar Prefixo"

---

## Fase 3: Reforma do GameConfigPanel
**Arquivo:** `tools/Mods_manager/ui/components/GameConfigPanel/GameConfigPanel.tsx`

### Remover (6 botões inúteis):
- ❌ winecfg (linha 129)
- ❌ regedit (linha 130)
- ❌ Detect Tools (linha 138)
- ❌ Check SE (linha 167)
- ❌ Install SE (linha 170)
- ❌ Discover (linha 178)

### Adicionar:

#### Seção: "DLL Overrides"
- Lista de DLLs do jogo (carregada do game-dlls.json)
- Cada DLL com checkbox (ativada/desativada) + modo (native, builtin, etc.)
- Botão "Aplicar" → escreve no user.reg do prefixo
- Botão "Reparar" → corrige automaticamente

#### Seção: "Dependências"
- Botão "Instalar vcredist" → baixa e executa `vc_redist.x64.exe` via Proton
- Botão "Instalar d3dcompiler_47" → DLL fxc2 build da Mozilla
- Status de cada dependência (instalada/não)

#### Seção: "Script Extender"
- Nome do SE (ex: "SKSE64")
- Status: ✅ Instalado / ❌ Não encontrado
- Botão "Baixar & Instalar" → download + extração no game path
- Versão detectada

#### Seção: "Registry Tweaks"
- Lista de tweaks específicos do jogo
- Switch pra ativar/desativar cada um
- Botão "Aplicar" → escreve no user.reg

---

## Fase 4: Contextual Proton API
**Arquivos:**
- `data/install-api/proton_recommended/python/bridge/bridge.py` (modificar)
- `tools/Mods_manager/services/bridge/bridge-client.ts`

### Comportamento:
- Quando chamada do Mod Manager, API usa o prefixo configurado no gameConfig
- Quando chamada do Proton Tools, API usa o prefixo selecionado na UI
- A API recebe `context: { source: "mod-manager" | "proton-tools", gameId: string }`
- Bridge do Python retorna qual prefixo está ativo

### Fluxo:
```
Mod Manager → electron IPC → bridge.py (com context) → opera no prefixo certo
```

---

## Fase 5: UI de Detecção + Popups
**Arquivos:**
- `tools/Mods_manager/ui/components/GameDetectionWizard/` (novo)
- `tools/Mods_manager/ui/components/Modals/`

### Wizard de Detecção:
1. Passo 1: "Detectando..." animação
2. Passo 2: Resultado — "Encontrado: Skyrim SE via Steam"
3. Passo 3: Confirma paths sugeridos
4. Passo 4: "Configuração salva! Deseja instalar dependências agora?"

### Health Check Banner:
- Banner verde: "Prefixo configurado corretamente"
- Banner amarelo: "DLL overrides desatualizados — clique em Reparar"
- Banner vermelho: "Prefixo não encontrado — clique em Criar"

---

## Ordem de Implementação

```
Fase 0: game-dlls.json (catálogo inicial com 10+ jogos)
Fase 1: Detecção Steam/GOG/Manual + paths padrão
Fase 3: Nova UI do GameConfigPanel (lê do JSON)
Fase 2: Health Check + Auto-fix
Fase 4: API Proton contextual
Fase 5: Wizards + Banners
```

**Nota:** Fase 2 depende da Fase 0 (precisa do JSON pra saber o que verificar).  
Fase 3 também depende da Fase 0.  
Fase 1 e 0 podem ser paralelas.

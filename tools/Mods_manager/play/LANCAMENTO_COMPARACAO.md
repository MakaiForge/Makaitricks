# Comparação: Launch Flow — Amethyst vs Makai-Forge

**Skyrim LE (AppID 72850)** — Foco no que é necessário pro jogo abrir.

---

## 1. Fluxo de Launch no Amethyst

```
1. Resolve Proton Script
   → CompatToolMapping no Steam config.vdf
   → config_info no prefixo
   → find_any_installed_proton()

2. Monta ambiente (env vars):
   STEAM_COMPAT_DATA_PATH       = <compatdata/<id>/>      ← pasta do prefixo
   STEAM_COMPAT_CLIENT_INSTALL_PATH = <Steam root/>       ← runtime do Proton
   STEAM_COMPAT_INSTALL_PATH    = <game path/>            ← onde está o jogo
   SteamAppId / SteamGameId     = appID                   ← identifica o jogo

3. Se Proton é custom (GE-Proton, não o built-in do Steam):
   → Registra Bethesda no prefixo (HKLM)
   → link_plugins_txt()          ← symlink plugins.txt para My Games/
   → link_mygames()              ← symlink My Games/<Game>/ DO Steam p/ custom prefix

4. Executa: python3 <proton> run <exe> <args>
```

### `link_mygames()` — O QUE FAZ
Quando o usuário usa GE-Proton (não o Proton built-in do Steam), o prefixo custom
não tem o diretório `My Games/<Game>/` com os INIs e saves. O Amethyst copia
(symlink) esse diretório do prefixo Steam original para o prefixo custom.

**Sem isso:** Skyrim LE não encontra `Skyrim.ini`/`SkyrimPrefs.ini` → abre com defaults
ou fecha silenciosamente.

---

## 2. Fluxo de Launch no Makai-Forge (atual)

```
play-game.ts:
  step1 detect   → ✅ detecta jogo (Steam ou manual), salva config
  step2 proton   → ✅ resolve protonPath (config → global → Steam → umu-run)
  step3 prefix   → ✅ cria/valida prefixo via Python
  step4 configs  → ✅ DLL overrides + winetricks + Bethesda registry
  step5 skse     → ✅ download/verifica SKSE
  step6 launch   → launch via Python runner (runPythonCommand("run", ...))
```

---

## 3. Gaps Encontrados

### 🔴 CRÍTICO: `STEAM_COMPAT_DATA_PATH` vs `compatdata`

| Item | Amethyst | Makai-Forge |
|------|----------|-------------|
| `STEAM_COMPAT_DATA_PATH` | `~/.steam/steam/steamapps/compatdata/72850/` | `prefixPath` (o `pfx/`) |
| `STEAM_COMPAT_CLIENT_INSTALL_PATH` | `~/.steam/steam/` (Steam root) | ✅ setado via `venv.ts` |
| `STEAM_COMPAT_INSTALL_PATH` | `~/Games/Skyrim/` | ❌ **NÃO SETADO** |
| `SteamAppId` / `SteamGameId` | 72850 | ✅ setado no env |

**Problema:** Proton espera `STEAM_COMPAT_DATA_PATH` apontar para `compatdata/<id>/`
(que contém `pfx/`), não diretamente para `pfx/`. Nosso `runner.py` tá setando
`STEAM_COMPAT_DATA_PATH` como o prefixPath (o pfx). Isso pode fazer Proton não
achar o diretório de compatibilidade direito.

### 🟡 MÉDIO: `link_mygames()` — INI/Saves ausentes

Quando o jogo é Steam mas o Proton é GE-Proton custom, o prefixo criado pelo
GE não tem o diretório `My Games/<Game>/`. O Skyrim precisa de:
- `drive_c/users/steamuser/Documents/My Games/Skyrim/Skyrim.ini`
- `drive_c/users/steamuser/Documents/My Games/Skyrim/SkyrimPrefs.ini`

**Amethyst** symlinka esses arquivos do prefixo Steam original.  
**Nós** não fazemos isso — se o prefixo for novo, os INIs não existem.

### 🟡 MÉDIO: `link_plugins_txt()` — plugins.txt ausente

Se o jogo usa `plugins.txt` para load order (Skyrim LE sim, `_plugin_load_order_by_mtime = False`),
o arquivo precisa estar em `My Games/Skyrim/` dentro do prefixo. Sem ele, o jogo
pode ignorar plugins ESP.

### 🟢 BAIXO: Rastreamento de dependências

Amethyst tem `amethyst_deps.json` no prefixo marcando o que já foi instalado
(vcredist, d3dcompiler_47). Nós instalamos toda vez. Não quebra nada, mas é
lento.

### 🟢 BAIXO: Launcher swap (SKSE como launcher)

Amethyst renomeia `SkyrimLauncher.exe` → `SkyrimLauncher.exe.amethyst.bak` e
copia `skse_loader.exe` como `SkyrimLauncher.exe` para o Steam chamar o SKSE
automaticamente. Nós ignoramos isso (lançamos direto pelo Proton com SKSE),
então não é necessário.

---

## 4. O Que Precisa Ser Feito — Status

### 🔴 Crítico (corrigidos)

| # | Item | Antes | Depois | Arquivos |
|---|------|-------|--------|----------|
| 1 | `STEAM_COMPAT_DATA_PATH` sobrescrito com `pfx/` em vez de `compatdata/<id>/` | `cmd_run` passava `prefixPath` como `compat_data_path` → `runner.py` sobrescrevia o env | `runner.py` usa `setdefault` (não sobrescreve se já setado). `cli.py` lê do env, não de arg posicional. `06-launch.ts` seta `compatdata/<id>/` ou pfx-parent corretamente. | `runner.py`, `cli.py`, `06-launch.ts` |
| 2 | `STEAM_COMPAT_CLIENT_INSTALL_PATH` apontava pra pasta do Proton (`proton.parent`) em vez do Steam root | `runner.py` setava `str(proton.parent)` (ex: `.../steamapps/common/GE-Proton-10/`) | `06-launch.ts` seta `findSteamClientPath()` (ex: `~/.steam/steam/`). `runner.py` só seta default se env não tiver. | `runner.py`, `06-launch.ts` |

### 🟡 Médio (corrigidos)

| # | Item | Antes | Depois | Arquivos |
|---|------|-------|--------|----------|
| 3 | `My Games/<Game>/` não existia em prefixos novos | Silenciosamente ausente, jogo podia fechar sem INIs | `04-configs.ts` agora cria `drive_c/users/steamuser/Documents/My Games/<game>/` e copia INIs do prefixo Steam se disponível | `04-configs.ts` |

### 🟢 Futuro (não crítico pro launch básico)

| # | Item | Nota |
|---|------|------|
| 4 | Cache de dependências instaladas | Evitar reinstalar vcredist toda vez |
| 5 | `link_plugins_txt()` | Symlink do plugins.txt pro `My Games/` (Skyrim LE usa `%LOCALAPPDATA%`, não `My Games`) |
| 6 | Launcher swap (SKSE como launcher) | Não necessário: lançamos direto via Proton com SKSE |

---

## 5. State dos Arquivos Relacionados

| Arquivo | Status | Observação |
|---------|--------|------------|
| `play/steps/03-prefix.ts` | ✅ OK | Cria/valida prefixo via Python |
| `play/steps/04-configs.ts` | ✅ OK | DLL overrides + winetricks + registry + My Games |
| `play/steps/06-launch.ts` | ✅ OK | Launch via Python com env vars corretas |
| `tools/prefix/python/cli.py` | ✅ OK | `run` agora lê env, não arg posicional |
| `tools/prefix/python/prefix/runner.py` | ✅ OK | Usa `setdefault` em vez de sobrescrever |
| `tools/prefix/python/prefix/core.py` | ✅ OK | create_prefix |
| `tools/prefix/python/prefix/winetricks.py` | ✅ OK | install DLLs |
| `tools/prefix/core/bethesda-registry.ts` | ✅ OK | Registry seeding |
| `tools/prefix/core/dll-overrides.ts` | ✅ OK | DLL overrides |
| `tools/prefix/core/steam-paths.ts` | ✅ OK | `findSteamClientPath()` usado |
| `tools/Mods_manager/play/python.ts` | ✅ OK | Helper de Python venv |

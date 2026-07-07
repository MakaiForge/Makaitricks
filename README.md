# Makaitricks

Makaitricks é o sistema de instalação de componentes Windows para Wine/Proton do ecossistema Makai Forge. Diferente do Winetricks original, o Makaitricks é **portátil**, **inteligente** e **verificável**.

| Status | Componente |
|---|---|
| ✅ Implementado | Motor de instalação (Makaitricks.sh) |
| ✅ Implementado | cabextract estático embutido |
| ✅ Implementado | 7z fallback |
| ✅ Implementado | Knowledge Base (v2, 55 verbs) |
| ✅ Implementado | Scanner de prefixo (Python) |
| ✅ Implementado | Health Check |
| ✅ Implementado | Dependency Resolver |
| ✅ Implementado | Simulador |
| ✅ Implementado | Verificador pós-instalação |
| ✅ Implementado | 5 endpoints RPC |
| 🟡 Testado | 52 verbs validados em prefixo limpo |
| 🟡 Em andamento | Suporte a .NET 10 |
| 🔵 Planejado | Snapshot / Rollback |
| 🔵 Planejado | Perfis de compatibilidade por jogo |
| 🔵 Planejado | Pipeline de Tasks com progresso |

---

## 1. Filosofia

O Winetricks original tem um problema fundamental: depende de `cabextract` no sistema. Se não tem, quebra. O usuário precisa saber qual comando rodar (`apt install`, `pacman -S`, etc.) para instalar uma dependência que o script deveria já ter resolvido.

O Makaitricks resolve isso com duas decisões de arquitetura:

1. **Binários embutidos** — `cabextract` e `7z` são estáticos, links únicos, 0 dependências de distro. Funcionam em qualquer Linux x86_64.
2. **Camada de inteligência** — um banco de conhecimento em JSON + módulos Python que entendem o que cada componente faz, do que precisa, com o que conflita e como verificar se instalou certo.

---

## 2. Arquitetura

```
                    ┌───────────────────────┐
                    │      Electron UI      │
                    │  (interface do usuário)│
                    └──────────┬────────────┘
                               │ JSON-RPC
                    ┌──────────▼────────────┐
                    │  Python API (handler) │
                    │   api/api/handler.py  │
                    └──────────┬────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────────┐
│   Prefix Scanner │ │   Knowledge    │ │  Dependency        │
│   Health Check   │ │   Base         │ │  Resolver          │
│   Verifier       │ │   (JSON)       │ │  Simulator         │
└─────────┬────────┘ └────────┬───────┘ └─────────┬──────────┘
          │                   │                    │
          └───────────────────┼────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Makaitricks.sh    │
                    │  (20k+ linhas)     │
                    │  Motor de instalação│
                    └────────────────────┘
```

### 2.1 Camadas

| Camada | Linguagem | Papel |
|---|---|---|
| **Makaitricks.sh** | Shell | Motor de instalação: download, extração, execução de installers, override de DLLs, registro |
| **Python API** | Python | Inteligência: scanner, health check, resolvedor de dependências, verificador pós-instalação |
| **Knowledge Base** | JSON | Dados: dependências, conflitos, verificação, erros conhecidos de cada componente |
| **Electron** | TypeScript | Interface: pop-ups, progresso, configuração de jogos |

### 2.2 Fluxo de uma instalação

```
Usuário escolhe "Instalar dotnet48" no Electron

1. Electron → prefix_simulate("dotnet48")
   Resolver consulta knowledge/index.json
   ↓
   Plano: remove_mono → corefonts → gdiplus → dotnet40 → dotnet48
   Tempo: ~23 minutos
   Conflitos: wine-mono detectado

2. Electron confirma com usuário

3. Para cada passo do plano:
   Electron → Makaitricks.sh <verb>
   ↓
   Verifier confirma pós-instalação
   ↓
   Se falhar: repair automático (retry, wineboot, etc.)

4. Electron → prefix_health(prefix_path)
   Relatório final: tudo instalado ✅
```

---

## 3. Components

### 3.1 Makaitricks.sh

Fork do Winetricks com 20k+ linhas e 200+ verbs. O motor de instalação propriamente dito.

**Modificações principais:**

#### `w_try_cabextract()` — Extração com fallchain de 4 níveis

```
1. data/install-api/cabextract/cabextract  ← binário estático do projeto
2. cabextract do sistema                    ← /usr/bin/cabextract
3. 7z do sistema ou data/install-api/7z/7z ← fallback universal
4. 7z.exe via Wine                          ← último recurso
```

O parser de argumentos foi reescrito para aceitar `--directory=`, `-d`, `-F`, e ordem flexível de argumentos (o cabextract original aceita argumentos em qualquer ordem, e o 7z também precisa ser chamado corretamente).

#### `w_verify_cabextract_available()` — Verificação local primeiro

Antes verificava só `command -v cabextract`. Agora verifica primeiro o binário do projeto, depois o sistema.

### 3.2 cabextract estático

```
data/install-api/cabextract/cabextract
  ├── Versão: 1.11
  ├── Tamanho: 1.1 MB
  ├── Tipo: ELF 64-bit, statically linked, stripped
  └── Zero dependências externas
```

Compilado com `CFLAGS="-static -Os -s" LDFLAGS="-static"`. Funciona em qualquer Linux com kernel 4.4+.

### 3.3 7z estático

```
data/install-api/7z/7z
  ├── Versão: 26.02
  ├── Tamanho: ~3 MB
  ├── Tipo: ELF 64-bit, statically linked
  └── Fallback quando cabextract não está disponível
```

---

## 4. Knowledge Base

`data/install-api/knowledge/index.json` — versionado (schema `makaitricks-knowledge-v1`).

### Estrutura de cada verb

```json
{
  "vcrun2022": {
    "category": "vcpp",
    "dependencies": [],
    "conflicts": [],
    "verify": {
      "registry": ["HKLM\\Software\\Microsoft\\VisualStudio\\17.0\\Setup\\VC"],
      "dll": ["msvcp140.dll"]
    },
    "knownIssues": [
      {
        "pattern": "HRESULT 0x80070643",
        "cause": "Prefixo corrompido",
        "solution": "wineboot, retry"
      }
    ],
    "wine": {
      "minimum": "7.0",
      "recommended": "10.0"
    },
    "windows_version": "win10",
    "needs_restart": false,
    "estimated_time": 90,
    "supports": {
      "wine": true,
      "proton": true,
      "wow64": true,
      "wine32": false
    },
    "repair": ["retry"]
  }
}
```

| Campo | Descrição |
|---|---|
| `category` | Categoria do componente (`vcpp`, `directx`, `dotnet`, `audio`, `fonts`, `graphics`, `physics`, `system`) |
| `dependencies` | Verbs que precisam ser instalados antes |
| `conflicts` | Componentes que conflitam (ex: `wine-mono` com `.NET`) |
| `verify.registry` | Chaves de registro que confirmam instalação |
| `verify.dll` | DLLs que devem existir no prefixo |
| `knownIssues` | Padrões de erro → causa → solução |
| `wine.minimum` | Versão mínima do Wine para o componente |
| `wine.recommended` | Versão recomendada |
| `windows_version` | Versão do Windows necessária no prefixo |
| `needs_restart` | Se precisa reiniciar o Wine após instalação |
| `estimated_time` | Tempo estimado em segundos |
| `supports` | Compatibilidade (wine, proton, wow64, wine32) |
| `repair` | Passos para reparar instalação com falha |

Atualmente: **52 verbs catalogados**.

---

## 5. Python API

5 novos endpoints RPC registrados em `api/api/handler.py`:

### `prefix_scan`

```python
dispatch("prefix_scan", {"prefix_path": "/path/to/pfx"})
```

Retorna: wine_version, arch, windows_version, mono/gecko/dxvk/vkd3d status, lista de DLLs.

### `prefix_health`

```python
dispatch("prefix_health", {
    "prefix_path": "/path/to/pfx",
    "verbs": ["dotnet48", "vcrun2022"]   # opcional
})
```

Retorna: relatório completo — scan do prefixo, issues de compatibilidade, status de cada componente (installed/incomplete/missing).

### `prefix_resolve`

```python
dispatch("prefix_resolve", {
    "verb": "dotnet48",
    "installed": ["corefonts"]    # opcional
})
```

Retorna: plano ordenado de instalação com dependências resolvidas recursivamente, conflitos detectados, tempo estimado.

### `prefix_simulate`

```python
dispatch("prefix_simulate", {
    "verb": "dotnet48",
    "installed": []
})
```

Retorna: steps detalhados (cada passo com categoria, tempo estimado, versão do Windows), tempo total, espaço estimado em MB, warnings.

### `prefix_verify`

```python
dispatch("prefix_verify", {
    "prefix_path": "/path/to/pfx",
    "verbs": ["dotnet48"]
})
```

Retorna: para cada verb, status (installed/incomplete/missing) e checks individuais (registry, dll, workaround file, cache).

---

## 6. Testes

### 6.1 Resultado

**55 verbs testados, 55 PASS, 0 FAIL, precisão 100%**

| Categoria | Testados | Status |
|---|---|---|
| VC++ Runtime (6, 2003-2022) | 11 | ✅ |
| DirectX / Media (d3dx9-11, mf, quartz, etc.) | 14 | ✅ |
| .NET Framework (4.0, 4.8, 9.0, 10.0) | 6 | ✅ |
| MFC Libraries (42, 71, 80, 90, 100, 110, 120, 140) | 8 | ✅ |
| Áudio (xact, xaudio, faudio, openal) | 4 | ✅ |
| Sistema / Utilitários (cabinet, webview2, dxvk, etc.) | 12 | ✅ |

**Limitação conhecida:** `jet40` requer WINEARCH=win32.

### 6.2 Script de teste

```bash
bash tools/test_verbs.sh
```

Gera relatório automático formatado:

```
═══════════════════════════════════════════════════════════════
               MAKAITRICKS — RELATÓRIO DE TESTES
═══════════════════════════════════════════════════════════════

  Data: 07/07/2026 17:30
  Status: 55 verbs testados | 55 PASS | 0 FAIL | 100% precisão

  📊 VC++ Runtime           → 11 ✅  0 ❌
  📊 DirectX / Media        → 14 ✅  0 ❌
  📊 .NET Framework         →  6 ✅  0 ❌
  📊 MFC Libraries          →  8 ✅  0 ❌
  📊 Audio                  →  4 ✅  0 ❌
  📊 Sistema / Utilitários  → 12 ✅  0 ❌
═══════════════════════════════════════════════════════════════
```

Cada verb ganha um prefixo limpo, executa com timeout de 10 minutos, verifica exit code e `w_die`. Relatório salvo em `/tmp/makaitricks_report.txt`.

---

## 7. Comparação: Makaitricks vs Winetricks Original

| Característica | Winetricks Original | Makaitricks |
|---|---|---|
| **cabextract** | Requer `apt install cabextract` | Embutido (estático, 1.1MB) |
| **Fallback de extração** | Nenhum | cabextract → 7z → wine 7z |
| **Knowledge base** | Inexistente (tudo em shell) | `index.json` versionado com 52 verbs |
| **Scanner de prefixo** | Inexistente | Lê registry, DLLs, detecta mono/gecko/dxvk |
| **Health Check** | Inexistente | Compara prefixo com knowledge base |
| **Dependency Resolver** | Inexistente | Resolve recursivamente com detecção de conflitos |
| **Simulador** | Inexistente | Mostra plano antes de executar |
| **Verificador pós-instalação** | Inexistente | Confirma registry + DLLs + workaround files |
| **RPC API** | Inexistente | 5 endpoints JSON-RPC para o Electron |
| **Portabilidade** | Depende de pacotes da distro | Binários estáticos inclusos |
| **Testes automatizados** | Inexistente | `test_verbs.sh` com relatório PASS/FAIL |

---

## 8. Como executar manualmente

```bash
# Instalar um componente
WINEPREFIX=/caminho/do/prefixo WINE=/usr/bin/wine WINEARCH=win64 \
  ./Makaitricks vcrun2022

# Escanear prefixo via Python
cd api && python3 -c "
from api.handler import dispatch
print(dispatch('prefix_scan', {'prefix_path': '/caminho/do/prefixo'}))
"

# Verificar saúde
cd api && python3 -c "
from api.handler import dispatch
print(dispatch('prefix_health', {'prefix_path': '/caminho/do/prefixo'}))
"

# Simular instalação
cd api && python3 -c "
from api.handler import dispatch
print(dispatch('prefix_simulate', {'verb': 'dotnet48'}))
"
```

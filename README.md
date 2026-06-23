# 🛠️ Makaitricks

<p align="center">
  <a href="#english">🇬🇧 English</a> •
  <a href="#portugues">🇧🇷 Português</a> •
  <a href="#espanol">🇪🇸 Español</a>
</p>

---

<a id="english"></a>

## 🇬🇧 English

**Makaitricks** is a **Winetricks fork** with extended support for game launchers on Wine/Proton.

It adds custom verbs for components that the official Winetricks does not cover:
WebView2 Runtime, .NET Desktop Runtime 8.0, UIAutomationCore, and meta-verbs for complete installation.

### Custom Verbs

| Verb | Description |
|------|-------------|
| `webview2` | Microsoft Edge WebView2 Runtime (Evergreen) |
| `dotnetdesktop8` | .NET Desktop Runtime 8.0.28 (x86 + x64) |
| `uiautomationcore` | Native UIAutomationCore.dll (fallback) |
| `makaitrix_all` | Meta-verb: installs all of the above |

### Preserved Winetricks Verbs

All original Winetricks verbs continue to work:
`vcrun2022`, `vcrun2019`, `dotnet48`, `dotnet8`, `d3dcompiler_47`, `faudio`, `dxvk`, `vkd3d`, and many more.

### Usage

```bash
# Install WebView2 Runtime
./Makaitricks webview2

# Install .NET Desktop Runtime 8.0
./Makaitricks dotnetdesktop8

# Install everything at once
./Makaitricks makaitrix_all

# Silent mode
./Makaitricks -q webview2 dotnetdesktop8
```

### Self-Update

```bash
./Makaitricks --self-update
```

### Official Repositories

- **Makaitricks**: https://github.com/MakaiForge/Makaitricks
- **Winetricks** (upstream): https://github.com/Winetricks/winetricks

### License

LGPL-2.1 (same as Winetricks).

---

<a id="portugues"></a>

## 🇧🇷 Português

**Makaitricks** é um **fork do Winetricks** com suporte estendido para launchers de jogos no Wine/Proton.

Adiciona verbs customizados para componentes que o Winetricks oficial não cobre:
WebView2 Runtime, .NET Desktop Runtime 8.0, UIAutomationCore e meta-verbos para instalação completa.

### Verbs Customizados

| Verbo | Descrição |
|-------|-----------|
| `webview2` | Microsoft Edge WebView2 Runtime (Evergreen) |
| `dotnetdesktop8` | .NET Desktop Runtime 8.0.28 (x86 + x64) |
| `uiautomationcore` | Native UIAutomationCore.dll (fallback) |
| `makaitrix_all` | Meta-verbo: instala todos os acima |

### Verbs do Winetricks Preservados

Todos os verbs oficiais do Winetricks continuam funcionando:
`vcrun2022`, `vcrun2019`, `dotnet48`, `dotnet8`, `d3dcompiler_47`, `faudio`, `dxvk`, `vkd3d`, etc.

### Como Usar

```bash
# Instalar WebView2 Runtime
./Makaitricks webview2

# Instalar .NET Desktop Runtime 8.0
./Makaitricks dotnetdesktop8

# Instalar tudo de uma vez
./Makaitricks makaitrix_all

# Modo silencioso
./Makaitricks -q webview2 dotnetdesktop8
```

### Self-Update

```bash
./Makaitricks --self-update
```

### Repositórios Oficiais

- **Makaitricks**: https://github.com/MakaiForge/Makaitricks
- **Winetricks** (base): https://github.com/Winetricks/winetricks

### Licença

LGPL-2.1 (mesma licença do Winetricks).

---

<a id="espanol"></a>

## 🇪🇸 Español

**Makaitricks** es un **fork de Winetricks** con soporte extendido para lanzadores de juegos en Wine/Proton.

Agrega verbs personalizados para componentes que Winetricks oficial no cubre:
WebView2 Runtime, .NET Desktop Runtime 8.0, UIAutomationCore y meta-verbs para instalación completa.

### Verbs Personalizados

| Verbo | Descripción |
|-------|-------------|
| `webview2` | Microsoft Edge WebView2 Runtime (Evergreen) |
| `dotnetdesktop8` | .NET Desktop Runtime 8.0.28 (x86 + x64) |
| `uiautomationcore` | Native UIAutomationCore.dll (fallback) |
| `makaitrix_all` | Meta-verbo: instala todo lo anterior |

### Verbs de Winetricks Preservados

Todos los verbs oficiales de Winetricks siguen funcionando:
`vcrun2022`, `vcrun2019`, `dotnet48`, `dotnet8`, `d3dcompiler_47`, `faudio`, `dxvk`, `vkd3d`, etc.

### Uso

```bash
# Instalar WebView2 Runtime
./Makaitricks webview2

# Instalar .NET Desktop Runtime 8.0
./Makaitricks dotnetdesktop8

# Instalar todo de una vez
./Makaitricks makaitrix_all

# Modo silencioso
./Makaitricks -q webview2 dotnetdesktop8
```

### Self-Update

```bash
./Makaitricks --self-update
```

### Repositorios Oficiales

- **Makaitricks**: https://github.com/MakaiForge/Makaitricks
- **Winetricks** (upstream): https://github.com/Winetricks/winetricks

### Licencia

LGPL-2.1 (misma licencia que Winetricks).

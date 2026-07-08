# Redmine 012 — `local-sources.cjs`: variável `matched` não declarada

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Declarar `matched` como `Set` antes de usar em `getGameDownloadSources` |
| **Classificação** | 🔴 Bug crítico (runtime crash) |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`server/services/local-sources.cjs:126-157`:

```js
async function getGameDownloadSources(steamId, title) {
  if (!title && !steamId) return [];

  const results = [];
  const files = getSourceFiles();

  for (const config of files) {
    try {
      const data = getSourceData(config.file);
      if (!data?.downloads) continue;
      for (const dl of data.downloads) {
        if (titleMatches(title, dl.title)) {
          matched.add(config.name);   // ← matched NUNCA foi declarada!
          break;
        }
      }
    } catch {}
  }

  if (matched.size === 0) {           // ← crash aqui se matched não existir
    // ...
  }

  return Array.from(matched);
}
```

**Impacto:** A primeira chamada a `getGameDownloadSources()` vai lançar `ReferenceError: matched is not defined` em runtime.

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Declarar `matched` como `Set()` | ✅ | No início da função |
| Adicionar `results` também sem uso | ✅ | Remover variável morta `results` |
| Testar endpoint do servidor | ✅ | Verificar se a rota responde sem crash |

### Código proposto

```js
async function getGameDownloadSources(steamId, title) {
  if (!title && !steamId) return [];

  const matched = new Set();
  const files = getSourceFiles();

  for (const config of files) {
    try {
      const data = getSourceData(config.file);
      if (!data?.downloads) continue;
      for (const dl of data.downloads) {
        if (titleMatches(title, dl.title)) {
          matched.add(config.name);
          break;
        }
      }
    } catch {}
  }

  if (matched.size === 0) {
    try {
      const index = loadIndex();
      const key = title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 50);
      const game = key ? index[key] : null;
      if (game?.downloadSources) {
        game.downloadSources.forEach((s) => matched.add(s));
      }
    } catch {}
  }

  return Array.from(matched);
}
```

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Nenhum — correção trivial | Zero | Só adiciona declaração de variável |

## 🔧 Procedimento de correção

1. Backup antes
2. Editar `server/services/local-sources.cjs`
3. Testar servidor: iniciar e chamar endpoint
4. Backup pós-correção
5. Apresentar para aprovação

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| Servidor Express iniciar sem crash | ✅ |
| Rota `getGameDownloadSources` retornar array (vazio ou com dados) | ✅ |

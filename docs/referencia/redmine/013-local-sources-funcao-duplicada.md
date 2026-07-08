# Redmine 013 — `local-sources.cjs`: função `getSourceFiles()` duplicada

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Remover a definição duplicada de `getSourceFiles()` |
| **Classificação** | 🟡 Código morto |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`server/services/local-sources.cjs` define a função `getSourceFiles()` **duas vezes**:

**Primeira definição (linhas 8-19):**
```js
function getSourceFiles() {
  if (!fs.existsSync(SOURCES_DIR)) return [];
  return fs.readdirSync(SOURCES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, f), 'utf-8'));
        const name = data.name || f.replace(/\.json$/, '');
        return { name, file: f };
      } catch { return { name: f.replace(/\.json$/, ''), file: f }; }
    });
}
```

**Segunda definição (linhas 80-90):**
```js
function getSourceFiles() {
  if (!fs.existsSync(SOURCES_DIR)) return [];
  return fs.readdirSync(SOURCES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(SOURCES_DIR, f), 'utf-8'));
        return { name: data.name || f.replace(/\.json$/, ''), file: f };
      } catch { return { name: f.replace(/\.json$/, ''), file: f }; }
    });
}
```

São **exatamente idênticas**. Em JavaScript, a segunda sobrescreve a primeira, então o comportamento runtime não é afetado. A primeira definição é completamente ignorada.

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Remover primeira definição (linhas 8-19) | ✅ | Manter a segunda (linhas 80-90) |
| Alterar ordem das funções | 🔲 | Não necessário, segunda definição funciona |

### Por que manter a segunda?

A segunda definição está **após** as funções que dependem dela (`getDownloadCounts` na linha 92 a chama diretamente), então a ordem é semânticamente correta. A primeira definição é um resquício de refatoração.

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Nenhum — só remove código morto | Zero | Segunda definição é idêntica |

## 🔧 Procedimento de correção

1. Backup antes
2. Remover linhas 8-19 de `server/services/local-sources.cjs` (primeira `getSourceFiles`)
3. Verificar que `const SOURCE_FILES` (linhas 21-38) não foi afetada
4. Testar servidor
5. Backup pós-correção

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| Servidor Express inicia sem warning | ✅ |
| `getSourceFiles()` retorna fontes corretamente | ✅ |

# Redmine 005 — Correção do Typecheck (MODULE_NOT_FOUND)

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Problema** | `npm run typecheck` falha com `MODULE_NOT_FOUND: Cannot find module '../lib/tsc.js'` |
| **Sintoma** | `node:internal/modules/cjs/loader` lança erro ao executar `node_modules/.bin/tsc` |
| **Data** | 21/05/2026 |
| **Severidade** | 🟡 Média (bloqueia typecheck, não afeta build/execução) |

## 🔍 Diagnóstico

Stack trace do erro:
```
Error: Cannot find module '../lib/tsc.js'
Require stack:
- /home/cas/Documentos/protonforgerfull/node_modules/.bin/tsc
```

### Causa raiz

O arquivo `node_modules/.bin/tsc` é um **shim Node.js** com conteúdo:

```js
#!/usr/bin/env node
require('../lib/tsc.js')
```

Quando executado de `node_modules/.bin/tsc`, o path relativo `../lib/tsc.js` resolve para:

```
node_modules/lib/tsc.js   ← NÃO EXISTE ❌
```

Em uma instalação npm normal, `node_modules/.bin/tsc` é um **symlink** para `../typescript/bin/tsc`. Quando executado via symlink, o `require()` resolve a partir do **alvo do symlink**:

```
node_modules/typescript/bin/tsc  →  require('../lib/tsc.js')
                                →  node_modules/typescript/lib/tsc.js ✅
```

No projeto, o `.bin/tsc` era uma **cópia do arquivo** (não um symlink), provavelmente devido a uma falha na instalação ou cópia manual.

### Arquivos afetados

| Arquivo | Problema |
|---------|----------|
| `node_modules/.bin/tsc` | Cópia do shim (45 bytes) em vez de symlink |
| `node_modules/.bin/tsserver` | Cópia do shim (45 bytes) em vez de symlink |

## 🔧 Correção aplicada

```bash
rm node_modules/.bin/tsc node_modules/.bin/tsserver
ln -s ../typescript/bin/tsc node_modules/.bin/tsc
ln -s ../typescript/bin/tsserver node_modules/.bin/tsserver
```

**Resultado:**
```
lrwxrwxrwx ... node_modules/.bin/tsc -> ../typescript/bin/tsc       ✅
lrwxrwxrwx ... node_modules/.bin/tsserver -> ../typescript/bin/tsserver ✅
```

## ✅ Verificação

```bash
npm run typecheck:node    # Compila sem MODULE_NOT_FOUND
npm run typecheck:web     # Compila sem MODULE_NOT_FOUND
```

## 📝 Notas

- Os erros de tipo exibidos após a correção (TS6133, TS2322, etc.) são **preexistentes** no código-fonte e não relacionados a esta correção
- O `npm run build` (electron-vite build) nunca foi afetado — ele usa seu próprio bundler, não o `tsc` diretamente
- Se `node_modules/` for reinstalado no futuro, os symlinks podem se perder novamente. Mitigação recomendada: adicionar script `postinstall` que verifica/recria os symlinks

## 🔗 Arquivos relacionados

- `MODULARIZATION_PLAN.md` — Apêndice de correções
- `node_modules/.bin/tsc` — symlink corrigido
- `node_modules/.bin/tsserver` — symlink corrigido
- `node_modules/typescript/bin/tsc` — alvo do symlink

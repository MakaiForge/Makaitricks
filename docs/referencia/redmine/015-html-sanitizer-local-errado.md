# Redmine 015 — `html-sanitizer.ts` em `shared/` mas usa DOM API

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Mover `html-sanitizer.ts` para o renderer ou criar versão Node.js |
| **Classificação** | 🟡 Organização de código |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`src/shared/html-sanitizer.ts` usa **APIs do DOM do navegador**:

```ts
export function sanitizeHtml(html: string): string {
  const tempDiv = document.createElement("div");   // ← DOM API
  tempDiv.innerHTML = html;
  // ...
  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT); // ← DOM API
}

export function stripHtml(html: string): string {
  const tempDiv = document.createElement("div");   // ← DOM API
  tempDiv.innerHTML = html;
  let cleanText = tempDiv.textContent || tempDiv.innerText || "";
}
```

`src/shared/` é processado tanto no **main** (Node.js) quanto no **renderer** (browser). Se `sanitizeHtml` for importado no main, `document` não existe e lança `ReferenceError`.

### Quem importa `html-sanitizer.ts`?

Vamos verificar.

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Mover para `src/renderer/src/utils/` | ✅ | Onde DOM está disponível |
| Criar versão Node.js em `src/main/` | 🔲 | Se necessário no futuro |
| Atualizar imports | ✅ | Em todos os arquivos que importam de `@shared/html-sanitizer` |

### Estrutura nova

```
src/renderer/src/utils/
├── html-sanitizer.ts    ← movido de src/shared/
└── index.ts             ← barrel export
```

### Arquivos que importam (precisa verificar)

Usar grep para achar:
```bash
rg "html-sanitizer" src/
```

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Quebrar imports | Média | Verificar com grep antes de mover, atualizar todos |
| Alguém importar do shared no main | Média | Garantir que ninguém importa no main |

## 🔧 Procedimento de correção

1. Backup antes
2. `grep -r "html-sanitizer" src/` para listar todos os imports
3. Mover `src/shared/html-sanitizer.ts` → `src/renderer/src/utils/html-sanitizer.ts`
4. Atualizar todos os imports
5. Atualizar barrel `src/renderer/src/utils/index.ts`
6. `npm run build` + `npm run typecheck`
7. Backup pós-correção
8. Apresentar para aprovação

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| `npm run build` | Build sem erros |
| `npm run typecheck:node` | 0 erros |
| `npm run typecheck:web` | 0 erros |
| Renderer consegue importar e usar sanitizeHtml | ✅ |

# Redmine 010 — Zero Testes Automatizados

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Adicionar infraestrutura de testes automatizados e testes nos caminhos críticos |
| **Classificação** | 🔴 Infraestrutura |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

O projeto **não possui um único teste automatizado** — zero arquivos `*.test.ts`, `*.spec.ts` ou diretórios `__tests__/` em toda a árvore `src/`. Também não há test runner configurado no `package.json`.

Isso significa que:
- Qualquer refatoração é feita "no escuro" — não há como saber se algo quebrou sem testar manualmente
- Regressões só são descobertas em runtime
- Onboarding de novos devs é arriscado: um erro pode passar despercebido por dias
- IAs não conseguem validar mudanças propostas

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Setup vitest | ✅ | Test runner compatível com Vite/TS |
| Testes nos IPC handlers | ✅ | Garantir que register-event não quebre |
| Testes no sanitizeHtml | ✅ | Função pura, fácil de testar |
| Testes no download pipeline | 🔲 | Complexo, postergado |
| Cobertura > 80% | ❌ | Não é objetivo imediato |
| CI/CD pipeline | ❌ | Fora de escopo por enquanto |

### Escolha do test runner

**Vitest** — já usa Vite, zero config extra, compartilha `tsconfig` e aliases.

### Setup

```bash
yarn add -D vitest
```

`vitest.config.ts` na raiz:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@main": path.resolve("src/main"),
      "@renderer": path.resolve("src/renderer/src"),
      "@shared": path.resolve("src/shared"),
      "@types": path.resolve("src/shared/types"),
      "@locales": path.resolve("src/locales"),
    },
  },
});
```

`package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

### Testes iniciais

| Alvo | Arquivo | Prioridade |
|------|---------|------------|
| `sanitizeHtml` / `stripHtml` | `src/shared/__tests__/html-sanitizer.test.ts` | Alta — função pura, fácil |
| `registerEvent` | `src/main/events/__tests__/register-event.test.ts` | Alta — crítica para IPC |
| `titleMatches` / `normalize` | `server/services/__tests__/local-sources.test.ts` | Média — lógica de matching |

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Vitest conflitar com config do electron-vite | Baixa | Vitest é independente, só usa alias |
| Testes falsos positivos por mocks inadequados | Média | Testar funções puras primeiro |
| Tempo de execução aumentar muito | Baixa | Testes unitários são rápidos (< 10s) |

## 🔧 Procedimento de correção

1. Backup: `tar.gz` completo antes de qualquer alteração
2. Adicionar `vitest` como devDependency
3. Criar `vitest.config.ts`
4. Adicionar scripts `test` e `test:watch` ao `package.json`
5. Criar primeiro teste para `html-sanitizer.ts`
6. Rodar `npx vitest run` — tudo passando
7. `npm run build` e `npm run typecheck` zerados
8. Backup pós-correção
9. Apresentar para aprovação visual

## 🔄 Rollback

```bash
bash scripts/restore.sh  # restaura último backup
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| `npx vitest run` | Testes passando |
| `npm run build` | Build sem erros |
| `npm run typecheck` | 0 erros |

# Redmine 011 — `register-event.ts` sem `.catch()` no handler IPC

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Adicionar `.catch()` no handler IPC para evitar travamento do renderer |
| **Classificação** | 🔴 Bug crítico |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`src/main/events/register-event.ts:7-12`:

```ts
ipcMain.handle(name, async (event, ...args) => {
  return Promise.resolve(listener(event, ...args)).then((result) => {
    if (!result) return result;
    return JSON.parse(JSON.stringify(result));
  });
  // ⚠️ NENHUM .catch()!
});
```

Se qualquer handler IPC chamar `throw` ou retornar uma Promise rejeitada, o `ipcMain.handle` fica aguardando para sempre. O renderer (frontend) trava esperando resposta — sem timeout, sem fallback.

### Exemplo de crash:

```ts
// Em algum handler:
throw new Error("algo deu errado");
// → renderer fica pendente para sempre
```

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Adicionar `.catch()` | ✅ | Logar erro e retornar `{ error: true, message }` |
| Log estruturado | ✅ | Usar `logger.error` do projeto |
| Mudar assinatura do `listener` | ❌ | Só adicionar tratamento no wrapper |
| Teste unitário | 🔲 | Postergado para Fase 7 (Redmine 010) |

### Código proposto

```ts
import { ipcMain } from "electron";
import { logger } from "@main/services";

export const registerEvent = (
  name: string,
  listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any
) => {
  ipcMain.handle(name, async (event: Electron.IpcMainInvokeEvent, ...args) => {
    try {
      const result = await listener(event, ...args);
      if (!result) return result;
      return JSON.parse(JSON.stringify(result));
    } catch (err) {
      logger.error(`[IPC] Handler "${name}" failed:`, err);
      throw err; // repassa para o renderer tratar
    }
  });
};
```

### Fluxo após correção

```
Handler → throw Error → register-event captura →
  → logger.error("[IPC] Handler X failed: ...")
  → throw err (renderer recebe rejeição e pode mostrar erro na UI)
```

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Erro silencioso se logger não estiver inicializado | Baixa | `logger` é importado de `@main/services`, inicializado cedo |
| `throw err` expor dados internos ao renderer | Baixa | Só o que o handler já exporia |

## 🔧 Procedimento de correção

1. Backup antes
2. Editar `src/main/events/register-event.ts`
3. Verificar se há outros wrappers IPC no projeto com o mesmo problema
4. `npm run build` + `npm run typecheck`
5. Backup pós-correção
6. Apresentar para aprovação

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| `npm run build` | Build sem erros |
| `npm run typecheck:node` | 0 erros |
| Handler que lança erro | Renderer recebe rejeição, não trava |

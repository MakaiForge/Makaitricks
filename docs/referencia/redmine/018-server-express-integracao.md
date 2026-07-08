# Redmine 018 — Server Express sem integração com Electron

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Documentar a falta de lifecycle management entre Electron e o servidor Express |
| **Classificação** | 🟡 Arquitetura |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

O servidor Express foi movido para `server/` (Fase 3), mas ainda **roda como processo completamente separado** do Electron:

```
Processo 1: Electron (src/main/index.ts)
Processo 2: Node.js (server/server.cjs)
```

### Problemas identificados

1. **Sem lifecycle management**: Se o Electron iniciar antes do servidor Express estar pronto, as chamadas que dependem do servidor falham
2. **Sem monitoramento**: Se o servidor Express crashar, o Electron não sabe e não reinicia
3. **Porta fixa**: O servidor Express provavelmente usa uma porta fixa que pode conflitar
4. **Sem integração de logging**: Logs do Express vão para stdout separado
5. **Inicialização manual**: O servidor Express precisa ser iniciado separadamente do Electron

### Como o servidor Express é iniciado?

Precisamos verificar se há `spawn`, `fork` ou se é manual.

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Documentar situação atual | ✅ | Apenas diagnóstico e proposta |
| Integrar lifecycle | 🔲 | Futuro — Electron spawnar server como child process |
| Adicionar health check | 🔲 | Futuro — ping no servidor antes de depender dele |
| Unificar logs | 🔲 | Futuro — redirect stdout do child process para logger |

### Proposta de integração futura

```ts
// src/main/index.ts
import { fork } from "node:child_process";

let expressServer: ChildProcess | null = null;

function startExpressServer() {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "server", "server.cjs")
    : path.join(app.getAppPath(), "server", "server.cjs");

  expressServer = fork(serverPath, [], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  expressServer.stdout?.on("data", (data) => {
    logger.log(`[Express] ${data}`);
  });

  expressServer.on("exit", (code) => {
    logger.warn(`[Express] Exited with code ${code}`);
    expressServer = null;
    // Tentar reiniciar?
  });
}

// Chamar em app.whenReady()
```

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Mudar lifecycle pode quebrar startup | Alta | Exige testes — postergado |

## 🔧 Procedimento (quando for executar)

1. Backup antes
2. Adicionar `fork` do Express em `app.whenReady()`
3. Adicionar `kill` no `before-quit`
4. Verificar se rotas funcionam
5. `npm run build` + `npm run typecheck`
6. Backup pós-correção
7. Apresentar para aprovação

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| `npm run build` | Build sem erros |
| Express inicia junto com Electron | ✅ |
| Express morre quando Electron fecha | ✅ |

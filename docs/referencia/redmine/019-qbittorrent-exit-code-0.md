# Redmine 019 — qBittorrent fecha sozinho (exit code 0)

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Corrigir qBittorrent fechando sozinho segundos após iniciar |
| **Classificação** | 🔴 Bug crítico (impede downloads) |
| **Data** | 22/05/2026 |

## 🔍 Diagnóstico

`src/main/index.ts:57-127` — Três problemas concorrentes:

### Problema 1: `killQBittorrent()` não espera o processo morrer

```ts
function killQBittorrent() {
  if (qbittorrentProcess) {
    qbittorrentProcess.kill("SIGTERM");
    setTimeout(() => {
      if (qbittorrentProcess && !qbittorrentProcess.killed) {
        qbittorrentProcess.kill("SIGKILL");
      }
    }, 3000);
  }
}
```

O `setTimeout(3s)` para SIGKILL nunca dispara porque `app.quit()` é chamado logo depois no `before-quit`, e o event loop do Node fecha antes do timer.

### Problema 2: Nenhuma limpeza de órfãos na inicialização

Quando o app da sessão anterior fecha, o qBittorrent pode virar órfão (processo sem pai) segurando a porta 8080. A próxima execução spawna um novo qBittorrent que tenta bindar na porta já ocupada e morre silenciosamente.

### Problema 3: Sem retry se o processo morre cedo

Se o qBittorrent morre nos primeiros segundos (por conflito de lockfile/porta), o app continua sem tentar reiniciá-lo.

### Evidência no log

```
04:49:30 - qBittorrent v5.1.3.10 iniciado. ID do proceso: 409339
04:49:30 - Usando diretório das configurações: /home/cas/.config/qBittorrent
04:49:35 - Finalização do qBittorrent iniciada    ← só 5s depois
```

O qBittorrent não avança além do diretório de config — não inicia sessão BT, não sobe WebUI. Morre em 5s.

```
04:49:35.403 (main) › [QBittorrent] Exited with code 0
04:49:37.016 (main) › [QBittorrent] Not ready after 7.5s, continuing anyway
```

## 📝 O que foi feito

| Item | Status |
|------|--------|
| `killQBittorrent` vira `async` com Promise que aguarda o processo morrer | ✅ |
| Adicionado `killOrphanQBittorrent()` — mata qbittorrent-nox órfão via `pkill` antes de spawnar | ✅ |
| Adicionado `waitForPortFree()` — aguarda porta 8080 ser liberada antes de spawnar | ✅ |
| Retry automático: até 3 tentativas com 1s de intervalo se o processo morrer cedo | ✅ |
| `before-quit` agora `await killQBittorrent()` em vez de fire-and-forget | ✅ |

### Código antigo

```ts
killQBittorrent();                   // fire-and-forget
// ...
app.quit();                          // Node fecha antes do timer
```

### Código novo

```ts
await killQBittorrent();             // espera o processo morrer
// ...
app.quit();
```

Com retry na inicialização:

```ts
for (let attempt = 1; attempt <= 3; attempt++) {
  await startQBittorrent();          // mata órfãos + espera porta
  const ready = await waitForQBittorrent();
  if (ready) break;
  if (qbittorrentProcess === null && attempt < 3) {
    // morreu cedo → tenta de novo
    await new Promise(r => setTimeout(r, 1000));
  } else break;
}
```

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| `pkill` não disponível no sistema | Muito baixa | App só roda em Linux; `pkill` é do pacote `procps` (presente em toda distro) |
| Porta 8080 ocupada por outro processo | Baixa | `waitForPortFree` já trata esse caso; retry + log de warning |

## 🔧 Procedimento de correção

1. Backup antes
2. Editar `src/main/index.ts` — 3 funções modificadas, 1 adicionada
3. `npm run build` + `npm run typecheck`
4. Testar: abrir e fechar app 2x consecutivas

## ✅ Verificação

| Verificação | Resultado |
|-------------|-----------|
| `npm run build` | ✅ |
| `npm run typecheck` | ✅ (typecheck:node + typecheck:web) |
| App inicia sem erro | Pendente (teste manual) |
| Fechar e reabrir app 2x seguidas | Pendente (teste manual) |

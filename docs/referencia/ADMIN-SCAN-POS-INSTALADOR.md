# ADMIN: Scan de executáveis pós-instalador

## Problema atual

Após o instalador do jogo fechar, o app escaneia o prefixo Wine **apenas arquivos modificados nos últimos 5 minutos**. Se o instalador demorar ou o jogo já estiver instalado, nada é encontrado → `BinaryNotFoundModal`.

## Fluxo atual

```
Instalador fecha
    ↓
findGameExecutables(prefixPath, exitTimestamp)
    ↓
Filtra por mtimeMs entre (exitTimestamp - 5min) e (exitTimestamp + 30s)
    ↓
Se achou → ExePickerModal com lista
Se não → BinaryNotFoundModal ("nenhum executável encontrado")
    ↓
Botão "Procurar manualmente" → openExeFilePicker(suggestedDir)
```

## O que você quer

```
Instalador fecha
    ↓
findGameExecutables(prefixPath, exitTimestamp)
    ↓
1. Tenta janela de tempo (5 min)
2. Se vazio → scan completo do prefixo
3. Top 5-6 .exe mais recentes (excluindo sistema/redist)
4. Exibe em ExePickerModal
5. Se mesmo assim vazio → file picker no suggestedDir
```

## O que já existe (não precisa criar)

| Componente | Arquivo | Status |
|---|---|---|
| `findGameExecutables` | `src/main/helpers/find-game-exe.ts` | ✅ Já escaneia drive_c inteiro, exclui system dirs, redist |
| `scanAndReturnCandidates` | `src/main/events/library/open-game-installer.ts` | ✅ Já chama o scan |
| `ExePickerModal` | `src/renderer/.../exe-picker-modal.tsx` | ✅ Já mostra lista de candidatos |
| `BinaryNotFoundModal` | `src/renderer/.../binary-not-found-modal.tsx` | ✅ Mensagem de fallback |
| `handleOpenExePicker` | `src/renderer/.../downloads.tsx` | ✅ Já abre file picker no suggestedDir |
| `openExeFilePicker` | `src/main/events/.../set-game-executable-path.ts` | ✅ Recém-registrado |

## O que precisa mudar (2 arquivos)

### 1. `src/main/helpers/find-game-exe.ts`

Adicionar `fullScan: ScanResult[]` ao retorno — scan completo do prefixo SEMPRE, limitado aos top 6 por mtime.

**Mudança na interface de retorno:**
```ts
return {
  positives,     // time-windowed + nome positivo (launcher.exe etc)
  allFound,      // time-windowed (qualquer .exe)
  suggestedDir,  // dir com mais arquivos na janela
  bestCandidates, // NOVO: full scan, top 6, sorted by mtime
};
```

**Lógica nova:**
```ts
// No final da função, após processar timeFiltered:
let bestCandidates: ScanResult[] = [];
if ((positives.length === 0 && timeFiltered.length === 0) || fullScanForced) {
  // Pega todos os EXEs escaneados, ordena por mtime, top 6
  results.sort((a, b) => b.mtimeMs - a.mtimeMs);
  bestCandidates = results.slice(0, 6);
  // Se suggestedDir ainda é null, pega o dir do primeiro candidato
  if (!suggestedDir && bestCandidates.length > 0) {
    suggestedDir = path.dirname(bestCandidates[0].path);
  }
}
```

### 2. `src/main/events/library/open-game-installer.ts`

Em `scanAndReturnCandidates`, usar `bestCandidates` quando `positivePaths` e `allPaths` estiverem vazios:

```ts
return {
  positivePaths,
  allPaths: allPaths.length > 0 ? allPaths : bestCandidates.map(r => r.path),
  suggestedDir,
};
```

Isso garante que o renderer SEMPRE receba candidatos ou `suggestedDir` para o file picker.

## O que NÃO precisa mudar

- Renderer (`downloads.tsx`) — já lida com `positivePaths`, `allPaths`, `suggestedDir`
- `ExePickerModal` — já mostra lista e tem botão "Abrir na pasta"
- `BinaryNotFoundModal` — continua como fallback final
- CSS — já existe

## Riscos

| Risco | Mitigação |
|---|---|
| Full scan pode ser lento em prefixos grandes | Já limitado a depth 6, exclui system dirs |
| Sugerir exe errado | Usuário escolhe na lista (ExePickerModal) |
| suggestedDir apontar pra lugar estranho | Sempre tem fallback pro file picker nativo |

## Teste

```bash
npm run typecheck && npm run build
```

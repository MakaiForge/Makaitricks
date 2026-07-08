# 021 — Performance do Screencast: Re-render React por Frame

## Contexto

O Navegador Manager (BrowserMirror) espelha um Chrome headless via screencast. Apesar de `Page.startScreencast` enviar frames eficientemente (só quando a página muda), a UI do Electron/React parecia "reconstruindo toda hora" — tab bar, toolbar e bookmarks bar tremiam sem necessidade.

## Diagnóstico

Rastreou-se a cadeia de eventos de um frame:

```
Frame via IPC
  → useBrowserMirror: setFrameCount() + setLastFrameLen()  ← React STATE
  → Hook devolve novos valores                              ← novo objeto
  → BrowserMirror re-renderiza                              ← porque o hook mudou
  → BrowserTabBar, BrowserToolbar, BrowserBookmarksBar      ← todos re-renderizam
  → BrowserFindBar, BrowserViewport, BrowserDebugBar        ← sem necessidade
  → React diff da árvore inteira                            ← trabalho desperdiçado
```

A 30fps, isso satura a main thread com reconciliação desnecessária.

## Solução Aplicada

Remover `frameCount` e `lastFrameLen` do hook `useBrowserMirror.ts`. Isolar o frame counting no `BrowserDebugBar.tsx` usando `useRef` e `textContent` direto no DOM — sem estado React.

Frame rendering já era feito no `BrowserViewport.tsx` dentro de um `useEffect` isolado (sem estado), então permaneceu intacto.

## Resultado

Frames causam ZERO re-renders React. A árvore de componentes fica estável. O DOM é manipulado diretamente.

## Arquivos Modificados

- `src/renderer/src/components/browser-view/hooks/useBrowserMirror.ts` — removeu `frameCount`, `lastFrameLen`, e o `useEffect` do `onChromeScreencastFrame`
- `src/renderer/src/components/browser-view/BrowserDebugBar.tsx` — reescrito com `useRef` e `textContent`
- `src/renderer/src/components/browser-view/BrowserMirror.tsx` — passou `mirrorId` em vez de `frameCount`/`lastFrameLen` pro debug bar

## Melhorias Adicionais

- **Resolução**: 1280x720 fixa (sem viewport dinâmico)
- **Zoom**: `Page.setZoomFactor` em vez de `Page.setDeviceMetricsOverride` (não causa re-layout)
- **Ctrl+Scroll**: zoom step 0.1
- **Build fix**: duplicata `installFomod` removida do preload

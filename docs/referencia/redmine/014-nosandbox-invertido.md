# Redmine 014 — `--no-sandbox` invertido na inicialização

## 📋 Identificação

| Campo | Valor |
|-------|-------|
| **Tarefa** | Corrigir lógica do `--no-sandbox` que está invertida |
| **Classificação** | 🟡 Bug moderado |
| **Data** | 21/05/2026 |

## 🔍 Diagnóstico

`src/main/index.ts:36-38`:

```ts
if (process.platform !== "linux") {
  app.commandLine.appendSwitch("--no-sandbox");
}
```

A flag `--no-sandbox` desativa o sandbox do Chromium. Ela é **necessária no Linux** (ambientes sem sandbox, Docker, root, etc.) mas **não é necessária no Windows/macOS** (onde o sandbox funciona nativamente).

O código atual faz o oposto: adiciona `--no-sandbox` **apenas em Windows/macOS** e **não adiciona no Linux**.

### Impacto potencial

- **Windows/macOS:** Redução desnecessária de segurança (sandbox desativado sem necessidade)
- **Linux:** Pode causar falha de inicialização em ambientes restritos (Docker, containers, root)

## 📝 O que será feito

| Item | Sim/Não | Detalhe |
|------|---------|---------|
| Inverter condicional | ✅ | `if (process.platform === "linux")` |
| Validar inicialização nas 3 plataformas | 🔲 | Só testaremos Linux |

### Código proposto

```ts
if (process.platform === "linux") {
  app.commandLine.appendSwitch("--no-sandbox");
}
```

## ⚠️ Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Nenhum — correção direta | Baixa | Só inverte condicional |

## 🔧 Procedimento de correção

1. Backup antes
2. Editar `src/main/index.ts` linha 36
3. `npm run build` + `npm run typecheck`
4. Backup pós-correção

## 🔄 Rollback

```bash
bash scripts/restore.sh
```

## ✅ Verificação

| Verificação | Resultado esperado |
|-------------|-------------------|
| `npm run build` | Build sem erros |
| `npm run typecheck:node` | 0 erros |
| App inicia no Linux | ✅ |

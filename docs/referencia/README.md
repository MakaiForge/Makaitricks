# 📚 Referência — Estudos de Implementação Antiga

> ⚠️ **ATENÇÃO:** Os documentos nesta pasta são **ESTUDOS DE IMPLEMENTAÇÃO ANTIGA**.
> Eles registram planos, fluxos desatualizados, especificações que foram superadas
> pelo código atual, e logs históricos de tarefas concluídas.
>
> **NÃO refletem o estado atual do código.** Consulte os documentos em
> `docs/` (raiz) e subpastas (`docs/arquitetura/`, `docs/funcionalidades/`,
> `docs/proton-api/`) para documentação ativa.

---

## Conteúdo

| Pasta/Arquivo | Tipo | Descrição |
|--------------|------|-----------|
| `FLUXO_COMPLETO.md` | 🔴 Desatualizado | Descrevia bugs de instalação que já foram corrigidos. O fluxo atual é diferente |
| `MODULARIZACAO_INSTALACAO.md` | 🟡 Plano parcial | Plano de modularização do install-flow/. O main process foi implementado, o renderer não |
| `MODULARIZATION_PLAN.md` | 🟢 Histórico | Log de tarefas de refatoração (Fases 1-11). Todas concluídas |
| `INSTALL_FLOW.md` | 🔴 Desatualizado | Spec de fluxo de instalação. O código implementou de forma diferente |
| `ADMIN-3-MODOS-INSTALACAO.md` | 🟡 Plano | Especificação dos 3 modais de instalação. Não foi implementado como descrito |
| `ADMIN-PLAN-API-INTEGRATION.md` | 🟡 Plano | Plano de integração da API Python. Já foi copiada e integrada |
| `ADMIN-SCAN-POS-INSTALADOR.md` | 🟡 Plano | Plano de scan pós-instalador. Código implementou abordagem diferente |
| `DOWNLOADS_PLAN.md` | 🟡 Plano | Plano de melhorias na interface de downloads. Pendente |
| ~~`store-refactor.md`~~ (deleted) | ❌ Removido | Plano obsoleto — app agora usa SQLite/JSON |
| `BUILD-SEGURA-README.md` | 🟡 Referência | Explica arquitetura de 3 camadas, mas contém detalhes desatualizados |
| `redmine/` | 🟢 Histórico | Relatos de bugs corrigidos (útil para consulta) |

---

## Legenda

| Ícone | Significado |
|-------|-------------|
| 🔴 Desatualizado | Não reflete o código atual. Mantido apenas como registro histórico |
| 🟡 Plano | Era uma intenção de implementação. Pode ter sido feito de forma diferente ou estar pendente |
| 🟢 Histórico | Registro factual de mudanças já concluídas. Útil para consulta |

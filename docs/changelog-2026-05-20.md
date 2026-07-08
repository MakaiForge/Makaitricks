# Changelog — 2026-05-20

## 1. SQLite Migration (performance)

### O que mudou
- `matched.json` (146MB) e `recommendations/*.json` (224MB) foram migrados para
  `resources/proton_data.db` (280MB)
- A `recommend()` agora faz consultas SQLite indexadas por `game_id` em vez de
  carregar JSONs inteiros na memória

### Performance
| Operação | Antes | Depois |
|---|---|---|
| recommend (jogo conhecido) | ~3-4s | ~0.3ms |
| recommend (fork rec) | ~2-3s | ~0.1ms |
| recommend (fallback) | ~3-4s | ~0ms |

### Script de migração
```bash
python3 protonforge-api/scripts/migrate_to_sqlite.py
```

---

## 2. Correção: acesso ao anticheat.json

### Bug
```python
# ANTES (errado):
if game_id in anticheat:  # sempre False, anticheat tem keys "games", "totalGames"...
```
### Fix
```python
# DEPOIS (correto):
ac_games = anticheat.get("games", {})
if game_id in ac_games:
```

---

## 3. Anti-cheat como fonte de recomendação

- `anticheat.json` agora é consultado para jogos sem match em game_matches
  ou fork_recommendations
- Se o jogo tem anti-cheat catalogado, as `acRecommendations` viram primary + alternatives
- Os forks restantes são adicionados como fallback ordenado por tierScore

---

## 4. Gacha game support

### Nova fonte: `gacha_navegador_chromium.json`
- 6 jogos gacha analisados: Genshin Impact, Honkai: Star Rail, Zenless Zone Zero,
  Wuthering Waves, Tower of Fantasy, Neverness to Everness
- Para jogos gacha:
  - `mfplat.dll` + `mf` winetricks adicionados
  - `PROTON_ENABLE_WAYLAND=0` adicionado
  - `gacha_hints` no response com engine, anti-cheat, status_linux, fix_conhecido
  - DW-Proton (+30) e Proton-CachyOS (+30) sobem no ranking como prioridade
  - GE-Proton continua topo (score 100 + 30 = 130)

### Estrutura do response
```json
"launch_options": {
  "dlls": ["d3dcompiler_47", "vcrun2022", "mfplat"],
  "winetricks": ["vcrun2022", "d3dcompiler_47", "mf"],
  "env_vars": ["PROTON_ENABLE_WAYLAND=0"],
  "wine_overrides": "mfplat=n,b;d3dcompiler_47=n,b",
  "gacha_hints": [{
    "engine": "Unity",
    "anti_cheat": "mhyprot2 + HoYoverse Anti-Cheat",
    "fix_conhecido": "Usar GE-Proton 10-25 ou superior..."
  }]
}
```

---

## 5. Proton Selection UI (swap visual)

### Arquivo: `proton-recommendation-modal.tsx`

### O que mudou
- **Swap de forks**: clicar numa alternativa troca ela com o primary
- **Badge "Recomendado"** no primary original
- **Badge "Selecionado por você"** quando o usuário troca manualmente
- **Score real** do fork selecionado (não fica fixo em 100)
- **Ícone do fork** (inicial) no card
- **Versão** visível em todos os cards (primary + alternatives)
- **Badge "Recomendado"** na alternative card quando o primary original cai pra lista
- **Checkmark** no item manual selecionado
- Botão "Instalar com {fork_name}" dinâmico

### Fluxo
1. Ao abrir o modal, o primary da API fica no topo com badge "Recomendado"
2. O usuário clica em qualquer alternativa → ela sobe pro topo
3. A recomendação original desce pra lista de alternativas (com badge "Recomendado")
4. O score mostrado é sempre o `tierScore` real do fork atual
5. Ao clicar "Instalar", usa o Proton instalado que corresponde ao fork selecionado

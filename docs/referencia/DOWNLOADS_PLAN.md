# ProtonForge Downloads - Plano de Melhorias

## Backups Realizados
```
src/renderer/src/pages/downloads/ -> downloads.backup/
src/main/services/download/ -> download.backup/
src/types/ -> types.backup/
src/renderer/src/hooks/use-download.ts -> use-download.ts.backup
```

---

## Problemas Identificados

### 1. Interface de Downloads
- ❌ `torrent-info-panel.tsx` não está sendo usado na view principal
- ❌ Não mostra indicadores visuais claros de seeding
- ❌ Gráfico de upload não existe para torrents
- ❌ Infos de trackers não são exibidas

### 2. Funcionalidades Ausentes
- ❌ Não pode adicionar trackers manualmente
- ❌ Não mostra lista de peers/seeds em tempo real
- ❌ Não há configuração de ratio/time limit para seeding
- ❌ Não há agendamento de seeding (seed when, stop when)
- ❌ Não há opção de exportar .torrent para cliente externo
- ❌ Não há integração com qBittorrent externo

### 3. Usuários em Países com Restrições
- ❌ Não há suporte a proxy para torrents
- ❌ Não há opção de magnet link para cliente externo
- ❌ Integração com debrid está incompleta

---

## Funcionalidades Propostas

### Fase 1: Melhorias na Interface
1. **Integrar `torrent-info-panel`** na view principal de downloads
2. **Adicionar indicadores visuais de seeding** nos cards
3. **Mostrar seeds/peers em tempo real** durante download
4. **Gráfico de upload** para torrents em seeding
5. **Lista de trackers** conectados ao torrent

### Fase 2: Configurações Avançadas de Seeding
1. **Ratio Limit** - parar de semear quando atingir X%
2. **Seed Time Limit** - parar após X horas/minutos
3. **Seed Queue** - limitar número de seeds simultâneos
4. **Seed Scheduling** - semear apenas em horários específicos
   - Ex: "Semeia das 22h às 6h"
   - Ex: "Não semear nos fins de semana"

### Fase 3: Gerenciamento de Trackers
1. **Lista de trackers pré-configurados**
   - Rastreamento público: PTP, KG, BL, etc.
   - Rastreamento privado: berbagai trackers
2. **Adicionar trackers manualmente** a um torrent
3. **Remover trackers ruins** automaticamente
4. **Forçar reannounce** nos trackers

### Fase 4: Integração com qBittorrent Externo
1. **Conectar a qBittorrent remoto**
   - Host/Port/Username/Password
   - WebUI API v2
2. **Sincronizar downloads** entre ProtonForge e qBittorrent
3. **Transferir torrents** para qBittorrent quando necessário
4. **Usar qBittorrent como fallback** para países bloqueados

### Fase 5: Opções para Usuários com Restrições
1. **Exportar .torrent** - salvar arquivo para cliente externo
2. **Copiar Magnet Link** - usar em qualquer cliente
3. **Configuração de Proxy**
   - HTTP Proxy
   - SOCKS5 Proxy
   - Proxy para torrents apenas
4. **Usar Debrid como alternativa**
   - Já temos: RealDebrid, Premiumize, AllDebrid
   - Adicionar mais opções

---

## Arquitetura Modular Proposta

```
src/renderer/src/pages/downloads/
├── components/
│   ├── DownloadCard.tsx          # Card individual de download
│   ├── DownloadHero.tsx          # View hero do download ativo
│   ├── TorrentInfoPanel.tsx      # Painel de info do torrent (refatorado)
│   ├── SeedingIndicator.tsx      # Indicador visual de seeding
│   ├── SpeedChart.tsx            # Gráfico de velocidade
│   ├── TrackerList.tsx          # Lista de trackers
│   ├── SeedSettingsModal.tsx     # Modal de configurações de seeding
│   ├── TrackerManager.tsx        # Gerenciador de trackers
│   └── ExternalClientModal.tsx   # Modal para qBittorrent externo
├── hooks/
│   ├── useSeedingSettings.ts      # Hook para configurações de seeding
│   ├── useTorrentTrackers.ts      # Hook para gerenciar trackers
│   └── useExternalClient.ts       # Hook para qBittorrent externo
├── services/
│   ├── qbittorrent-client.ts      # Cliente qBittorrent API
│   └── torrent-exporter.ts        # Exportar torrents/magnets
└── types/
    └── seeding.ts                 # Tipos para configurações de seeding

src/main/services/torrent/
├── external-qbittorrent.ts       # Comunicação com qBittorrent externo
├── tracker-manager.ts            # Gerenciar trackers
└── seed-scheduler.ts            # Agendador de seeding
```

---

## Tipos a serem adicionados em `src/types/`

```typescript
// Configurações de Seeding
interface SeedingSettings {
  ratioLimit: number | null;        // null = infinito, número = %
  seedTimeLimit: number | null;     // minutos, null = infinito
  seedingEnabled: boolean;
  maxActiveSeeds: number;
  schedule?: SeedSchedule;
}

interface SeedSchedule {
  enabled: boolean;
  hoursStart: number;              // 0-23
  hoursEnd: number;                // 0-23
  daysOfWeek: number[];           // 0=Domingo, 6=Sábado
}

// Tracker
interface TorrentTracker {
  url: string;
  status: "working" | "error" | "disabled";
  peers: number;
  seeds: number;
  lastUpdate: Date;
}

// qBittorrent Externo
interface ExternalQbitConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  useSsl: boolean;
}
```

---

## Integração com qBittorrent API

### Endpoints principais a usar:
- `POST /api/v2/torrents/add` - Adicionar torrent
- `GET/POST /api/v2/torrents/info` - Info dos torrents
- `POST /api/v2/torrents/pause` - Pausar
- `POST /api/v2/torrents/resume` - Resumir
- `POST /api/v2/torrents/delete` - Deletar
- `GET /api/v2/torrents/trackers` - Trackers do torrent
- `POST /api/v2/torrents/addTrackers` - Adicionar trackers
- `GET /api/v2/torrents/properties` - Propriedades (ratio, time, etc)
- `POST /api/v2/torrents/setLimit` - Definir limites

---

## Priorização Sugerida

1. **Alta Prioridade**
   - Integrar `torrent-info-panel` na UI
   - Indicadores visuais de seeding
   - Mostrar seeds/peers em tempo real

2. **Média Prioridade**
   - Configurações de seeding (ratio/time limit)
   - Lista de trackers
   - Seed scheduling

3. **Baixa Prioridade**
   - Integração com qBittorrent externo
   - Exportar .torrent
   - Configuração de proxy
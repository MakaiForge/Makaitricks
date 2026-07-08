import { useState, useEffect, useCallback } from "react";
import { Button } from "@renderer/components";
import "./GameDetectionWizard.scss";

interface GameDetectionWizardProps {
  open: boolean;
  onClose: () => void;
  onGameDetected: (gameId: string, gamePath: string) => void;
  selectedGameId?: string;
}

type WizardStep = "detecting" | "result" | "saved";

interface DetectionAttempt {
  gameId: string;
  name: string;
  source: string;
  found: boolean;
}

export function GameDetectionWizard({ open, onClose, onGameDetected, selectedGameId: initialGameId }: GameDetectionWizardProps) {
  const [step, setStep] = useState<WizardStep>("detecting");
  const [detected, setDetected] = useState<DetectionAttempt[]>([]);
  const [chosenGameId, setChosenGameId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const startDetection = useCallback(async (targetGameId?: string) => {
    setStep("detecting");
    setError(null);
    setDetected([]);
    setDebugLog([]);
    log(`Iniciando detecção. targetGameId: ${targetGameId || "todos"}`);
    try {
      const catalogResult = await window.electron.getGameDllCatalog();
      if (!catalogResult.ok || !catalogResult.data?.games) {
        setError("Catálogo de jogos não disponível");
        log("ERRO: catálogo não disponível");
        return;
      }
      const games = catalogResult.data.games;
      log(`Catálogo carregado: ${games.length} jogos`);
      const scanTarget = targetGameId
        ? games.filter((g: any) => g.gameId === targetGameId)
        : games;
      log(`Alvo da varredura: ${scanTarget.length} jogos (${scanTarget.map((g: any) => g.gameId).join(", ")})`);
      const found: DetectionAttempt[] = [];
      for (const game of scanTarget) {
        log(`Verificando ${game.gameId}...`);
        const path = await window.electron.modDetectGamePath(game.gameId);
        log(`${game.gameId} → ${path ? "ENCONTRADO: " + path : "NÃO ENCONTRADO"}`);
        found.push({
          gameId: game.gameId,
          name: game.name,
          source: path ? "Steam/GOG" : "",
          found: !!path,
        });
      }
      setDetected(found);
      const firstFound = found.find((g) => g.found);
      if (firstFound) setChosenGameId(firstFound.gameId);
      setStep("result");
    } catch (e: any) {
      log(`ERRO: ${e.message || e}`);
      setError(e.message || "Erro na detecção");
      setStep("result");
    }
  }, [log]);

  useEffect(() => {
    if (!open) return;
    setChosenGameId("");
    setDetected([]);
    setError(null);
    startDetection(initialGameId);
  }, [open, initialGameId, startDetection]);

  const handleSelectManual = async () => {
    const res = await window.electron.showOpenDialog({ properties: ["openDirectory"] });
    if (res.canceled || !res.filePaths[0]) return;
    const selectedPath = res.filePaths[0];
    const catalogResult = await window.electron.getGameDllCatalog();
    if (!catalogResult.ok || !catalogResult.data?.games) return;
    for (const game of catalogResult.data.games) {
      const result = await window.electron.detectGameManual(game.gameId, selectedPath);
      if (result.ok && result.data) {
        onGameDetected(game.gameId, selectedPath);
        onClose();
        return;
      }
    }
    setError("Nenhum jogo reconhecido neste diretório");
  };

  const handleConfirm = async (gameId: string) => {
    const game = detected.find((g) => g.gameId === gameId);
    if (!game || !game.found || !game.source) return;
    const path = await window.electron.modDetectGamePath(gameId);
    if (path) {
      onGameDetected(gameId, path);
    }
    setStep("saved");
  };

  const foundCount = detected.filter((g) => g.found).length;

  return (
    <div className={`detection-wizard-overlay ${open ? "detection-wizard-overlay--open" : ""}`} onClick={onClose}>
      <div className="detection-wizard" onClick={(e) => e.stopPropagation()}>
        {step === "detecting" && (
          <div className="detection-wizard__step">
            <h2>Detectando jogos instalados...</h2>
            <div className="detection-wizard__spinner" />
            <p>Procurando em bibliotecas Steam, GOG e diretórios comuns...</p>
          </div>
        )}

        {step === "result" && (
          <div className="detection-wizard__step">
            <h2>Jogos Detectados</h2>
            {error && <p className="detection-wizard__error">⚠️ {error}</p>}
            {foundCount > 0 ? (
              <p>{foundCount} jogo(s) encontrado(s) automaticamente.</p>
            ) : (
              <p>Nenhum jogo encontrado automaticamente.</p>
            )}
            <div className="detection-wizard__game-list">
              {detected.map((g) => (
                <div
                  key={g.gameId}
                  className={`detection-wizard__game-item ${g.found ? "detection-wizard__game-item--found" : ""} ${chosenGameId === g.gameId ? "detection-wizard__game-item--selected" : ""}`}
                  onClick={() => g.found && setChosenGameId(g.gameId)}
                >
                  <span className="detection-wizard__game-name">{g.name}</span>
                  {g.found ? (
                    <span className="detection-wizard__game-status detection-wizard__game-status--found">✅ {g.source}</span>
                  ) : (
                    <span className="detection-wizard__game-status detection-wizard__game-status--missing">❌ Não encontrado</span>
                  )}
                </div>
              ))}
            </div>
            <div className="detection-wizard__actions">
              <Button onClick={handleSelectManual}>Selecionar Manualmente</Button>
              <Button onClick={() => startDetection(initialGameId)}>Buscar Novamente</Button>
              <Button
                theme="primary"
                disabled={!chosenGameId || !detected.find((g) => g.gameId === chosenGameId)?.found}
                onClick={() => handleConfirm(chosenGameId)}
              >
                Configurar Selecionado
              </Button>
            </div>
            {debugLog.length > 0 && (
              <details className="detection-wizard__debug">
                <summary>Log de depuração ({debugLog.length} linhas)</summary>
                <pre className="detection-wizard__debug-pre">{debugLog.join("\n")}</pre>
              </details>
            )}
          </div>
        )}

        {step === "saved" && (
          <div className="detection-wizard__step">
            <h2>✅ Jogo Configurado!</h2>
            <p>O jogo foi configurado com paths padrão.</p>
            <p>Você pode ajustar as configurações no painel de Configurações do Jogo.</p>
            <Button theme="primary" onClick={onClose}>Concluir</Button>
          </div>
        )}
      </div>
    </div>
  );
}

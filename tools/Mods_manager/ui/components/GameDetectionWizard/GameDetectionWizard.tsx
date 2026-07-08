import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@renderer/components";
import "./GameDetectionWizard.scss";

interface GameDetectionWizardProps {
  open: boolean;
  onClose: () => void;
  onGameDetected: (gameId: string, gamePath: string) => void;
  selectedGameId?: string;
}

interface DetectionAttempt {
  gameId: string;
  name: string;
  source: string;
  found: boolean;
}

export function GameDetectionWizard({ open, onClose, onGameDetected, selectedGameId: initialGameId }: GameDetectionWizardProps) {
  const [step, setStep] = useState<"detecting" | "result" | "saved">("detecting");
  const [detected, setDetected] = useState<DetectionAttempt[]>([]);
  const [chosenGameId, setChosenGameId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const autoClosed = useRef(false);

  const startDetection = useCallback(async (targetGameId?: string) => {
    setStep("detecting");
    setError(null);
    setDetected([]);
    autoClosed.current = false;
    try {
      const catalogResult = await window.electron.getGameDllCatalog();
      if (!catalogResult.ok || !catalogResult.data?.games) {
        setError("Catálogo de jogos não disponível");
        return;
      }
      const games = catalogResult.data.games;
      const scanTarget = targetGameId
        ? games.filter((g: any) => g.gameId === targetGameId)
        : games;
      const found: DetectionAttempt[] = [];
      for (const game of scanTarget) {
        const path = await window.electron.modDetectGamePath(game.gameId);
        found.push({
          gameId: game.gameId,
          name: game.name,
          source: path ? "Steam/GOG" : "",
          found: !!path,
        });
      }
      setDetected(found);
      const firstFound = found.find((g) => g.found);

      if (targetGameId && firstFound) {
        const path = await window.electron.modDetectGamePath(firstFound.gameId);
        if (path) {
          onGameDetected(firstFound.gameId, path);
        }
        onClose();
        return;
      }

      if (firstFound) setChosenGameId(firstFound.gameId);
      setStep("result");
    } catch (e: any) {
      setError(e.message || "Erro na detecção");
      setStep("result");
    }
  }, [onGameDetected, onClose]);

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
    onClose();
  };

  const foundCount = detected.filter((g) => g.found).length;

  return (
    <div className={`detection-wizard-overlay ${open ? "detection-wizard-overlay--open" : ""}`} onClick={onClose}>
      <div className="detection-wizard" onClick={(e) => e.stopPropagation()}>
        {step === "detecting" && (
          <div className="detection-wizard__step">
            <h2>Detectando {initialGameId ? "..." : "jogos instalados..."}</h2>
            <div className="detection-wizard__spinner" />
            <p>Procurando em bibliotecas Steam, GOG e diretórios comuns...</p>
          </div>
        )}

        {step === "result" && (
          <div className="detection-wizard__step">
            <h2>Jogos Detectados</h2>
            {error && <p className="detection-wizard__error">⚠️ {error}</p>}
            {foundCount > 0 ? (
              <p>{foundCount} jogo(s) encontrado(s). Clique em um para configurar.</p>
            ) : (
              <p>Nenhum jogo encontrado.</p>
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
              <Button onClick={handleSelectManual}>Selecionar Pasta Manualmente</Button>
              <Button
                theme="primary"
                disabled={!chosenGameId || !detected.find((g) => g.gameId === chosenGameId)?.found}
                onClick={() => handleConfirm(chosenGameId)}
              >
                Configurar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

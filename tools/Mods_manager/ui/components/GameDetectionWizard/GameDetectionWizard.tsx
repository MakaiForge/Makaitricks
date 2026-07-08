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
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const startDetection = useCallback(async (targetGameId?: string) => {
    setStep("detecting");
    setError(null);
    setDetected([]);
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
      if (firstFound) setChosenGameId(firstFound.gameId);
      setStep("result");
    } catch (e: any) {
      setError(e.message || "Erro na detecção");
      setStep("result");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setChosenGameId("");
    setDetected([]);
    setError(null);
    setInfoMsg(null);
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
  const alreadyFound = foundCount > 0 && detected.find((g) => g.found && g.gameId === initialGameId);

  const handleRetry = () => {
    if (alreadyFound) {
      setInfoMsg("Jogo já encontrado! Selecione abaixo e clique em Configurar Selecionado.");
      setTimeout(() => setInfoMsg(null), 3000);
    } else {
      startDetection(initialGameId);
    }
  };

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
            {infoMsg && <p className="detection-wizard__info">💡 {infoMsg}</p>}
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
              <Button onClick={handleRetry}>Buscar Novamente</Button>
              <Button
                theme="primary"
                disabled={!chosenGameId || !detected.find((g) => g.gameId === chosenGameId)?.found}
                onClick={() => handleConfirm(chosenGameId)}
              >
                Configurar Selecionado
              </Button>
            </div>
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

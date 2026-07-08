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

export function GameDetectionWizard({ open, onClose, onGameDetected, selectedGameId }: GameDetectionWizardProps) {
  const [step, setStep] = useState<WizardStep>("detecting");
  const [detected, setDetected] = useState<DetectionAttempt[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const startDetection = useCallback(async () => {
    setStep("detecting");
    setError(null);
    try {
      const catalogResult = await window.electron.getGameDllCatalog();
      if (!catalogResult.ok || !catalogResult.data?.games) {
        setError("Catálogo de jogos não disponível");
        return;
      }
      const games = catalogResult.data.games;
      const found: DetectionAttempt[] = [];
      const scanTarget = selectedGameId
        ? games.filter((g: any) => g.gameId === selectedGameId)
        : games;
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
      if (firstFound) setSelectedGameId(firstFound.gameId);
      setStep("result");
    } catch (e: any) {
      setError(e.message || "Erro na detecção");
      setStep("result");
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (open) startDetection();
  }, [open, startDetection]);

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
    if (!game) return;
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
                  className={`detection-wizard__game-item ${g.found ? "detection-wizard__game-item--found" : ""} ${selectedGameId === g.gameId ? "detection-wizard__game-item--selected" : ""}`}
                  onClick={() => g.found && setSelectedGameId(g.gameId)}
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
              <Button onClick={startDetection}>Buscar Novamente</Button>
              <Button
                theme="primary"
                disabled={!selectedGameId || !detected.find((g) => g.gameId === selectedGameId)?.found}
                onClick={() => handleConfirm(selectedGameId)}
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

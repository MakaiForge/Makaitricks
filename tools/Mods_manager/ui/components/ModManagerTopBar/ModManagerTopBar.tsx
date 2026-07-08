import { useRef, useCallback } from "react";
import { Button } from "@renderer/components";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";

interface ModManagerTopBarProps {
  deploying: boolean;
  installing: boolean;
  launching: boolean;
  hasGame: boolean;
  t: (key: string) => string;
  onInstallMod: () => void;
  onDeploy: () => void;
  onLaunchGame: () => void;
  onProtonConfig: () => void;
  onRefresh: () => void;
  onRemoveMod: () => void;
  selectedModIdx: number | null;
}

export function ModManagerTopBar({
  deploying, installing, launching, hasGame, selectedModIdx,
  t, onInstallMod, onDeploy, onLaunchGame, onProtonConfig, onRefresh, onRemoveMod,
}: ModManagerTopBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });
  }, []);

  return (
    <div className="mod-manager__topbar-scroll">
      <button className="mod-manager__scroll-arrow" onClick={scrollLeft}><ChevronLeftIcon /></button>
      <div className="mod-manager__topbar-actions" ref={scrollRef}>
        <Button onClick={onLaunchGame} disabled={launching || !hasGame} theme="primary">
          {launching ? "Iniciando..." : "▶ Iniciar Jogo"}
        </Button>
        <Button theme="primary" onClick={onInstallMod} disabled={installing}>
          <PlusIcon /> {installing ? "Instalando..." : t("install_mod")}
        </Button>
        <Button onClick={onDeploy} disabled={deploying}>
          {deploying ? t("deploying") : t("deploy")}
        </Button>
        <Button onClick={onRefresh}>
          {t("refresh")}
        </Button>
        <Button onClick={onRemoveMod} disabled={selectedModIdx === null}>
          Remove
        </Button>
        <Button onClick={onProtonConfig}>
          Configurar Proton
        </Button>
      </div>
      <button className="mod-manager__scroll-arrow" onClick={scrollRight}><ChevronRightIcon /></button>
    </div>
  );
}

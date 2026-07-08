import { registerEvent } from "@main/events/register-event";
import { playGame } from "./play-game";
import type { SendProgress } from "./types";

registerEvent("modPlayGame", async (event, gameId: string, profile?: string) => {
  const sender = event.sender;
  const send: SendProgress = (step, message, status, promptType) => {
    sender.send("mod-launch-progress", { step, message, status, promptType });
  };

  return playGame(gameId, send, profile);
});

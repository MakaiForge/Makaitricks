import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { registerEvent } from "../register-event";

const getGamesFolder = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "games");
};

const ensureGamesFolder = () => {
  const folder = getGamesFolder();
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
};

const getGamesJson = async (): Promise<string[]> => {
  const folder = ensureGamesFolder();
  const files = fs.readdirSync(folder).filter((f) => f.endsWith(".json"));
  return files;
};

const getGames = async () => {
  const files = await getGamesJson();
  const folder = getGamesFolder();

  const games = files.map((file) => {
    const content = fs.readFileSync(path.join(folder, file), "utf-8");
    return JSON.parse(content);
  });

  return games;
};

const getGame = async (_event: Electron.IpcMainInvokeEvent, id: string) => {
  const folder = getGamesFolder();
  const filePath = path.join(folder, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
};

const saveGame = async (
  _event: Electron.IpcMainInvokeEvent,
  game: Record<string, unknown>
) => {
  const folder = ensureGamesFolder();
  const filePath = path.join(folder, `${game.id}.json`);

  fs.writeFileSync(filePath, JSON.stringify(game, null, 2), "utf-8");
  return true;
};

const deleteGame = async (_event: Electron.IpcMainInvokeEvent, id: string) => {
  const folder = getGamesFolder();
  const filePath = path.join(folder, `${id}.json`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return true;
};

registerEvent("gamesJsonGetAll", getGames);
registerEvent("gamesJsonGet", getGame);
registerEvent("gamesJsonSave", saveGame);
registerEvent("gamesJsonDelete", deleteGame);

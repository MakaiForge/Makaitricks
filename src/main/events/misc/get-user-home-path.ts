import { registerEvent } from "../register-event";
import { app } from "electron";

const getUserHomePath = async (): Promise<string> => {
  return app.getPath("home");
};

registerEvent("getUserHomePath", getUserHomePath);

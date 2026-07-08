import { ProtonDebridClient } from "@provision/ForgePipeline/services/download/proton-debrid";
import { registerEvent } from "../register-event";

const checkDebridAvailability = async (
  _event: Electron.IpcMainInvokeEvent,
  magnets: string[]
) => {
  return ProtonDebridClient.getAvailableMagnets(magnets);
};

registerEvent("checkDebridAvailability", checkDebridAvailability);

import { registerEvent } from "../register-event";
import type { UpdateProfileRequest } from "@types";

const updateProfile = async (
  _event: Electron.IpcMainInvokeEvent,
  updateProfile: UpdateProfileRequest
) => {
  return updateProfile;
};

registerEvent("updateProfile", updateProfile);

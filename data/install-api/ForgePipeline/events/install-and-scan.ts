import { registerEvent } from "@main/events/register-event"
import { installAndScan } from "../orchestrator/orchestrator"
import type { InstallOptions, InstallResult } from "../orchestrator/types"

registerEvent(
  "installAndScan",
  async (
    _event: Electron.IpcMainInvokeEvent,
    filePath: string,
    options: InstallOptions
  ): Promise<InstallResult> => {
    return await installAndScan(filePath, options)
  }
)

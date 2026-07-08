import { registerEvent } from "../register-event";
import { ProtonForgeApi } from "@main/services/protonforge-api";

interface ProtonForgeApiCallPayload {
  method: "get" | "post" | "put" | "patch" | "delete";
  url: string;
  data?: unknown;
  params?: unknown;
  options?: {
    needsAuth?: boolean;
    needsSubscription?: boolean;
    ifModifiedSince?: Date;
  };
}

const protonForgeApiCall = async (
  _event: Electron.IpcMainInvokeEvent,
  payload: ProtonForgeApiCallPayload
) => {
  const { method, url, data, params, options } = payload;

  const getErrorMessage = (error: unknown): string | null => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === "object" && error !== null) {
      const response = (
        error as { response?: { data?: { message?: unknown } } }
      ).response;
      const responseMessage = response?.data?.message;

      if (typeof responseMessage === "string") {
        return responseMessage;
      }
    }

    return null;
  };

  try {
    let request: Promise<unknown>;

    switch (method) {
      case "get":
        request = ProtonForgeApi.get(url, params, options);
        break;
      case "post":
        request = ProtonForgeApi.post(url, data, options);
        break;
      case "put":
        request = ProtonForgeApi.put(url, data, options);
        break;
      case "patch":
        request = ProtonForgeApi.patch(url, data, options);
        break;
      case "delete":
        request = ProtonForgeApi.delete(url, options);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return await request;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage ?? "protonforge-api-call-failed");
  }
};

registerEvent("protonForgeApiCall", protonForgeApiCall);

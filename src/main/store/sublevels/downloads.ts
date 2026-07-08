import type { Download } from "@types";
import { downloadsDb } from "../databases";

export const downloadsStore = downloadsDb as any;

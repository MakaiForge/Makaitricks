import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { getVenvPythonPath } from "@prefix/core/venv";

type PendingRpc = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
};

export class ProtonForgeRPC {
  private static process: cp.ChildProcess | null = null;
  private static pending = new Map<number, PendingRpc>();
  private static nextId = 1;
  private static buf = "";
  private static ready = false;
  private static readyPromise: Promise<void> | null = null;
  private static readyResolve: (() => void) | null = null;

  static async call<T = unknown>(method: string, params?: unknown, timeoutMs = 120_000): Promise<T> {
    if (!this.process) await this.spawn();
    await this.ensureReady();

    if (!this.process?.stdin) throw new Error("ProtonForge RPC not available");

    const id = this.nextId++;
    const payload = { id, method, params: params ?? {} };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ProtonForge RPC timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.process?.stdin?.write(JSON.stringify(payload) + "\n");
    });
  }

  static async spawn(): Promise<void> {
    if (this.process) return;
    this.ready = false;
    this.readyPromise = new Promise<void>((resolve) => { this.readyResolve = resolve; });
    this.buf = "";

    const python = getVenvPythonPath() || "python3";
    const script = path.join(app.getAppPath(), "tools", "python-rpc", "protonforge-api", "server.py");

    if (!fs.existsSync(script)) {
      throw new Error(`ProtonForge RPC script not found: ${script}`);
    }

    const child = cp.spawn(python, [script, "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdout?.setEncoding("utf-8");
    child.stdout?.on("data", (chunk: string) => {
      this.buf += chunk;
      this.processBuffer();
    });

    child.stderr?.setEncoding("utf-8");
    child.stderr?.on("data", (chunk: string) => {
      console.error("[ProtonForgeRPC:stderr]", chunk);
    });

    child.on("error", (err) => this.handleExit(String(err)));
    child.on("exit", (code, signal) => this.handleExit(`code=${code} signal=${signal}`));

    this.process = child;

    try {
      await Promise.race([
        this.readyPromise,
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error("ProtonForge RPC startup timeout")), 10_000)),
      ]);
    } catch (err) {
      this.kill();
      throw err;
    }
  }

  private static processBuffer() {
    let nl = this.buf.indexOf("\n");
    while (nl >= 0) {
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (line) this.handleLine(line);
      nl = this.buf.indexOf("\n");
    }
  }

  private static handleLine(line: string) {
    let parsed: any;
    try { parsed = JSON.parse(line); } catch { return; }

    if (parsed.event === "ready") {
      this.ready = true;
      this.readyResolve?.();
      this.readyResolve = null;
      return;
    }

    if (typeof parsed.id !== "number") return;
    const pending = this.pending.get(parsed.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(parsed.id);

    if (parsed.error) {
      pending.reject(new Error(parsed.error.message || parsed.error.code));
    } else {
      pending.resolve(parsed.result);
    }
  }

  private static handleExit(reason: string) {
    const err = new Error(`ProtonForge RPC exited: ${reason}`);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
    this.ready = false;
    this.readyPromise = null;
    this.readyResolve = null;
    this.process = null;
    this.buf = "";
  }

  private static async ensureReady(timeoutMs = 10_000): Promise<void> {
    if (this.ready) return;
    if (!this.readyPromise) throw new Error("ProtonForge RPC not running");
    await Promise.race([
      this.readyPromise,
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error("ProtonForge RPC ready timeout")), timeoutMs)),
    ]);
  }

  /** Spawns the Python RPC server eagerly at startup. Safe to call multiple times. */
  static async init(): Promise<void> {
    if (this.process) return;
    console.log("[ProtonForgeRPC] init() — spawning server.py...");
    try {
      await this.spawn();
      console.log("[ProtonForgeRPC] init() — ready");
    } catch (err) {
      console.error("[ProtonForgeRPC] init() — failed:", err);
    }
  }

  static kill(): void {
    this.process?.kill();
    this.handleExit("killed");
  }

  static isRunning(): boolean {
    return this.process !== null && this.ready;
  }
}

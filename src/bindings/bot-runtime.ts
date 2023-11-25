import { createAdapters } from "../adapters";
import { Logs } from "../adapters/supabase";

class Runtime {
  private static _instance: Runtime;
  private _adapters: ReturnType<typeof createAdapters>;
  private _logger: Logs;

  private constructor() {
    this._adapters = {} as ReturnType<typeof createAdapters>;
    this._logger = {} as Logs;
  }

  public static getState(): Runtime {
    if (!Runtime._instance) {
      Runtime._instance = new Runtime();
    }
    return Runtime._instance;
  }

  public get adapters(): ReturnType<typeof createAdapters> {
    return this._adapters;
  }

  public set adapters(adapters: ReturnType<typeof createAdapters>) {
    this._adapters = adapters;
  }

  public get logger(): Logs {
    return this._logger;
  }

  public set logger(logger: Logs) {
    this._logger = logger;
  }
}

export default Runtime;

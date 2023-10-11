import { Context } from "probot";
import { BotConfig } from "../types";
import { createAdapters } from "../adapters";
import { Logs } from "../adapters/supabase";

class Runtime {
  private static instance: Runtime;
  private _eventContext: Context;
  private _botConfig: BotConfig;
  private _adapters: ReturnType<typeof createAdapters>;
  private _logger: Logs;

  private constructor() {
    this._eventContext = {} as Context;
    this._botConfig = {} as BotConfig;
    this._adapters = {} as ReturnType<typeof createAdapters>;
    this._logger = {} as Logs;
  }

  public static getState(): Runtime {
    if (!Runtime.instance) {
      Runtime.instance = new Runtime();
    }
    return Runtime.instance;
  }

  public get eventContext(): Context {
    return this._eventContext;
  }

  public set eventContext(context: Context) {
    this._eventContext = context;
  }

  public get botConfig(): BotConfig {
    return this._botConfig;
  }

  public set botConfig(config: BotConfig) {
    this._botConfig = config;
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

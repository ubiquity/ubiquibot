import { Context } from "probot";
import { createAdapters } from "../adapters";
import { Logs } from "../adapters/supabase";
import { AllConfigurationTypes } from "../types/configuration";
import { GitHubEvent } from "../types/payload";

class Runtime {
  private static instance: Runtime;
  private _eventContext: Context[];
  private _botConfig: AllConfigurationTypes;
  private _adapters: ReturnType<typeof createAdapters>;
  private _logger: Logs;

  private constructor() {
    this._eventContext = [] as Context[];
    this._botConfig = {} as AllConfigurationTypes;
    this._adapters = {} as ReturnType<typeof createAdapters>;
    this._logger = {} as Logs;
  }

  public static getState(): Runtime {
    if (!Runtime.instance) {
      Runtime.instance = new Runtime();
    }
    return Runtime.instance;
  }

  // public eventContextByKeyPair(keyPair: { [key: string]: string }) {
  //   const [key, value] = Object.entries(keyPair)[0];
  //   return this._eventContext.find((context) => context[key] === value);
  // }
  public eventContextByType(name: GitHubEvent) {
    return this._eventContext.find((context) => context.name === name);
  }
  // public eventContextById(id: string) {
  //   return this._eventContext.find((context) => context.id === id);
  // }

  public get latestEventContext() {
    const latestContext = this._eventContext[this._eventContext.length - 1];
    return latestContext;
  }

  public set latestEventContext(context: Context) {
    this._eventContext.push(context);
  }

  public get botConfig(): AllConfigurationTypes {
    return this._botConfig;
  }

  public set botConfig(config: AllConfigurationTypes) {
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

import { reset, restore, stub } from "sinon";
import { Context } from "probot";
import * as GlobalFns from "../src/bindings/event";
import { BotConfig } from "../src/types";
import { Adapters } from "../src/types/adapters";

export let contextMock: Context;
export let configMock: BotConfig;
export let adaptersMock: Adapters;
export let loggerMock: GlobalFns.Logger;

export const hooks = {
  async beforeEach() {},
  afterEach() {
    restore();
    reset();
  },
};

export const createMockSupabaseClient = () => {};
export const createMockTelegramClient = () => {};

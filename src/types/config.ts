import { Static, Type } from "@sinclair/typebox"


export const ConfigSchema = Type.Object({
    price: Type.Object({
        base: Type.Number()
    })
})

export type BotConfig = Static<typeof ConfigSchema>;
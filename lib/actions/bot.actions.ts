"use server";

import Bot from "../models/bot.model";
import { connectToDB } from "../mongoose";

export async function launchBot() {
    try {
        await connectToDB();

        const bot = await Bot.findOne({ name : "Kraken-VEVOR" })

        return JSON.stringify(bot)
    } catch (error: any) {
        throw new Error(`Error launching bot: ${error.message}`)
    }
}
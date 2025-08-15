import mongoose from "mongoose";

const botSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    available:{
        type: Boolean,
    }
})

const Bot = mongoose.models.Bot || mongoose.model("Bot", botSchema);

export default Bot;
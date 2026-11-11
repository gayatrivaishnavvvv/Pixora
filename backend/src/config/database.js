import mongoose from "mongoose"

export async function connectDatabase(mongoUri) {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  })
}

import mongoose from "mongoose";
import { env } from './env.js';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB conectado correctamente");
  } catch (error) {
    console.warn("⚠️ No se pudo establecer conexión inicial con MongoDB. El servidor continuará ejecutándose:", (error as Error).message);
  }
};

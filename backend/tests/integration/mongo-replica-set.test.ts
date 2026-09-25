import mongoose from 'mongoose';
import { afterAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_MONGO_INTEGRATION === '1';

describe.skipIf(!enabled)('MongoDB replica-set gate', () => {
  const uri = process.env.MONGODB_URI;
  const probeCollection = `integration_probe_${Date.now()}`;

  it('commits and rolls back a transaction on the disposable database', async () => {
    if (!uri) throw new Error('MONGODB_URI is required when RUN_MONGO_INTEGRATION=1');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const collection = mongoose.connection.collection(probeCollection);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await collection.insertOne({ marker: 'committed' }, { session });
      });
      await expect(collection.countDocuments({ marker: 'committed' })).resolves.toBe(1);

      await expect(session.withTransaction(async () => {
        await collection.insertOne({ marker: 'rolled-back' }, { session });
        throw new Error('intentional rollback probe');
      })).rejects.toThrow('intentional rollback probe');
      await expect(collection.countDocuments({ marker: 'rolled-back' })).resolves.toBe(0);
    } finally {
      await session.endSession();
      await collection.drop().catch(() => undefined);
      await mongoose.disconnect();
    }
  }, 15000);
});
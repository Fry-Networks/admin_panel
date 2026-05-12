import type { Db } from "mongodb";

export function getVirtualDevicesCollection(db: Db) {
  const collectionName = process.env.TEST_MODE === "true" ? "test-devices" : "devices";
  return db.collection(collectionName);
}

export function getVirtualDevicesCollectionName(): string {
  return process.env.TEST_MODE === "true" ? "test-devices" : "devices";
}

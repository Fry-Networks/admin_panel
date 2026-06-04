import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import clientPromise from "@/lib/mongoclient";
import { getVirtualDevicesCollection } from "@/lib/virtual-devices";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin) return res.status(401).json({ message: "Unauthorized" });

  const { action, miner_keys, reward_wallet } = req.body;
  if (!action || !Array.isArray(miner_keys) || miner_keys.length === 0) {
    return res.status(400).json({ message: "action and miner_keys[] required" });
  }
  if (miner_keys.length > 100) {
    return res.status(400).json({ message: "Max 100 devices per bulk operation" });
  }
  if (action !== "activate" && action !== "deactivate" && action !== "cancel") {
    return res.status(400).json({ message: "action must be activate, deactivate, or cancel" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("main");
    const collection = getVirtualDevicesCollection(db);
    const results: Array<{ miner_key: string; status: string; error?: string }> = [];
    let success = 0;
    let failed = 0;

    for (const key of miner_keys) {
      const device = await collection.findOne({ miner_key: key, virtual: true });
      if (!device) {
        results.push({ miner_key: key, status: "error", error: "Not found" });
        failed++;
        continue;
      }

      if (action === "activate") {
        if (device.activated || device.transitioned_at || device.canceled_at) {
          const reason = device.activated ? "Already activated" : device.transitioned_at ? "Transitioned" : "Canceled";
          results.push({ miner_key: key, status: "error", error: reason });
          failed++;
          continue;
        }
        await collection.updateOne({ miner_key: key, virtual: true }, { $set: {
          activated: true, activated_at: new Date(),
          reward_wallet: reward_wallet || null, address: reward_wallet || null,
        }});
      } else if (action === "cancel") {
        if (device.canceled_at) {
          results.push({ miner_key: key, status: "ok" });
          success++;
          continue;
        }
        if (device.transitioned_at) {
          results.push({ miner_key: key, status: "error", error: "Transitioned" });
          failed++;
          continue;
        }
        const updateResult = await collection.updateOne({ miner_key: key, virtual: true, canceled_at: null, transitioned_at: null }, { $set: {
          canceled_at: new Date(), activated: false, activated_at: null,
          reward_wallet: null, address: null,
        }});
        if (updateResult.matchedCount === 0) {
          results.push({ miner_key: key, status: "error", error: "State changed during cancellation" });
          failed++;
          continue;
        }
      } else {
        if (!device.activated) {
          results.push({ miner_key: key, status: "error", error: "Not activated" });
          failed++;
          continue;
        }
        await collection.updateOne({ miner_key: key, virtual: true }, { $set: {
          activated: false, activated_at: null, reward_wallet: null, address: null,
        }});
      }

      results.push({ miner_key: key, status: "ok" });
      success++;
    }

    res.status(200).json({ success, failed, results });
  } catch (error) {
    console.error("Error in bulk virtual device operation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

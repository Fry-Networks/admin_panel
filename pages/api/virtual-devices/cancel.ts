import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import clientPromise from "@/lib/mongoclient";
import { getVirtualDevicesCollection } from "@/lib/virtual-devices";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user.admin) return res.status(401).json({ message: "Unauthorized" });

  const { miner_key } = req.body;
  if (!miner_key) return res.status(400).json({ message: "miner_key required" });

  try {
    const client = await clientPromise;
    const db = client.db("main");
    const device = await getVirtualDevicesCollection(db).findOne({ miner_key, virtual: true });

    if (!device) return res.status(404).json({ message: "Virtual device not found" });
    if (device.canceled_at) return res.status(409).json({ message: "Device already canceled" });
    if (device.transitioned_at) return res.status(409).json({ message: "Device already transitioned" });

    const result = await getVirtualDevicesCollection(db).findOneAndUpdate(
      { miner_key, virtual: true, canceled_at: null, transitioned_at: null },
      { $set: {
        canceled_at: new Date(),
        activated: false,
        activated_at: null,
        reward_wallet: null,
        address: null,
      }},
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(409).json({ message: "Device state changed during cancellation" });
    }

    res.status(200).json({ device: JSON.parse(JSON.stringify(result)) });
  } catch (error) {
    console.error("Error canceling virtual device:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

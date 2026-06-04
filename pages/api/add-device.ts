import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import clientPromise from "../../lib/mongoclient";
import randomstring from "randomstring";
import { ObjectId } from "mongodb";
import { MANUFACTURER_CONFIG } from "../../lib/manufacturers";

interface Data {
    email: string,
    id: string,
    order: string
    byod?: string
    api_type?: string
    credentials?: Record<string, string>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user.admin) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const client = await clientPromise;
    const mainDb = client.db("main");
    const credsDb = client.db("creds");

    const { email, id, order, byod, api_type, credentials } = req.body;

    const product = await mainDb.collection("products").findOne({ _id: new ObjectId(id) });
    if (!product) {
        res.status(400).json({ message: "Invalid product id" });
        return;
    }

    // Validate manufacturer if provided
    if (api_type && !MANUFACTURER_CONFIG[api_type]) {
        res.status(400).json({ message: "Invalid manufacturer / api_type" });
        return;
    }

    // Validate required credential fields
    if (api_type && credentials) {
        const config = MANUFACTURER_CONFIG[api_type];
        for (const field of config.fields) {
            if (field.required && (!credentials[field.name] || credentials[field.name].trim().length === 0)) {
                res.status(400).json({ message: `Missing required credential field: ${field.label}` });
                return;
            }
            if (credentials[field.name] && credentials[field.name].trim().length > 500) {
                res.status(400).json({ message: `Credential field ${field.label} exceeds 500 characters` });
                return;
            }
        }
    }

    async function generateMinerKey(index: string) {
        let key = randomstring.generate({ length: 32, charset: 'alphanumeric', capitalization: 'uppercase' });
        let minerKey = `${index}-${key}`;
        while (await mainDb.collection("devices").findOne({ miner_key: minerKey })) {
            key = randomstring.generate({ length: 32, charset: 'alphanumeric', capitalization: 'uppercase' });
            minerKey = `${index}-${key}`;
        }
        return minerKey;
    }

    try {
        const miner_key = await generateMinerKey(product.key);

        // Insert into main.devices
        await mainDb.collection("devices").insertOne({
            miner_key,
            email,
            name: product.name,
            created_at: new Date(),
            is_registered: false,
            order,
            byod
        });

        // Insert into creds collection if manufacturer and credentials provided
        if (api_type && credentials) {
            const category = MANUFACTURER_CONFIG[api_type].category;
            await credsDb.collection(category).updateOne(
                { miner_key },
                {
                    $set: {
                        miner_key,
                        api_type,
                        credentials,
                        credentials_saved_at: new Date(),
                    }
                },
                { upsert: true }
            );
        }

        res.status(200).json({ message: "ok" });
    } catch (error) {
        console.error("add-device error:", error);
        res.status(500).json({ message: "error" });
    }
}

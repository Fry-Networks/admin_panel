import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongoclient";
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]";
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated and is an admin
    if ((!session || !session.user.admin || !session.user.owner) && process.env.NODE_ENV !== 'development') {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('dao');

    if (req.method === 'PUT') {
        const data: { title: string, description: string,  options: {title: string, description: string}[] } = req.body;
        const { title, description,  options } = data;


        console.log("Adding vote", title);
        console.log(`Vote successfully added by ${session?.user.email}`);
        try {
            await collection.insertOne({ 
                title: title,
                total_votes: 0,
                createdAt: new Date(),
                current: false,
                description: description,
                votes: options.map((option, index) => {
                    return {
                        option: index.toString(),
                        description: option.description,
                        title: option.title,
                        votes: 0,
                        different_people: []
                    }
                })

            });

            res.status(200).json({ message: "Vote added successfully" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error adding vote" });
        }
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}

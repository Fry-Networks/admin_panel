import {
    Card,
    Metric,
    Text,
    Title,
    Button,
    Flex,
    Grid,
    MultiSelect,
    MultiSelectItem,
    Textarea,
    DatePicker,

} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { Key, useEffect, useMemo, useState } from 'react';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';
import { Dialog, DialogPanel, Divider, TextInput } from '@tremor/react';

import { RiArrowDownSLine, RiCloseLine } from '@remixicon/react';
import ModalCreateVote from '../components/create-vote';
export default function DaoPage({
    votes
}: {
    votes: Vote[]
}) {
    console.log("bla", votes);
    const [isOpen, setIsOpen] = useState(false);
    const [vote_title, setVoteTitle] = useState("");
    const [vote_description, setVoteDescription] = useState("");
    const [vote_end_date, setVoteEndDate] = useState(new Date());
    const [vote_options, setVoteOptions] = useState([{}] as { title: string, description: string }[]);
    const [updateSuccess, setUpdateSuccess] = useState(""); // State to track update success
    const handleAddOption = (e: any) => {
        e.preventDefault();
        setVoteOptions([...vote_options, { title: "", description: "" }]);
    };


    return (
        <main className="p-4 md:p-10 mx-auto max-w-7xl">
            <Flex alignItems="start" justifyContent="start" flexDirection="row" className="mt-6">
                <Title>Votes</Title>

                <button
                    type="button"

                    className="whitespace-nowrap rounded-tremor-default bg-tremor-brand px-4 py-2 ml-4 text-center text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis"
                    onClick={() => setIsOpen(true)}
                >
                    Create Vote
                </button>
                <div className="sm:max-w-5xl">
                <ModalCreateVote isOpen={isOpen} setIsOpen={setIsOpen} />
                </div>

            </Flex>
            <Divider />
            <Flex>

                {votes ? votes.map((vote) => {
                    console.log("vote", vote);
                    return (
                        <Card key={vote._id} className='ml-4 mr-4 mt-4'>
                            <Flex flexDirection="col" alignItems='center' justifyContent='center'>
                            <Title style={{fontSize: "25px"}}  className='mb-2' >{vote.title}</Title>
                            <Text className='mb-5'>{vote.description}</Text>
                            </Flex>
                            
                            {vote.votes.map((option, index) => {
                                console.log("option", option);
                                return (
                                    <div key={index}>
                                    <Title style={{fontSize: "15px"}} key={index}>{index}.{option.title}</Title>
                                    <Text key={index}>{option.description}</Text>
                                    </div>
                                )
                            })}
                            <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                            <Button color="green" className='mt-3'
                            >Choose as current vote</Button>
                            </Flex>
                        </Card>
                    )
                }) : <Text>No votes found</Text>}
            </Flex>




        </main >
    );
}

export async function getServerSideProps(context: any) {
    const session = await getSession(context);
    /*if (!session || !session.user?.admin) {
        return {
            props: { error: 'Unauthorized access' },
        };
    }
    */
    try {
        const client = await clientPromise;
        const db = client.db("main");

        const votes = await db
            .collection("dao")
            .find({})
            .toArray();
        console.log("coucou", votes);
        return {
            props: { votes: JSON.parse(JSON.stringify(votes)) },
        };
    } catch (e) {
        console.error(e);
    }
}

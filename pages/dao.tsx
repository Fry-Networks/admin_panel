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

} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { Key, useEffect, useMemo, useState } from 'react';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';
import { Dialog, DialogPanel, Divider, TextInput } from '@tremor/react';

import { RiArrowDownSLine, RiCloseLine } from '@remixicon/react';
export default function DaoPage({
    votes
}: {
    votes: Vote[]
}) {

    const [isOpen, setIsOpen] = useState(false);
    const [vote_title, setVoteTitle] = useState("");
    const [vote_description, setVoteDescription] = useState("");
    const [vote_options, setVoteOptions] = useState([{}] as any);

    const handleAddOption = (e: any) => {
        e.preventDefault();
        setVoteOptions([...vote_options, { title: "", description: "" }]);
    };

    const updateOption = (index: any, field: any, value: any) => {
        const updatedOptions = vote_options.map((option: any, idx: any) => {
            if (idx === index) {
                return { ...option, [field]: value };
            }
            return option;
        });
        setVoteOptions(updatedOptions);
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

                <Dialog
                    open={isOpen}
                    onClose={() => setIsOpen(false)}
                    static={true}
                    className="z-[100]"
                >
                    <DialogPanel className="sm:max-w-md">
                        <div className="absolute right-0 top-0 pr-3 pt-3">
                            <button
                                type="button"
                                className="rounded-tremor-small p-2 text-tremor-content-subtle hover:bg-tremor-background-subtle hover:text-tremor-content dark:text-dark-tremor-content-subtle hover:dark:bg-dark-tremor-background-subtle hover:dark:text-tremor-content"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                <RiCloseLine
                                    className="h-5 w-5 shrink-0"
                                    aria-hidden={true}
                                />
                            </button>
                        </div>
                        <form action="#" method="POST">
                            <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                Create a Vote
                            </h4>
                            <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
                                Note: this will replace the current vote if there is one.
                            </p>
                            <TextInput placeholder="Title" className='mt-2' onValueChange={(value) => setVoteTitle(value)} />
                            <Textarea placeholder="Description" className='mt-2' onValueChange={(value) => setVoteDescription(value)} />
                            <Flex className="grid grid-cols-2 gap-4">
                            {vote_options.map((option: { title: string | undefined; description: string | number | undefined; }, index: Key | null | undefined) => (
                                <div key={index}>
                                    <Divider />
                                    <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                        Option {+(index ?? 0) + 1}
                                    </h4>
                                    <TextInput placeholder="Option Title" value={option.title}
                                               onValueChange={(value) => updateOption(index, 'title', value)} />
                                    <Textarea placeholder="Option Description" value={option.description}
                                              onValueChange={(value) => updateOption(index, 'description', value)} />
                                </div>
                            ))}
                            </Flex>
                            <Button className="mt-2"
                                onClick={handleAddOption}
                            >
                                Add option</Button>
                            <div id='options'>

                            </div>
                        </form>
                    </DialogPanel>
                </Dialog>


            </Flex>

        </main >
    );
}

export async function getServerSideProps(context: any) {
    const session = await getSession(context);
    if (!session || !session.user?.admin) {
        return {
            props: { error: 'Unauthorized access' },
        };
    }
    try {
        const client = await clientPromise;
        const db = client.db("main");

        const votes = await db
            .collection("dao")
            .find({})
            .toArray();

        return {
            props: { votes: JSON.parse(JSON.stringify(votes)) },
        };
    } catch (e) {
        console.error(e);
    }
}

import {
    Button,
    Flex,
    Textarea,
    DatePicker,
    Switch,

} from '@tremor/react';
import { Key, useState } from 'react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';
import { Dialog, DialogPanel, Divider, TextInput } from '@tremor/react';

import { RiCloseLine } from '@remixicon/react';
export default function ModalChooseAsCurrent({ isOpen, setIsOpen, vote, index }: { isOpen: boolean, setIsOpen: Function, vote: { id: string, title: string }, index: number }) {

    const [vote_end_date, setVoteEndDate] = useState(new Date());
    const [updateSuccess, setUpdateSuccess] = useState(""); // State to track update success
    const [isSwitchOn, setIsSwitchOn] = useState(false);
    const [isHiddenSwitchOn, setIsHiddenSwitchOn] = useState(false);


    const handleSubmit = async (e: any) => {
        const updateData = {
            id: vote,
            end_date: vote_end_date,
            super_majority: isSwitchOn,
            hidden: isHiddenSwitchOn
        };
        const response = await fetch('/api/choose-vote', { // Replace with your actual API endpoint
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            setUpdateSuccess("error"); // Reset success state
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Updated product:', result);
        window.location.reload();
    };
    return (
        <Dialog
            open={isOpen}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onClose={() => setIsOpen(false)}
            static={true}
            className={"z-[" + (200 + 200 * index) + "]"}
        >
            <DialogPanel onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }} className="sm:max-w-5xl">
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
                        Select this vote: {vote.title}
                    </h4>
                    <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
                        The previous vote will be archived and the new vote will be selected as the current vote.
                    </p>
                    <DatePicker placeholder='Select the end date' onValueChange={(value) => setVoteEndDate(value ?? new Date())} minDate={new Date(new Date().getTime() + 24 * 60 * 60 * 1000)} />
                    <Flex flexDirection='row' className='mt-5' alignItems='start' justifyContent='start'>
                        <Switch
                            id="switch"
                            name="switch"
                            className='mr-2'
                            checked={isSwitchOn}
                            onChange={() => setIsSwitchOn(!isSwitchOn)}
                        />
                        <label htmlFor="switch" className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                            Activate{' '}
                            <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">super majority (need half the votes + 1)</span>
                        </label>
                    </Flex>
                    <Flex flexDirection='row' className='mt-5' alignItems='start' justifyContent='start'>
                        <Switch
                            id="switch_hidden"
                            name="switch_hidden"
                            className='mr-2'
                            checked={isHiddenSwitchOn}
                            onChange={() => setIsHiddenSwitchOn(!isHiddenSwitchOn)}
                        />
                        <label htmlFor="switch" className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                            Activate{' '}
                            <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">hidden votes</span>
                        </label>
                    </Flex>
                    <Flex flexDirection='col' className='mt-2' alignItems='start' justifyContent='start'>

                        <div className="w-full flex justify-center"> {/* Container to center the button */}
                            <Button className="mt-2"
                                color='green'
                                size='xl'
                                onClick={(e) => {
                                    handleSubmit(e);
                                    setIsOpen(false);
                                }}
                            >
                                Submit</Button>
                        </div>
                    </Flex>
                </form>
            </DialogPanel>
        </Dialog>
    );
}
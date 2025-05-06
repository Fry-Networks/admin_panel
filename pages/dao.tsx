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
  Icon
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { Key, useEffect, useMemo, useState } from 'react';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';
import { Dialog, DialogPanel, Divider, TextInput } from '@tremor/react';

import {
  RiArrowDownSLine,
  RiCheckboxCircleFill,
  RiCloseLine
} from '@remixicon/react';
import ModalCreateVote from '../components/create-vote';
import ModalChooseAsCurrent from '../components/choose-vote';
import ModalVoteStatus from '../components/vote-status';
export default function DaoPage({ votes }: { votes: Vote[] }) {
  console.log('bla', votes);
  const [isOpen, setIsOpen] = useState(false);
  const [openModalId, setOpenModalId] = useState(null);
  const [vote_options, setVoteOptions] = useState([{}] as {
    title: string;
    description: string;
  }[]);
  const [openStatusModalId, setOpenStatusModalId] = useState(null);
  const [stakeInfo, setStakeInfo] = useState([]);
  const handleOpenModal = (id: any) => {
    setOpenModalId(id);
  };

  const handleCloseModal = () => {
    setOpenModalId(null);
  };

  const handleCloseStatusModal = () => {
    setOpenStatusModalId(null);
  };
  const handleStop = async (id: any) => {
    const updateData = {
      id: id
    };
    const response = await fetch('/api/stop-vote', {
      // Replace with your actual API endpoint
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Updated product:', result);
    //reload page
    window.location.reload();
  };

  const handleDelete = async (id: any) => {
    const updateData = {
      id: id
    };
    const response = await fetch('/api/delete-vote', {
      // Replace with your actual API endpoint
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Updated product:', result);
    //reload page
    window.location.reload();
  };

  const handleState = async (id: any) => {
    const updateState = {
      id: id
    };

    const response = await fetch('/api/get-vote-status', {
      // Replace with your actual API endpoint
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateState)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} Error: ${result.message}`
      );
    }

    const stakeInformation = result.data;
    setStakeInfo(stakeInformation);
    setOpenStatusModalId(id);
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl">
      <Flex
        alignItems="start"
        justifyContent="start"
        flexDirection="row"
        className="mt-6"
      >
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
      <Flex
        alignItems="start"
        justifyContent="start"
        flexDirection="row"
        className="mt-6"
      >
        {votes ? (
          votes.map((vote, index) => {
            console.log('vote', vote);
            return (
              <Card key={vote._id} className="ml-4 mr-4 mt-4">
                <Flex
                  flexDirection="col"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Flex
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {vote.current ? (
                      <Icon
                        color="green"
                        size="xl"
                        icon={RiCheckboxCircleFill}
                      />
                    ) : null}
                    <Title style={{ fontSize: '25px' }} className="mb-2">
                      {vote.title}
                    </Title>
                  </Flex>
                  <Text className="mb-5">{vote.description}</Text>
                </Flex>

                {vote.votes.map((option, index) => (
                  <div key={option.id || index}>
                    {' '}
                    {/* Assuming each option has a unique 'id' */}
                    <Title style={{ fontSize: '15px' }}>
                      {index + 1}.{option.title}
                    </Title>
                    <Text>{option.description}</Text>
                    <Text>Votes: {option.votes}</Text>
                  </div>
                ))}
                <Flex
                  className="mt-3"
                  flexDirection="row"
                  justifyContent="center"
                  alignItems="center"
                >
                  {!vote.current ? (
                    <Button
                      color="green"
                      className="mr-3"
                      onClick={() => handleOpenModal(vote._id)}
                    >
                      Choose as current vote
                    </Button>
                  ) : (
                    <Button
                      color="amber"
                      className="mr-3"
                      onClick={(e) => handleStop(vote._id)}
                    >
                      Stop vote
                    </Button>
                  )}
                  <Button
                    color="red"
                    className="mr-3"
                    onClick={() => handleDelete(vote._id)}
                  >
                    Delete
                  </Button>
                  <Button color="green" onClick={() => handleState(vote._id)}>
                    View State
                  </Button>
                </Flex>
                <ModalChooseAsCurrent
                  index={index}
                  key={vote._id}
                  isOpen={openModalId === vote._id}
                  setIsOpen={handleCloseModal}
                  vote={{ id: vote._id, title: vote.title }}
                />
                <ModalVoteStatus
                  isOpen={openStatusModalId === vote._id}
                  setIsOpen={handleCloseStatusModal}
                  stakeInfo={stakeInfo}
                />
              </Card>
            );
          })
        ) : (
          <Text>No votes found</Text>
        )}
      </Flex>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  /*if (!session || !session.user?.admin) {
        return {
            props: { error: 'Unauthorized access' },
        };
    }*/

  const testMode = process.env.NEXT_PUBLIC_DAO_TEST === 'true' ? true : false;

  try {
    const client = await clientPromise;
    const db = client.db('main');

    const votes = await db
      .collection(testMode ? 'test-dao' : 'dao')
      .find({ deleted: { $ne: true } })
      .toArray();
    return {
      props: { votes: JSON.parse(JSON.stringify(votes)) }
    };
  } catch (e) {
    console.error(e);
  }
}

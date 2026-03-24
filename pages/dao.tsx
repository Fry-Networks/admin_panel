import {
  Card,
  Text,
  Title,
  Button,
  Flex,
  Icon,
  Callout,
  Divider
} from '@tremor/react';
import clientPromise from '../lib/mongoclient';
import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';

import {
  RiCheckboxCircleFill
} from '@remixicon/react';
import ModalCreateVote from '../components/create-vote';
import ModalChooseAsCurrent from '../components/choose-vote';
import ModalVoteStatus from '../components/vote-status';
import ModalEditVote from '../components/edit-vote';

type ActivationResult = {
  status: 'success' | 'error';
  message: string;
  payload?: {
    id: string;
    end_date: Date;
    super_majority: boolean;
    hidden: boolean;
  };
};

export default function DaoPage({ votes }: { votes: Vote[] }) {
  const [voteList, setVoteList] = useState(votes);
  const [isOpen, setIsOpen] = useState(false);
  const [openModalId, setOpenModalId] = useState<string | null>(null);
  const [openStatusModalId, setOpenStatusModalId] = useState<string | null>(null);
  const [stakeInfo, setStakeInfo] = useState([]);
  const [voteSelected, setVoteSelected] = useState<Vote | undefined>(undefined);
  const [activationToast, setActivationToast] = useState<ActivationResult | null>(null);

  useEffect(() => {
    if (!activationToast) return;
    const timer = setTimeout(() => setActivationToast(null), 4000);
    return () => clearTimeout(timer);
  }, [activationToast]);

  const handleOpenModal = (id: any) => {
    setOpenModalId(id);
  };

  const handleCloseModal = () => {
    setOpenModalId(null);
  };

  const handleCloseStatusModal = () => {
    setOpenStatusModalId(null);
  };

  const handleCloseEditModal = () => {
    setVoteSelected(undefined);
  };

  const handleVoteActivated = (result: ActivationResult) => {
    setActivationToast(result);
    if (result.status === 'success' && result.payload) {
      setVoteList((prevVotes) =>
        prevVotes.map((vote) =>
          vote._id.toString() === result.payload!.id
            ? ({
                ...vote,
                current: true,
                end_date: result.payload!.end_date,
                super_majority: result.payload!.super_majority,
                hidden: result.payload!.hidden
              } as unknown as Vote)
            : vote
        )
      );
      setOpenModalId(null);
    }
  };

  const handleStop = async (id: any) => {
    const updateData = { id: id };
    const response = await fetch('/api/stop-vote', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    window.location.reload();
  };

  const handleDelete = async (id: any) => {
    const updateData = { id: id };
    const response = await fetch('/api/delete-vote', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    window.location.reload();
  };

  const handleState = async (id: any) => {
    const updateState = { id: id };

    const response = await fetch('/api/get-vote-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateState)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} Error: ${result.message}`);
    }

    const stakeInformation = result.data;
    setStakeInfo(stakeInformation);
    setOpenStatusModalId(id);
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl bg-gray-950">
      <Flex
        alignItems="start"
        justifyContent="start"
        flexDirection="row"
        className="mt-6"
      >
        <Title className="text-white">Votes</Title>

        <button
          type="button"
          className="whitespace-nowrap rounded-tremor-default bg-red-500 px-4 py-2 ml-4 text-center text-tremor-default font-medium text-white shadow-tremor-input hover:bg-red-600"
          onClick={() => setIsOpen(true)}
        >
          Create Vote
        </button>
        <div className="sm:max-w-5xl">
          <ModalCreateVote isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>
      </Flex>
      <Divider className="border-gray-700" />
      {activationToast && (
        <Callout
          className="mt-4"
          title={activationToast.status === 'success' ? 'Success' : 'Error'}
          color={activationToast.status === 'success' ? 'teal' : 'red'}
        >
          {activationToast.message}
        </Callout>
      )}
      <Flex
        alignItems="start"
        justifyContent="start"
        flexDirection="col"
        className="mt-6"
      >
        {voteList ? (
          voteList.map((vote, index) => {
            return (
              <Card key={vote._id.toString()} className="mb-4 mx-4 bg-gray-900 border-gray-700">
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
                    <Title className="mb-2 text-white text-2xl">
                      {vote.title}
                    </Title>
                  </Flex>
                  <Text className="mb-5 text-gray-300">{vote.description}</Text>
                </Flex>

                {vote.votes.map((option, index) => (
                  <div key={option.id || index}>
                    <Title className="text-base text-gray-200">
                      {index + 1}.{option.title}
                    </Title>
                    <Text className="text-gray-400">{option.description}</Text>
                    <Text className="text-gray-400">Votes: {option.votes}</Text>
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
                      Activate vote
                    </Button>
                  ) : (
                    <Button
                      color="amber"
                      className="mr-3"
                      onClick={() => handleStop(vote._id)}
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
                  <Button
                    color="green"
                    className="mr-3"
                    onClick={() => handleState(vote._id)}
                  >
                    View State
                  </Button>
                  <Button color="purple" onClick={() => setVoteSelected(vote)}>
                    Edit
                  </Button>
                </Flex>
                <ModalChooseAsCurrent
                  index={index}
                  key={vote._id.toString()}
                  isOpen={openModalId === vote._id.toString()}
                  setIsOpen={(value: boolean) =>
                    value
                      ? setOpenModalId(vote._id.toString())
                      : handleCloseModal()
                  }
                  vote={{ id: vote._id.toString(), title: vote.title }}
                  onActivate={handleVoteActivated}
                />
                <ModalVoteStatus
                  isOpen={openStatusModalId === vote._id.toString()}
                  setIsOpen={handleCloseStatusModal}
                  stakeInfo={stakeInfo}
                />
                <ModalEditVote
                  isOpen={voteSelected?._id === vote._id}
                  setIsOpen={handleCloseEditModal}
                  vote={{ id: vote._id.toString(), vote: voteSelected }}
                  index={index}
                  key={vote._id.toString()}
                />
              </Card>
            );
          })
        ) : (
          <Text className="text-gray-400">No votes found</Text>
        )}
      </Flex>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);

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

import { MongoClient } from 'mongodb';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import clientPromise from '../lib/mongoclient';
import { Price } from '../lib/price-schema';
import {
  Button,
  Callout,
  Card,
  Flex,
  NumberInput,
  Select,
  SelectItem,
  TabGroup,
  TabPanel,
  TabPanels,
  TextInput,
  Title
} from '@tremor/react';
import PriceTable from '../app/tables/table-prices';
import Modal from 'react-modal';
import { useEffect, useState } from 'react';
import { FryToken } from '../lib/tokens-schema';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';

export default function PricesPage({
  prices,
  tokens
}: {
  prices: Price[];
  tokens: FryToken[];
}) {
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [isUSD, setIsUSD] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [price, setPrice] = useState(0);
  const router = useRouter();

  const onAddButton = () => {
    setOpenAddModal(true);
  };

  useEffect(() => {
    if (!openAddModal) {
      setAssetId('');
      setProjectName('');
      setPrice(0);
      setIsUSD(true);
    }
  }, [openAddModal]);

  const handleAddPrice = async () => {
    let message = '';
    if (!assetId || !projectName || !price) {
      console.log('Invalid Input');
      return;
    }

    const response = await fetch('api/add-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        no: prices.length + 1,
        projectName,
        price,
        assetId,
        isUSD
      })
    });

    if (!response.ok) {
      message = 'error';
    } else {
      const result = await response.json();
      if (result.status !== 'success') {
        message = 'error';
      } else {
        message = result.message;
      }
    }

    setUpdateSuccess(message);
    setTimeout(() => {
      setUpdateSuccess('');
      router.reload();
    }, 3_000);
    setOpenAddModal(false);
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl">
      <Title>Fry Service Prices</Title>
      <TabGroup className="mt-3">
        <TabPanels>
          <TabPanel>
            <Card>
              <Flex
                flexDirection="row"
                className="gap-3"
                style={{ marginBottom: '2px' }}
              >
                <Button onClick={onAddButton}>Add Price</Button>
              </Flex>

              {updateSuccess != '' && updateSuccess != 'error' && (
                <Callout
                  className="mt-4"
                  title="Success"
                  icon={CheckCircleIcon}
                  color="teal"
                >
                  Successfully {updateSuccess} !
                </Callout>
              )}
              {updateSuccess == 'error' && (
                <Callout
                  className="mt-4"
                  title="Error"
                  icon={CheckCircleIcon}
                  color="red"
                >
                  Error occured during action!
                </Callout>
              )}

              <PriceTable prices={prices} tokens={tokens} />
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <Modal
        isOpen={openAddModal}
        closeTimeoutMS={500}
        style={customStyles}
        contentLabel="Delete Reduction"
      >
        <Flex justifyContent="center">
          <Title>Add Price Modal</Title>
        </Flex>
        <div className="w-full mt-4">
          <label>Project Name</label>
          <TextInput
            placeholder="Please input project name"
            className="mt-2"
            onValueChange={(e) => setProjectName(e)}
          />
        </div>
        <div className="w-full mt-4">
          <label>Price</label>
          <NumberInput
            placeholder="Please input the price"
            className="mt-2"
            onValueChange={(e) => setPrice(e)}
          />
        </div>
        <div className="w-full mt-4">
          <label>Price Measure</label>
          <Select
            defaultValue="usd"
            onValueChange={(e) => {
              console.log(e);
              setIsUSD(e === 'usd');
            }}
          >
            <SelectItem key={0} value={'usd'}>
              USD
            </SelectItem>
            <SelectItem key={0} value={'token'}>
              Token
            </SelectItem>
          </Select>
        </div>
        <div className="w-full mt-4">
          <label>Asset Id</label>
          <Select
            defaultValue="11111111111"
            onValueChange={(e) => setAssetId(e)}
          >
            <SelectItem key={0} value={'11111111111'}>
              Algo
            </SelectItem>
            {tokens &&
              tokens.map((value, index) => {
                return (
                  <SelectItem key={index + 1} value={value.asset_id}>
                    {value.name}
                  </SelectItem>
                );
              })}
          </Select>
        </div>
        <Flex justifyContent="center" className="gap-3 mt-4">
          <Button onClick={handleAddPrice}>Add Price</Button>
          <Button onClick={() => setOpenAddModal(false)}>Close</Button>
        </Flex>
      </Modal>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session || !session.user) {
    return {
      props: {
        prices: [],
        tokens: []
      }
    };
  }

  const client: MongoClient = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('prices');
  const tokenCollection = db.collection('tokens');

  const prices = await collection.find({}).toArray();
  const tokens = await tokenCollection.find({}).toArray();

  return {
    props: {
      prices: JSON.parse(JSON.stringify(prices)),
      tokens: JSON.parse(
        JSON.stringify(
          tokens.map((token) => {
            return {
              name: token.name,
              asset_id: token.asset_id
            };
          })
        )
      )
    }
  };
};

const customStyles = {
  content: {
    backgroundColor: 'white', // Example background color
    color: '#6b7280',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    minWidth: '320px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};

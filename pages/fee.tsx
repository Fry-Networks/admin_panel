import { MongoClient } from 'mongodb';
import { GetServerSideProps } from 'next';
import clientPromise from '../lib/mongoclient';
import { Fee, feeSchema } from '../lib/fee-schema';
import {
  Button,
  Card,
  DatePicker,
  Flex,
  TabGroup,
  TabPanel,
  TabPanels,
  TextInput,
  Text,
  Title,
  TabList,
  Tab
} from '@tremor/react';
import TokensTable from '../app/tables/table-tokens';
import { getSession } from 'next-auth/react';
import { DateInput, useDateInput } from '@nextui-org/date-input';
import { useState } from 'react';
import { useRouter } from 'next/router';
import FeesTable from '../app/tables/table-fees';
import ByodHistory from '../components/byod-history';
import FryWorldHistory from '../components/fryworld-history';
import { FryToken } from '../lib/tokens-schema';

export default function FeePage({
  fees = [],
  totalFee,
  totalCount,
  currentPage,
  tokens
}: {
  fees: Fee[];
  totalFee: number;
  totalCount: number;
  currentPage: number;
  tokens: FryToken[];
}) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [minerKey, setMinerKey] = useState('');
  const router = useRouter();

  const onFilterClicked = () => {
    const queryParams: Record<string, any> = {};

    if (startDate) queryParams.startDate = startDate.toISOString(); // Convert to ISO string
    if (endDate) queryParams.endDate = endDate.toISOString();
    if (minerKey) queryParams.minerKey = minerKey;

    queryParams.page = 1;

    // Update the URL with new query parameters
    router.push({
      pathname: '/fee', // Adjust the path if necessary
      query: queryParams
    });
  };

  // Handle Page Change
  const onPageChange = (newPage: number) => {
    router.push({
      pathname: '/fee',
      query: {
        ...router.query, // Keep other filters
        page: newPage
      }
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(totalCount / 20); // Assuming 10 items per page
  console.log('totalCount: ' + totalCount);
  console.log('totalPage: ' + totalPages);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-8xl">
      <Title>Crypto Income</Title>
      <TabGroup className="mt-3">
        <TabList>
          <Tab>Reward</Tab>
          <Tab>Byod</Tab>
          <Tab>Fry World</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Card>
              <Flex
                flexDirection="row"
                className="gap-3"
                style={{ marginBottom: '2px' }}
              >
                <Flex flexDirection="row" className="gap-2">
                  <Text className="no-wrap-text">Start&nbsp;Date:</Text>
                  <DatePicker onValueChange={(value) => setStartDate(value)} />
                </Flex>

                <Flex flexDirection="row" className="gap-2">
                  <Text>End&nbsp;Date: </Text>
                  <DatePicker onValueChange={(value) => setEndDate(value)} />
                </Flex>

                <TextInput
                  placeholder="Please input miner key to filter"
                  value={minerKey}
                  onValueChange={(value) => setMinerKey(value)}
                />
                <Button onClick={onFilterClicked}>Filter</Button>
              </Flex>

              <Flex justifyContent="center" className="mt-5">
                <Title>{`Calculated Fee: $${Number(totalFee).toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )} (USD)`}</Title>
              </Flex>
              <FeesTable fees={fees} />
            </Card>

            {/* Display filtered and paginated data */}

            {/* Pagination controls */}
            <Flex justifyContent="center" className="mt-4">
              <Button
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Previous
              </Button>
              <Text className="mx-2">
                {currentPage} of {totalPages}
              </Text>
              <Button
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
              </Button>
            </Flex>
          </TabPanel>
          <TabPanel>
            <ByodHistory />
          </TabPanel>
          <TabPanel>
            <FryWorldHistory tokens={tokens} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

const getNextDay = (endDate: Date): Date => {
  const nextDay = new Date(endDate); // Create a new Date object based on the endDate
  nextDay.setDate(nextDay.getDate() + 1); // Add 1 day to the current date
  return nextDay;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || !session.user) {
    return {
      props: {
        fees: [],
        totalCount: 0,
        currentPage: 1
      }
    };
  }
  const { startDate, endDate, minerKey, page = 1 } = context.query;
  const pageSize = 20;
  const skip = (Number(page) - 1) * pageSize;

  const client: MongoClient = await clientPromise;
  const db = client.db('main');
  const collection = db.collection('reward-boosts');
  let query: Record<string, any> = {};

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate as string),
      $lte: getNextDay(new Date(endDate as string))
    };
  } else if (startDate) {
    query.createdAt = {
      $gte: new Date(startDate as string)
    };
  } else if (endDate) {
    query.createdAt = {
      $lte: getNextDay(new Date(endDate as string))
    };
  }

  if (minerKey) {
    query = {
      ...query,
      $or: [
        {
          miner_key: {
            $regex: minerKey,
            $options: 'i'
          }
        },
        {
          address: {
            $regex: minerKey,
            $options: 'i'
          }
        }
      ]
    };
  }

  const totalCount = await collection.countDocuments({ ...query });

  // 2. Calculate total fee for all documents matching the filters
  const totalFeeResult = await collection
    .aggregate([
      { $match: { ...query } }, // Apply filters
      {
        $project: {
          totalValue: { $multiply: ['$fee_amount', '$price'] } // Calculate fee * price for each document
        }
      },
      { $group: { _id: null, totalFee: { $sum: '$totalValue' } } } // Sum the total value
    ])
    .toArray();

  const totalFee = totalFeeResult.length > 0 ? totalFeeResult[0].totalFee : 0;
  console.log(totalFee);

  const rewards = await collection
    .find(query)
    .skip(skip)
    .limit(pageSize)
    .toArray();

  const tokens = await db.collection('tokens').find({}).toArray();

  return {
    props: {
      fees: JSON.parse(JSON.stringify(rewards)),
      totalFee,
      totalCount,
      currentPage: Number(page), // Return the current page
      tokens: JSON.parse(JSON.stringify(tokens))
    }
  };
};

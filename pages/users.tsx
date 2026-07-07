import {
  Card,
  Text,
  Title,
  Flex,
  TabPanel,
  TabPanels,
  TabGroup,
  TabList,
  Tab,
  Button
} from '@tremor/react';
import { useRouter } from 'next/router';
import Search from '../components/search';
import clientPromise from '../lib/mongoclient';
import { User } from '../lib/users-schema';
import UsersTable from '../app/tables/table';
import { getSession } from 'next-auth/react';
import UserForm from '../components/form-user';
import RemoveUserForm from '../components/remove-user';

export default function UsersPage({
  users,
  removeUsers,
  total,
  page,
  limit,
  q,
  error
}: {
  users: User[];
  removeUsers: User[];
  total: number;
  page: number;
  limit: number;
  q: string;
  error?: string;
}) {
  const router = useRouter();

  if (error) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950">
        <Title className="text-white">Users</Title>
        <Text className="mt-6 text-gray-300">{error}</Text>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 50)));
  const goPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(p));
    router.push(`/users?${params.toString()}`);
  };

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl bg-gray-950">
      <Title className="text-white">Users</Title>
      <TabGroup>
        <TabList className="mt-8">
          <Tab>List</Tab>
          <Tab>Add User</Tab>
          <Tab>Remove User</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex alignItems="end" flexDirection="row" className="mt-6">
              <Search />
            </Flex>
            <div className="mt-5">
              <Text className="text-gray-300">
                {total} users{q ? ` matching "${q}"` : ''} — page {page} of {totalPages}
              </Text>
            </div>

            <Card className="mt-6 bg-gray-900 border-gray-700">
              <UsersTable users={users} />
            </Card>

            <Flex justifyContent="between" alignItems="center" className="mt-4">
              <Button
                size="xs"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                Previous
              </Button>
              <Text className="text-gray-300">
                Page {page} of {totalPages}
              </Text>
              <Button
                size="xs"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => goPage(page + 1)}
              >
                Next
              </Button>
            </Flex>
          </TabPanel>
          <TabPanel>
            <UserForm />
          </TabPanel>
          <TabPanel>
            <RemoveUserForm users={removeUsers} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user.admin) {
    return {
      props: { error: 'Unauthorized access' }
    };
  }
  try {
    const client = await clientPromise;
    const db = client.db('main');

    const q = (context.query.q || '').toString();
    const limit = 50;
    let page = parseInt((context.query.page || '1').toString(), 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    const query =
      q.length > 0
        ? {
            $or: [
              { 'name.full': { $regex: q, $options: 'i' } },
              { address: { $regex: q, $options: 'i' } },
              { email: { $regex: q, $options: 'i' } }
            ]
          }
        : {};

    const total = await db.collection('users').countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;

    const users = await db
      .collection('users')
      .find(query)
      .sort({ 'name.full': 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const removeUsers = await db
      .collection('users')
      .find({}, { projection: { _id: 1, 'name.full': 1, email: 1 } })
      .toArray();

    return {
      props: {
        users: JSON.parse(JSON.stringify(users)),
        removeUsers: JSON.parse(JSON.stringify(removeUsers)),
        total,
        page,
        limit,
        q
      }
    };
  } catch (e) {
    console.error(e);
    return { props: { error: 'Failed to fetch users' } };
  }
}

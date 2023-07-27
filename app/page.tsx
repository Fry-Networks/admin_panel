import { Card, Title, Text } from '@tremor/react';
import Search from './search';
import UsersTable from './table';

import UserModel from '../lib/users-schema';
import { connect } from '../lib/connect';
import { getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import { checkSession } from './sessionCheck';


const IndexPage = async function ({
  searchParams,
}: {
  searchParams: { q: string };
}) {
  const session = await getServerSession(authOptions);
  const isForbidden = await checkSession(session);
  if (isForbidden) {
    return isForbidden;
  }
  const search = searchParams.q ?? '';
    console.log("search", search);
    await connect();
    const users = await UserModel.find({ "name.full": { $regex: search } });
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Users</Title>
        <Text>
          Blabala
        </Text>
        <Search />
        <Card className="mt-6">
          <UsersTable users={users} />
        </Card>
      </main>
    );
  
}

export default IndexPage
import { Card, Title, Text } from '@tremor/react';
import Search from './search';
import UsersTable from './table';
import WebUserModel from '../lib/webusers-model';
import { getSession } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { connect } from '../lib/connect';
import UserModel from '../lib/users-schema';

export default async function IndexPage({
  searchParams,
}: {
  searchParams: { q: string };
}) {
  const session = await getServerSession();
  console.log(session)
  
  console.log(!session || !session.user)
  if (!session || !session.user) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Please login in order to access the admin panel</Title>
      </main>
    );
  } 
  await connect();
  if (!(await WebUserModel.findOne({ email: session.user.email }))?.admin) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>This panel is only accessible to admin users.</Title>
      </main>
    );
  } else {
    const users = await UserModel.find({}).sort({ createdAt: -1 });
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
}
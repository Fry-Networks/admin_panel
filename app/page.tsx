import { Card, Title, Text } from '@tremor/react';
import Search from './search';
import UsersTable from './table';
import WebUserModel, { rawWebUser, webUser } from '../lib/webusers-model';
import { getSession } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { connect } from '../lib/connect';
import UserModel from '../lib/users-schema';
import { MySession, authOptions } from '../pages/api/auth/[...nextauth]';

export default async function IndexPage({
  searchParams,
}: {
  searchParams: { q: string };
}) {

  const search = searchParams.q ?? '';

  const session: MySession | null = await getServerSession(authOptions);
  if (!session || !session.user) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>Please login in order to access the admin panel</Title>
      </main>
    );
  } 
  await connect();
  if (!session.user.admin) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Title>This panel is only accessible to admin users.</Title>
      </main>
    );
  } else {
    console.log("search", search);
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
}

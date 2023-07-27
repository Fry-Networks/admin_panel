import Navbar from './navbar';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export default async function Nav() {
  const session = await getServerSession(authOptions);
  return <Navbar user={session?.user} />;
}

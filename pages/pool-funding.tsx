import { getSession } from 'next-auth/react';
import PoolFunding from '@/components/PoolFunding';

interface Props {
  error?: string;
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.admin) {
    return { props: { error: 'Unauthorized access' } };
  }
  return { props: {} };
}

export default function PoolFundingPage({ error }: Props) {
  if (error) {
    return <p className="m-12 text-gray-300">{error}</p>;
  }
  return <PoolFunding />;
}

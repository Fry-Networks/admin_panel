import { getSession } from 'next-auth/react';
import EpochManagement from '@/components/EpochManagement';

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

export default function EpochManagementPage({ error }: Props) {
  if (error) {
    return <p className="m-12 text-gray-300">{error}</p>;
  }
  return <EpochManagement />;
}

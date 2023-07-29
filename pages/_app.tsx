import { NextPage } from 'next';
import { AppProps } from 'next/app';
import '../app/globals.css';
import { useSession, SessionProvider } from 'next-auth/react';

import Navbar from '../app/navbar';
interface MyAppProps extends AppProps {
  Component: NextPage;
}

interface ProtectedComponentProps {
  Component: NextPage;
  pageProps: any; // If you have a specific type for your pageProps, you can replace `any` with that.
}

export default function MyApp({ Component, pageProps }: MyAppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Navbar />
      <div id="main">
      <ProtectedComponent Component={Component} pageProps={pageProps} />
      </div>
    </SessionProvider>
  );
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ Component, pageProps }) => {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const showInfo = (text: string) => {
    return (
      <p style={{
        margin: '50px'
      }}>{text}</p>
    )
  }

  if (isLoading) return showInfo("Loading...");

  if (!session) {
    return showInfo("User is not logged in!"); // Here you should handle the case when the user is not logged in
  }

  if(!session.user?.admin) {
    return showInfo("User is not an admin!");
  }

  return <Component {...pageProps} />;
};

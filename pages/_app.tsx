import { NextPage } from 'next';
import { AppProps } from 'next/app';
import '../app/globals.css';
import { useSession, SessionProvider } from 'next-auth/react';
import Navbar from '../app/navbar';

import { useRouter } from 'next/router';
import { useEffect } from 'react';
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
      <div id="main">
        <ProtectedComponent Component={Component} pageProps={pageProps} />
      </div>
    </SessionProvider>
  );
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  Component,
  pageProps
}) => {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const router = useRouter();
  const showInfo = (text: string) => {
    return (
      <p
        style={{
          margin: '50px'
        }}
      >
        {text}
      </p>
    );
  };

  // Redirect unauthenticated users to the login page in production.
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    if (status === 'unauthenticated' && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [status, router]);

  // Allow the login page to render without showing the global guard message.
  if (router.pathname === '/login') {
    return <Component {...pageProps} />;
  }

  if (isLoading) return showInfo('Loading...');
  if (process.env.NODE_ENV !== 'development') {
    if (!session) {
      return showInfo('User is not logged in!'); // Guard while redirecting to login.
    }

    if (!session.user?.admin) {
      return showInfo('User is not an admin!');
    }
    if (router.pathname === '/dao' && !session.user?.owner) {
      return showInfo('Sorry guys, only owners can access this page!');
    }
    //if the user is at /rewards and is not an owner, return a message
  }

  return (
    <>
      {/* Only show navigation when an authenticated admin is present. */}
      {session?.user?.admin ? <Navbar /> : null}
      <Component {...pageProps} />
    </>
  );
};

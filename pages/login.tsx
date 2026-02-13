import { getProviders, getSession, signIn } from 'next-auth/react'

export default function SignIn({ providers }: { providers: any }) {
  return (
    // Centered, minimal login UI without exposing app navigation.
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-900 text-white grid place-items-center font-semibold">
            FRY
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {providers && Object.values(providers).map((provider: any) => {
            if (provider.name === 'Email') {
              return null;
            }
            return (
              <button
                key={provider.name}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => signIn(provider.id)}
              >
                Sign in with {provider.name}
              </button>
            );
          })}
          {!providers && (
            <p className="text-sm text-slate-500">
              No authentication providers are configured.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Access is restricted to approved admins only.
        </p>
      </div>
    </main>
  );
}

// This is the recommended way for Next.js 9.3 or newer
export async function getServerSideProps(context: any){
  // Redirect authenticated users away from the login page.
  const session = await getSession(context);
  if (session?.user) {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }
  const providers = await getProviders();
  return {
    props: { providers }
  };
}

import { Title } from "@tremor/react";
import { connect } from "../lib/connect";

export async function checkSession(session: any) {
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
  }
  return null;
}
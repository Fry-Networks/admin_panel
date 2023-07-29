'use server'
import { Title } from "@tremor/react";
import { connect } from "../lib/connect";

export async function checkSession(session: any) {
  if (!session || !session.user) {
    return false
  } 
  await connect();
  if (!session.user.admin) {
    return false
  }
  return true;
}
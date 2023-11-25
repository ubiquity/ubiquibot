import dotenv from "dotenv";
dotenv.config();

import { User } from "../../../../types/payload";
import { createAdapters } from "../../../adapters";
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not defined");
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_KEY) throw new Error("SUPABASE_KEY is not defined");

async function getWalletAddressAndUrlTest() {
  const { wallet } = createAdapters().supabase;
  const userId = 4975670 as User["id"];
  const results = [] as unknown[];
  try {
    const address = await wallet.getAddress(userId);
    // const url = await wallet.getWalletRegistrationUrl(userId);
    results.push(address);
    // results.push(url);
  } catch (e) {
    console.error(e);
  }
  console.trace(results);
}

void getWalletAddressAndUrlTest();

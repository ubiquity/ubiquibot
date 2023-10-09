import Runtime from "../../../../bindings/bot-runtime";

export async function getWalletAddress(userId: number) {
  const { wallet } = Runtime.getState().adapters.supabase;
  return await wallet.getAddress(userId);
}

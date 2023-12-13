import Runtime from "../../../../bindings/bot-runtime";

export async function getUserMultiplier(userId: number, repoId: number) {
  const { user } = Runtime.getState().adapters.supabase;
  return await user.getMultiplier(userId, repoId);
}

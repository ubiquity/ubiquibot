interface Env {
  SUPABASE_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const value = await context.env.SUPABASE_KEY;
  return new Response(value);
};

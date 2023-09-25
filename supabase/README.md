# Supabase Database Adapter

[Supabase](https://supabase.com/) is used to store contributor profiles and task information.

### How to setup supabase project locally

1. To get started with supabase, you have to create a project at [Supabase](https://supabase.com/).
   Once you create a project, please put both variables into `.env` file.

```
SUPABASE_URL=XXX
SUPABASE_KEY=XXX
```

2.  [The Supabase CLI](https://supabase.com/docs/guides/resources/supabase-cli) available as a node package through the dev dependencies provides tools to develop your project locally and deploy to the Supabase Platform.
    Most common useful commands are

- Run Supabase locally

```sh
yarn supabase start
```

- Manager database migrations

```sh
yarn supabase migration
```

- CI/CD for releasing to production

```sh
yarn supabase db push
```

- Manager your supabase projects

```sh
yarn supabase projects
```

- Generate types directly from your database schemas

```sh
yarn supabase gen types
```

3. Link the local project to the supabase project you created.

```sh
yarn supabase link -p PASSWORD --project-ref PROJECT_REF
```

For more information about arguments, please go through [here](https://supabase.com/docs/reference/cli/supabase-link)

### Database Operation

- `supabase migration new MIGRATION_NAME`: It will create a migration file in supabase/migrations folder.
- `supabase migration repair <MIGRATION_NAME> --status reverted`: Revert a given migration file.
- `supabase db push`: Update database schema on supabase platform
- `supabase gen types typescript > src/adapters/supabase/types/database.ts --linked`: Generate typescript types from the supabase project linked

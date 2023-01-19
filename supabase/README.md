# Supabase Database Adapter

[Supabase](https://supabase.com/) is used to store bounty hunters profiles and bounties information.



### How to setup supabase project locally

1. To get started with supabase, you have to create a project at [Supabase](https://supabase.com/).
Once you create a project, please put both variables into `.env` file. 

```
SUPABASE_PROJECT_URL=XXX
SUPABASE_PROJECT_KEY=XXX
```
2. [Install the Supabase CLI](https://supabase.com/docs/guides/resources/supabase-cli)
The Supabase CLI provides tools to develop your project locally and deploy to the Supabase Platform.
Most common useful commands are 

- Run Supabase locally

```sh
supabase start
```

- Manager database migrations

```sh
supabase migratio
```

- CI/CD for releasing to production

```sh
supabase db push
```

- Manager your supabase projects

```sh
supabase projects
```

- Generate types directly from your database schemas

```sh
supabase gen types
```

3. Link the local project to the supabase project you created.

```sh
supabase link -p PASSWORD --project-ref PROJECT_REF
``` 

For more information about arguments, please go through [here](https://supabase.com/docs/reference/cli/supabase-link)

### Database Operation

- `supabase migration new MIGRATION_NAME`: It will create a migration file in supabase/migrations folder.
- `supabase db push -p PASSWORD`: Update database schema on supabase platform
- `supabase gen types typescript > src/adapters/supabase/types/database.types.ts --linked`: Generate typescript types from the supabase project linked

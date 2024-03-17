revoke
	update
	on table public.permits
	from
	authenticated;

revoke
	update
	on table public.permits
	from
	authenticated;

grant
	update
	(transaction) on table public.permits to authenticated;

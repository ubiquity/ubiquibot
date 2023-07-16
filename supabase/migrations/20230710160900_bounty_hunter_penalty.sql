CREATE TABLE IF NOT EXISTS penalty (
  username text not null,
  repository_name text not null,
  network_id text not null,
  token_address text not null,
  amount text not null default '0',
  PRIMARY KEY (username, repository_name, network_id, token_address)
);

-- Insert penalty or add penalty amount and return the new penalty amount
create or replace function add_penalty(_username text, _repository_name text, _network_id text, _token_address text, _penalty_amount text)
returns text as
$$
  declare updated_penalty_amount text;
  begin
  insert into penalty (username, repository_name, network_id, token_address, amount) VALUES (_username, _repository_name, _network_id, _token_address, _penalty_amount)
    on conflict (username, repository_name, network_id, token_address) do update
    set amount = (penalty.amount::DECIMAL + EXCLUDED.amount::DECIMAL)::TEXT
    returning amount into updated_penalty_amount;
  return updated_penalty_amount;
  end
$$ 
language plpgsql;

-- Remove penalty amount and return the new penalty amount
create or replace function remove_penalty(_username text, _repository_name text, _network_id text, _token_address text, _penalty_amount text)
returns text as
$$
  declare updated_penalty_amount text;
  begin
  update penalty
    set amount = (amount::DECIMAL - _penalty_amount::DECIMAL)::TEXT
    where username = _username and repository_name = _repository_name and network_id = _network_id and token_address = _token_address
    returning amount into updated_penalty_amount;
    return updated_penalty_amount;
  end
$$
language plpgsql;
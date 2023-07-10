CREATE TABLE IF NOT EXISTS penalty (
    username text not null,
    repository_name text not null,
    token_address text not null,
    amount text not null default '0',
    PRIMARY KEY (username, repository_name, token_address)
);

-- Insert penalty or add penalty amount and return the new penalty amount
create or replace function add_penalty(username text, repository_name text, token_address text, penalty_amount text)
returns text as
$$
  declare updated_penalty_amount text;
  begin
  insert into penalty VALUES (username, repository_name, token_address, penalty_amount)
    on conflict (username, repository_name, token_address) do update
    set penalty_amount = (penalty_amount::DECIMAL + penalty_amount::DECIMAL)::TEXT
    returning amount into updated_penalty_amount;
  end
$$ 
language plpgsql;

-- Deduct penalty amount and return the new penalty amount
create or replace function deduct_penalty(username text, repository_name text, token_address text, penalty_amount text)
returns text as
$$
  declare updated_penalty_amount text;
  begin
  update penalty
    set amount = (amount::DECIMAL - penalty_amount::DECIMAL)::TEXT
    where username = username and repository_name = repository_name and token_address = token_address
    returning amount into updated_penalty_amount;
  end
$$
language plpgsql;
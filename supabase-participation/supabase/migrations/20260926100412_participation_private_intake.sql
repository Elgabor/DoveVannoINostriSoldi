-- Dedicated participation project only. Do not apply to the assistant-quota project.
create schema participation_private;
revoke all on schema participation_private from public, anon, authenticated;
grant usage on schema participation_private to service_role;

create table participation_private.submission (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('local', 'preview', 'production')),
  client_key uuid not null,
  receipt uuid not null default gen_random_uuid(),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  entity_ipa text not null check (entity_ipa = 'c_e897'),
  entity_tax text not null check (entity_tax = '00189800204'),
  category text not null check (category in ('data', 'office', 'compensation')),
  description text not null check (char_length(description) between 1 and 2000),
  period text not null check (char_length(period) between 1 and 100),
  source_url text not null check (char_length(source_url) between 1 and 500),
  source_passage text not null check (char_length(source_passage) between 1 and 1000),
  contact_email text check (contact_email is null or char_length(contact_email) between 1 and 254),
  status text not null default 'received' check (status = 'received'),
  received_at timestamptz not null default clock_timestamp(),
  unique (scope, client_key),
  unique (scope, receipt)
);
alter table participation_private.submission enable row level security;
revoke all on participation_private.submission from public, anon, authenticated;
grant select, insert, update, delete on participation_private.submission to service_role;

create table participation_private.submission_audit (
  id bigint generated always as identity primary key,
  submission_id uuid not null references participation_private.submission(id) on delete cascade,
  event_type text not null check (event_type = 'received'),
  recorded_at timestamptz not null default clock_timestamp()
);
alter table participation_private.submission_audit enable row level security;
revoke all on participation_private.submission_audit from public, anon, authenticated;
grant select, insert, update, delete on participation_private.submission_audit to service_role;

-- A rotating HMAC supplied by the backend, never an IP address or browser cookie.
create table participation_private.network_rate (
  scope text not null check (scope in ('local', 'preview', 'production')),
  quota_day date not null,
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  used smallint not null default 0 check (used between 0 and 20),
  primary key (scope, quota_day, network_hash)
);
create index network_rate_day_idx on participation_private.network_rate (quota_day);
alter table participation_private.network_rate enable row level security;
revoke all on participation_private.network_rate from public, anon, authenticated;
grant select, insert, update, delete on participation_private.network_rate to service_role;

-- Called only by the backend with a secret key. One Postgres transaction owns
-- the receipt, idempotency check, rate admission and initial audit event.
create function public.participation_submit(
  p_scope text, p_client_key uuid, p_entity_ipa text, p_entity_tax text,
  p_category text, p_description text, p_period text, p_source_url text,
  p_source_passage text, p_contact_email text, p_payload_hash text,
  p_network_hash text
) returns jsonb
language plpgsql security invoker set search_path = '' set lock_timeout = '1500ms'
as $$
declare
  existing_hash text;
  existing_receipt uuid;
  rate_used smallint;
  new_id uuid;
  new_receipt uuid;
  today_utc date := (clock_timestamp() at time zone 'UTC')::date;
begin
  if p_scope is null or p_scope not in ('local', 'preview', 'production')
     or p_client_key is null or p_entity_ipa is distinct from 'c_e897'
     or p_entity_tax is distinct from '00189800204'
     or p_category is null or p_category not in ('data', 'office', 'compensation')
     or p_description is null or char_length(p_description) not between 1 and 2000
     or p_period is null or char_length(p_period) not between 1 and 100
     or p_source_url is null or char_length(p_source_url) not between 1 and 500
     or p_source_url !~ '^https://'
     or p_source_passage is null or char_length(p_source_passage) not between 1 and 1000
     or p_contact_email is not null and char_length(p_contact_email) not between 1 and 254
     or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
     or p_network_hash is null or p_network_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid private submission' using errcode = '22023';
  end if;

  select payload_hash, receipt into existing_hash, existing_receipt
    from participation_private.submission
    where scope = p_scope and client_key = p_client_key for update;
  if found then
    if existing_hash <> p_payload_hash then
      raise exception 'Idempotency key reused for different content' using errcode = '22023';
    end if;
    return jsonb_build_object('receipt', existing_receipt, 'duplicate', true);
  end if;

  insert into participation_private.network_rate (scope, quota_day, network_hash)
    values (p_scope, today_utc, p_network_hash) on conflict do nothing;
  select used into strict rate_used from participation_private.network_rate
    where scope = p_scope and quota_day = today_utc and network_hash = p_network_hash for update;
  -- A concurrent request with the same key may have committed while this
  -- transaction waited for the network row. It remains a retry, even at quota.
  select payload_hash, receipt into existing_hash, existing_receipt
    from participation_private.submission
    where scope = p_scope and client_key = p_client_key for update;
  if found then
    if existing_hash <> p_payload_hash then
      raise exception 'Idempotency key reused for different content' using errcode = '22023';
    end if;
    return jsonb_build_object('receipt', existing_receipt, 'duplicate', true);
  end if;
  if rate_used >= 20 then
    raise exception 'Private submission rate exceeded' using errcode = '22023';
  end if;
  update participation_private.network_rate set used = used + 1
    where scope = p_scope and quota_day = today_utc and network_hash = p_network_hash;

  insert into participation_private.submission (
    scope, client_key, payload_hash, entity_ipa, entity_tax, category,
    description, period, source_url, source_passage, contact_email
  ) values (
    p_scope, p_client_key, p_payload_hash, p_entity_ipa, p_entity_tax, p_category,
    p_description, p_period, p_source_url, p_source_passage, p_contact_email
  ) on conflict (scope, client_key) do nothing returning id, receipt into new_id, new_receipt;
  if new_id is null then
    -- A concurrent retry may have committed while this call held the rate row.
    select payload_hash, receipt into strict existing_hash, existing_receipt
      from participation_private.submission
      where scope = p_scope and client_key = p_client_key for update;
    if existing_hash <> p_payload_hash then
      raise exception 'Idempotency key reused for different content' using errcode = '22023';
    end if;
    return jsonb_build_object('receipt', existing_receipt, 'duplicate', true);
  end if;
  insert into participation_private.submission_audit (submission_id, event_type)
    values (new_id, 'received');
  return jsonb_build_object('receipt', new_receipt, 'duplicate', false);
end;
$$;
revoke all on function public.participation_submit(text, uuid, text, text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.participation_submit(text, uuid, text, text, text, text, text, text, text, text, text, text)
  to service_role;

-- Schedule only after the owner approves operational retention. This routine
-- affects anti-abuse hashes, never pending proposals or their audit history.
create function participation_private.expire_network_rate() returns bigint
language sql security invoker set search_path = ''
as $$
  with expired as (
    delete from participation_private.network_rate
    where quota_day < (clock_timestamp() at time zone 'UTC')::date - 2
    returning 1
  ) select count(*) from expired;
$$;
revoke all on function participation_private.expire_network_rate() from public, anon, authenticated;
grant execute on function participation_private.expire_network_rate() to service_role;

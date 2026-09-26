-- Review membership is assigned through an operator connection only. It is
-- intentionally not copied into JWT metadata, so revocation takes effect now.
create table participation_private.reviewer (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('local', 'preview', 'production')),
  assigned_at timestamptz not null default clock_timestamp(),
  primary key (user_id, scope)
);
alter table participation_private.reviewer enable row level security;
revoke all on participation_private.reviewer from public, anon, authenticated;
grant select, insert, update, delete on participation_private.reviewer to service_role;
grant usage on schema participation_private to authenticated;
grant select on participation_private.reviewer to authenticated;

create policy reviewer_reads_own_membership
on participation_private.reviewer for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));
create policy reviewer_requires_mfa
on participation_private.reviewer as restrictive for select to authenticated
using (((select auth.jwt())->>'aal') = 'aal2');

-- The private schema stays outside the Data API. Even a direct database read
-- by the authenticated role still obeys the same membership and MFA checks.
grant select (
  id, receipt, scope, entity_ipa, entity_tax, category, description, period,
  source_url, source_passage, contact_email, status, received_at
) on participation_private.submission to authenticated;
create policy assigned_reviewer_reads_submission
on participation_private.submission for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from participation_private.reviewer as reviewer
    where reviewer.user_id = (select auth.uid())
      and reviewer.scope = submission.scope
  )
);
create policy submission_review_requires_mfa
on participation_private.submission as restrictive for select to authenticated
using (((select auth.jwt())->>'aal') = 'aal2');

-- One bounded, read-only Data API endpoint. RLS is applied as the caller;
-- no service key is needed in the review client.
create function public.participation_review_queue(
  p_scope text,
  p_limit integer default 20,
  p_before_received_at timestamptz default null,
  p_before_id uuid default null
) returns table (
  id uuid,
  receipt uuid,
  scope text,
  entity_ipa text,
  entity_tax text,
  category text,
  description text,
  period text,
  source_url text,
  source_passage text,
  contact_email text,
  status text,
  received_at timestamptz
)
language plpgsql security invoker set search_path = ''
as $$
begin
  if p_scope is null or p_scope not in ('local', 'preview', 'production')
     or p_limit is null or p_limit not between 1 and 50
     or (p_before_received_at is null) <> (p_before_id is null) then
    raise exception 'Invalid review query' using errcode = '22023';
  end if;
  return query
  select s.id, s.receipt, s.scope, s.entity_ipa, s.entity_tax, s.category,
    s.description, s.period, s.source_url, s.source_passage, s.contact_email,
    s.status, s.received_at
  from participation_private.submission as s
  where s.scope = p_scope
    and (p_before_received_at is null
      or (s.received_at, s.id) < (p_before_received_at, p_before_id))
  order by s.received_at desc, s.id desc
  limit p_limit;
end;
$$;
revoke all on function public.participation_review_queue(text, integer, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.participation_review_queue(text, integer, timestamptz, uuid)
  to authenticated;

create index submission_review_queue_idx
on participation_private.submission (scope, received_at desc, id desc);

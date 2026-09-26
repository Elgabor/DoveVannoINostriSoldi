-- Local security regression. After `supabase db reset --local --no-seed
-- --workdir supabase-participation --agent no`, run with:
-- docker exec -i supabase_db_supabase-participation psql -U postgres -d postgres
--   -X -v ON_ERROR_STOP=1 < supabase-participation/tests/participation_review_queue.sql
-- The transaction rolls back every fixture row.
begin;
insert into auth.users (id)
values ('f8832af1-728d-47c7-88ed-df2ae9ce58ec');
set local role service_role;
insert into participation_private.reviewer (user_id, scope)
values ('f8832af1-728d-47c7-88ed-df2ae9ce58ec', 'local');
insert into participation_private.submission (
  scope, client_key, payload_hash, entity_ipa, entity_tax, category,
  description, period, source_url, source_passage, contact_email
) values
  ('local', 'bbd8e94f-708d-4846-bf7a-a11229d51805', repeat('a', 64),
   'c_e897', '00189800204', 'office', 'Fixture local', '2026',
   'https://www.comune.mantova.it/it/news/atto', 'Passaggio local', 'local@example.test'),
  ('preview', '719f0042-57f3-4cb1-8696-99570355ab46', repeat('b', 64),
   'c_e897', '00189800204', 'office', 'Fixture preview', '2026',
   'https://www.comune.mantova.it/it/news/atto', 'Passaggio preview', 'preview@example.test');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'f8832af1-728d-47c7-88ed-df2ae9ce58ec';
set local request.jwt.claims = '{"sub":"f8832af1-728d-47c7-88ed-df2ae9ce58ec","aal":"aal1"}';
do $$ begin
  if (select count(*) from public.participation_review_queue('local', 20, null, null)) <> 0 then
    raise exception 'AAL1 reviewer could read the queue';
  end if;
  if (select count(*) from participation_private.submission) <> 0 then
    raise exception 'AAL1 reviewer could read the private table';
  end if;
end $$;
set local request.jwt.claims = '{"sub":"f8832af1-728d-47c7-88ed-df2ae9ce58ec","aal":"aal2"}';
do $$ begin
  if (select count(*) from public.participation_review_queue('local', 20, null, null)) <> 1 then
    raise exception 'AAL2 assigned reviewer could not read the local queue';
  end if;
  if (select count(*) from public.participation_review_queue('preview', 20, null, null)) <> 0 then
    raise exception 'Reviewer crossed the scope boundary';
  end if;
  if (select count(*) from participation_private.submission) <> 1 then
    raise exception 'Direct table read escaped RLS';
  end if;
  begin
    perform client_key from participation_private.submission;
    raise exception 'Reviewer could read intake-only idempotency keys';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.participation_review_queue('local', 51, null, null);
    raise exception 'Unbounded query accepted';
  exception when sqlstate '22023' then null;
  end;
end $$;
set local request.jwt.claim.sub = 'd5ab938d-88b4-49bc-94cc-f5a9b0655cab';
set local request.jwt.claims = '{"sub":"d5ab938d-88b4-49bc-94cc-f5a9b0655cab","aal":"aal2"}';
do $$ begin
  if (select count(*) from public.participation_review_queue('local', 20, null, null)) <> 0 then
    raise exception 'Unassigned user could read the queue';
  end if;
  if (select count(*) from participation_private.submission) <> 0 then
    raise exception 'Unassigned user could read the private table';
  end if;
end $$;
reset role;

set local role service_role;
delete from participation_private.reviewer
where user_id = 'f8832af1-728d-47c7-88ed-df2ae9ce58ec' and scope = 'local';
reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'f8832af1-728d-47c7-88ed-df2ae9ce58ec';
set local request.jwt.claims = '{"sub":"f8832af1-728d-47c7-88ed-df2ae9ce58ec","aal":"aal2"}';
do $$ begin
  if (select count(*) from public.participation_review_queue('local', 20, null, null)) <> 0 then
    raise exception 'Revoked reviewer retained access';
  end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform public.participation_review_queue('local', 20, null, null);
    raise exception 'Anon could execute review queue';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
-- Removing a Supabase Auth account removes its role assignment as well.
set local role service_role;
insert into participation_private.reviewer (user_id, scope)
values ('f8832af1-728d-47c7-88ed-df2ae9ce58ec', 'local');
reset role;
delete from auth.users where id = 'f8832af1-728d-47c7-88ed-df2ae9ce58ec';
set local role authenticated;
set local request.jwt.claim.sub = 'f8832af1-728d-47c7-88ed-df2ae9ce58ec';
set local request.jwt.claims = '{"sub":"f8832af1-728d-47c7-88ed-df2ae9ce58ec","aal":"aal2"}';
do $$ begin
  if (select count(*) from public.participation_review_queue('local', 20, null, null)) <> 0 then
    raise exception 'Deleted user retained access';
  end if;
end $$;
reset role;
select 'PASS: review queue RLS, MFA, scope, revocation, account deletion, bounds and anon denial' as result;
rollback;

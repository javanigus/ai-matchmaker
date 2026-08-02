-- Client-side validation in basics-form.tsx checks this too, but per
-- PLAN.md's own principle ("DB-level constraints alongside client-side
-- validation"), published_at shouldn't be settable by bypassing the UI
-- (a direct API call, a bug, etc.) without actually meeting the
-- requirement. Only fires when published_at is transitioning from unset
-- to set, so editing an already-published profile isn't blocked by this.
create function public.check_required_fields_before_publish()
returns trigger
language plpgsql
as $$
begin
  if new.published_at is not null and old.published_at is null then
    if new.name is null or new.age is null or new.gender is null
      or new.location_city is null or new.location_state is null
      or new.location_country is null or new.occupation is null
    then
      raise exception 'Cannot publish: required fields are missing.';
    end if;

    if not exists (select 1 from public.user_ethnicities where user_id = new.id) then
      raise exception 'Cannot publish: ethnicity is required.';
    end if;
  end if;
  return new;
end;
$$;

create trigger check_required_fields_before_publish
  before update on public.users
  for each row execute function public.check_required_fields_before_publish();

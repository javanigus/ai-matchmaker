-- reports.reason was left as plain text (no CHECK) since Phase 0,
-- unlike every other enum-shaped column in this schema (photos.type,
-- photos.moderation_status, profile_decisions.decision). Constrain it
-- to the 5 fixed reasons prototype/profile-view.html's Report modal
-- actually offers, now that Phase 9 is wiring Report up for real.
alter table public.reports
  add constraint reports_reason_check
  check (reason in ('fake', 'photos', 'harassment', 'spam', 'other'));

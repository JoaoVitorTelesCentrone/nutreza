-- The approved row is hidden from SELECT FOR UPDATE by the draft-only UPDATE
-- policy. The function checks the caller's clinical role before any copy.
alter function public.clone_plan_revision(uuid) security definer;

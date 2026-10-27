create policy storage_cleanup_jobs_service_role_access
  on public.storage_cleanup_jobs for all to service_role
  using (true) with check (true);

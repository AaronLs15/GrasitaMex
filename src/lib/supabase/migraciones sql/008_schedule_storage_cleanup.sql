create extension if not exists pg_cron;
create extension if not exists pg_net;

do $schedule$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'storage-cleanup-every-five-minutes';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'storage-cleanup-every-five-minutes',
    '*/5 * * * *',
    $request$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'storage_cleanup_project_url') || '/functions/v1/storage-cleanup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'storage_cleanup_service_role_jwt')
        ),
        body := '{}'::jsonb
      );
    $request$
  );
end;
$schedule$;

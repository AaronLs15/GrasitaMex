import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type CleanupJob = {
  id: number;
  bucket_id: string;
  object_path: string;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return Response.json({ error: "Storage cleanup worker is not configured" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("claim_storage_cleanup_jobs", {
    p_limit: 100,
  });
  if (error) {
    return Response.json({ error: "Could not claim cleanup jobs" }, { status: 500 });
  }

  const jobs = (data ?? []) as CleanupJob[];
  const byBucket = new Map<string, CleanupJob[]>();
  for (const job of jobs) {
    const bucketJobs = byBucket.get(job.bucket_id) ?? [];
    bucketJobs.push(job);
    byBucket.set(job.bucket_id, bucketJobs);
  }

  let completed = 0;
  let failed = 0;
  for (const [bucket, bucketJobs] of byBucket) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(bucketJobs.map((job) => job.object_path));

    for (const job of bucketJobs) {
      const { error: finishError } = await supabase.rpc("finish_storage_cleanup_job", {
        p_job_id: job.id,
        p_error: removeError?.message ?? null,
      });
      if (removeError || finishError) failed += 1;
      else completed += 1;
    }
  }

  return Response.json({ claimed: jobs.length, completed, failed });
});

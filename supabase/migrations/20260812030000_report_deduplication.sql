create unique index if not exists resource_reports_one_open_per_reporter
  on public.resource_reports (resource_id, reporter_id)
  where status = 'open';

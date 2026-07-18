-- Add Relay to the metered product registry.
alter table public.usage_events
  drop constraint if exists usage_events_product_check;

alter table public.usage_events
  add constraint usage_events_product_check
  check (product in ('blueprint', 'pulse', 'atlas', 'sentinel', 'forge', 'radar', 'relay'));

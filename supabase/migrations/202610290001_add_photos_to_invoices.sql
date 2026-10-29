-- Add photos array column to invoices table for finished work proof, receipts, or attachments
alter table public.invoices
  add column if not exists photos text[] null default '{}'::text[];

comment on column public.invoices.photos is 'Optional array of photo/image URLs attached to the invoice (e.g., finished work photos or receipts).';

alter table public.media_assets
    add column if not exists caption text,
    add column if not exists description text;

comment on column public.media_assets.caption is 'Caption displayed with image in editorial content.';
comment on column public.media_assets.description is 'Long-form SEO and accessibility context for image.';

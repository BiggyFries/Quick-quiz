alter table public.user_settings
  alter column high_contrast set default true;

update public.user_settings
set high_contrast = true,
    updated_at = now()
where high_contrast = false;

-- Add advisor and student to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
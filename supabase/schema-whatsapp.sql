-- ======================================================================
-- BRÚJULA · Sesiones de WhatsApp (Twilio sandbox)
-- Ejecutar en Supabase SQL Editor.
-- Guarda el historial conversacional por teléfono para mantener contexto.
-- ======================================================================

create table if not exists whatsapp_sesiones (
  telefono          text primary key,
  historial         jsonb default '[]'::jsonb,
  municipio_foco    text,
  ultima_actividad  timestamptz default now(),
  total_mensajes    integer default 0
);

create index if not exists idx_wa_actividad
  on whatsapp_sesiones(ultima_actividad desc);

comment on table whatsapp_sesiones is
  'Sesiones conversacionales de BRÚJULA por WhatsApp; historial truncado a los últimos mensajes.';

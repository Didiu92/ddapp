-- Habilita las extensiones base que usará todo el proyecto:
-- pgcrypto: gen_random_uuid() para claves primarias.
-- unaccent: búsqueda global insensible a acentos/apóstrofes (Fase 10).
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Inscrições de notificação por aparelho, presas à conta. Troque o schema `app` pelo do projeto.
-- O navegador só chega nas funções; o disparador lê os destinatários com um segredo cujo sha256
-- fica em app.config (o segredo em si nunca entra no banco nem no repositório).

create schema if not exists app;
create extension if not exists pgcrypto;

create table if not exists app.config (chave text primary key, valor text not null);

create table if not exists app.push (
  endpoint text primary key check (char_length(endpoint) <= 1000),
  conta uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now(),
  falhas smallint not null default 0
);
create index if not exists push_conta_idx on app.push (conta);
alter table app.push enable row level security;
alter table app.config enable row level security;
revoke all on app.push, app.config from anon, authenticated;

create or replace function public.app_inscrever_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sem_conta'; end if;
  if p_endpoint !~ '^https://' then raise exception 'inscricao_invalida'; end if;
  -- Teto por conta: dez aparelhos bastam e freiam abuso pela chave pública
  if (select count(*) from app.push where conta = auth.uid()) >= 10 then
    delete from app.push where endpoint = (select endpoint from app.push where conta = auth.uid() order by criado_em limit 1);
  end if;
  insert into app.push (endpoint, conta, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set conta = excluded.conta, p256dh = excluded.p256dh, auth = excluded.auth, falhas = 0;
end;
$$;

create or replace function public.app_cancelar_push(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from app.push where endpoint = p_endpoint and conta = auth.uid();
$$;

create or replace function app.segredo_confere(p_segredo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.config where chave = 'disparador_sha256'
    and valor = encode(extensions.digest(coalesce(p_segredo, ''), 'sha256'), 'hex'));
$$;

-- Destinatários agrupados por conta. Junte aqui o que o disparador precisa para decidir o aviso.
create or replace function public.app_push_destinatarios(p_segredo text)
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.segredo_confere(p_segredo) then raise exception 'segredo_invalido'; end if;
  return coalesce((
    select json_agg(json_build_object('conta', p.conta, 'inscricoes', p.inscricoes))
    from (
      select conta, json_agg(json_build_object('endpoint', endpoint, 'keys', json_build_object('p256dh', p256dh, 'auth', auth))) as inscricoes
      from app.push group by conta
    ) p
  ), '[]'::json);
end;
$$;

-- Aparelho que devolveu 404 ou 410 não existe mais: sai da lista
create or replace function public.app_push_descartar(p_segredo text, p_endpoints text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.segredo_confere(p_segredo) then raise exception 'segredo_invalido'; end if;
  delete from app.push where endpoint = any(p_endpoints);
end;
$$;

revoke all on function public.app_inscrever_push(text, text, text), public.app_cancelar_push(text),
  public.app_push_destinatarios(text), public.app_push_descartar(text, text[]) from public;
grant execute on function public.app_inscrever_push(text, text, text), public.app_cancelar_push(text) to authenticated;
grant execute on function public.app_push_destinatarios(text), public.app_push_descartar(text, text[]) to anon;

-- Depois de aplicar, grave o hash do segredo (gerado por templates/scripts/gerar-vapid.mjs):
-- insert into app.config (chave, valor) values ('disparador_sha256', '<sha256 hex>')
--   on conflict (chave) do update set valor = excluded.valor;

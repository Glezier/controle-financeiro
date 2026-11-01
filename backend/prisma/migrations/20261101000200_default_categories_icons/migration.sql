begin;

alter table public.categories add column icon text not null default 'category';
alter table public.categories add constraint categories_icon_valid check (icon in (
  'category', 'restaurant', 'home', 'directions_bus', 'medical_services',
  'sports_esports', 'account_balance_wallet', 'work', 'school', 'shopping_cart', 'payments'
));
grant update (icon) on public.categories to authenticated;

create function public.finance_category_templates()
returns table(name text, type public."TransactionType", icon text)
language sql immutable security invoker set search_path = '' as $$
  select * from (values
    ('Alimentação', 'expense'::public."TransactionType", 'restaurant'),
    ('Moradia', 'expense'::public."TransactionType", 'home'),
    ('Transporte', 'expense'::public."TransactionType", 'directions_bus'),
    ('Saúde', 'expense'::public."TransactionType", 'medical_services'),
    ('Lazer', 'expense'::public."TransactionType", 'sports_esports'),
    ('Salário', 'income'::public."TransactionType", 'account_balance_wallet')
  ) as templates(name, type, icon);
$$;

update public.categories c set icon = t.icon from public.finance_category_templates() t
where c.type = t.type and lower(c.name) = lower(t.name) and c.icon = 'category';

insert into public.categories(user_id, name, type, icon)
select u.id, t.name, t.type, t.icon from auth.users u cross join public.finance_category_templates() t
on conflict do nothing;

create function public.seed_finance_categories_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categories(user_id, name, type, icon)
  select new.id, t.name, t.type, t.icon from public.finance_category_templates() t
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.finance_category_templates() from public, anon, authenticated;
revoke all on function public.seed_finance_categories_for_new_user() from public, anon, authenticated;

create trigger finance_categories_after_auth_user_insert after insert on auth.users
for each row execute function public.seed_finance_categories_for_new_user();

commit;

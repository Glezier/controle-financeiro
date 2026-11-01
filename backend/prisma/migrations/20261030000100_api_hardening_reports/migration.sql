begin;

alter table public.categories alter column id set default gen_random_uuid();
alter table public.transactions alter column id set default gen_random_uuid();
alter table public.categories add constraint categories_name_format
  check (name = btrim(name) and char_length(name) between 1 and 80);
alter table public.transactions add constraint transactions_description_format
  check (description = btrim(description) and char_length(description) between 1 and 300);
alter table public.transactions add constraint transactions_date_range
  check (date between date '1900-01-01' and date '9999-12-31');
alter table public.transactions add constraint transactions_amount_finite
  check (amount <> 'NaN'::numeric);
create unique index categories_owner_type_name_normalized_idx
  on public.categories(user_id, type, lower(btrim(name)));
create index transactions_owner_history_idx on public.transactions(user_id, date desc, created_at desc, id desc);

revoke all on public.categories, public.transactions from public, anon, authenticated;
grant select, insert, delete on public.categories, public.transactions to authenticated;
grant update (name, type) on public.categories to authenticated;
grant update (category_id, type, amount, date, description, status) on public.transactions to authenticated;

create function public.financial_report(
  p_start date default null, p_end date default null,
  p_category uuid default null, p_type text default null,
  p_status text default null, p_search text default null
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as materialized (
    select t.* from public.transactions t
    where t.user_id = (select auth.uid())
      and (p_start is null or t.date >= p_start)
      and (p_end is null or t.date < p_end)
      and (p_category is null or t.category_id = p_category)
      and (p_type is null or t.type::text = p_type)
      and (p_status is null or t.status::text = p_status)
      and (p_search is null or strpos(lower(t.description), lower(p_search)) > 0)
  ), totals as (
    select
      coalesce(sum(amount) filter (where type = 'income' and status = 'paid'), 0) as income,
      coalesce(sum(amount) filter (where type = 'expense' and status = 'paid'), 0) as expense,
      coalesce(sum(amount) filter (where type = 'income' and status = 'pending'), 0) as pending_income,
      coalesce(sum(amount) filter (where type = 'expense' and status = 'pending'), 0) as pending_expense,
      count(*) as transaction_count,
      count(*) filter (where type = 'income' and status = 'paid') as paid_income_count,
      count(*) filter (where type = 'expense' and status = 'paid') as paid_expense_count,
      count(*) filter (where type = 'income' and status = 'pending') as pending_income_count,
      count(*) filter (where type = 'expense' and status = 'pending') as pending_expense_count
    from filtered
  ), spending as (
    select c.id, c.name,
      coalesce(sum(t.amount) filter (where t.status = 'paid'), 0) as paid,
      coalesce(sum(t.amount) filter (where t.status = 'pending'), 0) as pending
    from filtered t join public.categories c on c.id = t.category_id
    where t.type = 'expense'
    group by c.id, c.name
  )
  select jsonb_build_object(
    'currency', 'BRL',
    'period', jsonb_build_object('from', p_start, 'until', p_end),
    'paid_income', income::numeric(30,2)::text,
    'paid_expense', expense::numeric(30,2)::text,
    'pending_income', pending_income::numeric(30,2)::text,
    'pending_expense', pending_expense::numeric(30,2)::text,
    'available_balance', (income - expense)::numeric(30,2)::text,
    'transaction_count', transaction_count,
    'paid_income_count', paid_income_count,
    'paid_expense_count', paid_expense_count,
    'pending_income_count', pending_income_count,
    'pending_expense_count', pending_expense_count,
    'expenses_by_category', coalesce((select jsonb_agg(jsonb_build_object(
      'category_id', id, 'name', name, 'paid', paid::numeric(30,2)::text,
      'pending', pending::numeric(30,2)::text) order by paid desc, name, id) from spending), '[]'::jsonb)
  ) from totals;
$$;

create function public.monthly_evolution(p_year integer)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_year is null or p_year < 1900 or p_year > 9998 then
    raise exception 'Ano inválido' using errcode = '22003';
  end if;
  return (
    with months as (
      select generate_series(1, 12) as month
    ), totals as (
      select extract(month from t.date)::integer as month,
        coalesce(sum(t.amount) filter (where t.type = 'income' and t.status = 'paid'), 0) as income,
        coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'paid'), 0) as expense,
        coalesce(sum(t.amount) filter (where t.type = 'income' and t.status = 'pending'), 0) as pending_income,
        coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'pending'), 0) as pending_expense
      from public.transactions t
      where t.user_id = (select auth.uid())
        and t.date >= make_date(p_year, 1, 1) and t.date < make_date(p_year + 1, 1, 1)
      group by extract(month from t.date)
    )
    select jsonb_build_object('year', p_year, 'currency', 'BRL', 'months',
      jsonb_agg(jsonb_build_object('month', m.month,
        'paid_income', coalesce(t.income, 0)::numeric(30,2)::text,
        'paid_expense', coalesce(t.expense, 0)::numeric(30,2)::text,
        'pending_income', coalesce(t.pending_income, 0)::numeric(30,2)::text,
        'pending_expense', coalesce(t.pending_expense, 0)::numeric(30,2)::text,
        'net', (coalesce(t.income, 0) - coalesce(t.expense, 0))::numeric(30,2)::text
      ) order by m.month))
    from months m left join totals t on t.month = m.month
  );
end;
$$;

revoke all on function public.financial_report(date, date, uuid, text, text, text) from public, anon;
revoke all on function public.monthly_evolution(integer) from public, anon;
grant execute on function public.financial_report(date, date, uuid, text, text, text) to authenticated;
grant execute on function public.monthly_evolution(integer) to authenticated;

commit;

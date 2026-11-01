begin;

create function public.monthly_evolution_range(
  p_start date, p_end date, p_category uuid default null,
  p_type text default null, p_status text default null, p_search text default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_start is null or p_end is null or p_start < date '1900-01-01'
    or p_end > date '9999-01-01' or p_end <= p_start then
    raise exception 'Intervalo inválido' using errcode = '22003';
  end if;
  if (extract(year from p_end - 1)::integer - extract(year from p_start)::integer) * 12
    + extract(month from p_end - 1)::integer - extract(month from p_start)::integer + 1 > 120 then
    raise exception 'Intervalo mensal excede 120 meses' using errcode = '22003';
  end if;
  return (
    with months as (
      select generate_series(date_trunc('month', p_start::timestamp),
        date_trunc('month', (p_end - 1)::timestamp), interval '1 month')::date as month_date
    ), totals as (
      select date_trunc('month', t.date::timestamp)::date as month_date,
        coalesce(sum(t.amount) filter (where t.type = 'income' and t.status = 'paid'), 0) as income,
        coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'paid'), 0) as expense,
        coalesce(sum(t.amount) filter (where t.type = 'income' and t.status = 'pending'), 0) as pending_income,
        coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'pending'), 0) as pending_expense
      from public.transactions t
      where t.user_id = (select auth.uid()) and t.date >= p_start and t.date < p_end
        and (p_category is null or t.category_id = p_category)
        and (p_type is null or t.type::text = p_type)
        and (p_status is null or t.status::text = p_status)
        and (p_search is null or strpos(lower(t.description), lower(p_search)) > 0)
      group by date_trunc('month', t.date::timestamp)::date
    )
    select jsonb_build_object('year', case when extract(year from p_start) = extract(year from p_end - 1)
      then extract(year from p_start)::integer else null end,
      'currency', 'BRL', 'period', jsonb_build_object('from', p_start, 'until', p_end),
      'months', jsonb_agg(jsonb_build_object(
        'year', extract(year from m.month_date)::integer, 'month', extract(month from m.month_date)::integer,
        'paid_income', coalesce(t.income, 0)::numeric(30,2)::text,
        'paid_expense', coalesce(t.expense, 0)::numeric(30,2)::text,
        'pending_income', coalesce(t.pending_income, 0)::numeric(30,2)::text,
        'pending_expense', coalesce(t.pending_expense, 0)::numeric(30,2)::text,
        'net', (coalesce(t.income, 0) - coalesce(t.expense, 0))::numeric(30,2)::text
      ) order by m.month_date)) from months m left join totals t using(month_date)
  );
end;
$$;

revoke all on function public.monthly_evolution_range(date, date, uuid, text, text, text) from public, anon;
grant execute on function public.monthly_evolution_range(date, date, uuid, text, text, text) to authenticated;

commit;

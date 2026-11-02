BEGIN;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'lucas.mendes@email.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Crie primeiro a conta do Lucas no Supabase Auth.';
  END IF;

  -- A categoria padrão chama-se Salário.
  -- O mock usa Salário & Renda.
  UPDATE public.categories
  SET name = 'Salário & Renda'
  WHERE user_id = v_user_id
    AND name = 'Salário'
    AND type = 'income'
    AND NOT EXISTS (
      SELECT 1
      FROM public.categories
      WHERE user_id = v_user_id
        AND name = 'Salário & Renda'
        AND type = 'income'
    );

  INSERT INTO public.categories (user_id, name, type, icon)
  VALUES
    (v_user_id, 'Moradia', 'expense', 'home'),
    (v_user_id, 'Alimentação', 'expense', 'shopping_cart'),
    (v_user_id, 'Transporte', 'expense', 'directions_bus'),
    (v_user_id, 'Saúde', 'expense', 'medical_services'),
    (v_user_id, 'Lazer', 'expense', 'sports_esports'),
    (v_user_id, 'Salário & Renda', 'income', 'account_balance_wallet')
  ON CONFLICT (user_id, type, name) DO NOTHING;

  INSERT INTO public.transactions (
    id,
    user_id,
    category_id,
    type,
    amount,
    date,
    description,
    status,
    created_at
  )
  SELECT
    md5(v_user_id::text || ':lucas-demo:' || seed.key)::uuid,
    v_user_id,
    category.id,
    category.type,
    seed.amount,
    seed.date::date,
    seed.description,
    seed.status::public."TransactionStatus",
    (seed.date || 'T12:00:00Z')::timestamptz
  FROM (
    VALUES
      ('01', 'Salário & Renda', 'income', 5000.00,
       '2024-10-05', 'Salário Mensal', 'paid'),

      ('02', 'Moradia', 'expense', 1450.00,
       '2024-10-10', 'Aluguel & Condomínio', 'paid'),

      ('03', 'Alimentação', 'expense', 420.30,
       '2024-10-14', 'Supermercado Semanal', 'paid'),

      ('04', 'Salário & Renda', 'income', 800.00,
       '2024-10-18', 'Consultoria Freelance', 'paid'),

      ('05', 'Saúde', 'expense', 159.20,
       '2024-10-20', 'Farmácia', 'paid'),

      ('06', 'Transporte', 'expense', 200.00,
       '2024-10-22', 'Transporte Urbano', 'paid'),

      ('07', 'Lazer', 'expense', 150.00,
       '2024-10-23', 'Livros & Lazer', 'paid'),

      ('08', 'Moradia', 'expense', 350.00,
       '2024-10-28', 'Internet Fibra', 'pending'),

      ('09', 'Salário & Renda', 'income', 5000.00,
       '2024-09-05', 'Salário Mensal', 'paid'),

      ('10', 'Moradia', 'expense', 1450.00,
       '2024-09-10', 'Aluguel & Condomínio', 'paid'),

      ('11', 'Alimentação', 'expense', 420.00,
       '2024-09-14', 'Supermercado', 'paid')
  ) AS seed(key, category_name, type, amount, date, description, status)
  JOIN public.categories category
    ON category.user_id = v_user_id
    AND category.name = seed.category_name
    AND category.type::text = seed.type
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMIT;
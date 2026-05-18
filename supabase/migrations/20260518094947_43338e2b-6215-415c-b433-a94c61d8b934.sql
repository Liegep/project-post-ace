
DO $$
DECLARE
  v_client_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_col_ideas uuid := gen_random_uuid();
  v_col_progress uuid := gen_random_uuid();
  v_col_review uuid := gen_random_uuid();
  v_col_approved uuid := gen_random_uuid();
  v_col_scheduled uuid := gen_random_uuid();
  v_col_published uuid := gen_random_uuid();
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.user_roles WHERE role = 'super_admin' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@demo.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'demo@demo.com', crypt('Demo1234!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Client"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', 'demo@demo.com'), 'email', v_user_id::text, now(), now(), now());
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@demo.com';
    UPDATE auth.users SET encrypted_password = crypt('Demo1234!', gen_salt('bf')), updated_at = now() WHERE id = v_user_id;
  END IF;

  INSERT INTO public.clients (
    name, slug, locale, owner_id,
    tracking_enabled, tracking_visible_to_client,
    show_upcoming_posts, show_archived_to_client,
    allow_client_create_post, allow_client_edit_caption, allow_client_create_tags,
    client_portal_title, posting_period, client_type,
    instagram_url, facebook_url, website_url,
    billing_currency, billing_monthly_amount, billing_recurrence_active,
    show_invoices_to_client
  ) VALUES (
    'Demo Agency', 'demo-agency-' || substr(md5(random()::text),1,6), 'en', v_owner,
    true, true,
    true, false,
    false, true, false,
    'Content Hub', 'May 2026', 'premium',
    'https://instagram.com/demo', 'https://facebook.com/demo', 'https://demo-agency.com',
    'USD', 1500, true,
    true
  ) RETURNING id INTO v_client_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'client') ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (v_user_id, 'Demo Client', 'demo@demo.com', 'client')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  INSERT INTO public.user_client_assignments (user_id, client_id, assigned_by)
    VALUES (v_user_id, v_client_id, v_owner);

  INSERT INTO public.columns (id, client_id, name, position, visible_to_client) VALUES
    (v_col_ideas,     v_client_id, 'Ideas',          0, false),
    (v_col_progress,  v_client_id, 'In Progress',    1, false),
    (v_col_review,    v_client_id, 'Pending Review', 2, true),
    (v_col_approved,  v_client_id, 'Approved',       3, true),
    (v_col_scheduled, v_client_id, 'Scheduled',      4, true),
    (v_col_published, v_client_id, 'Published',      5, true);

  INSERT INTO public.posts (client_id, column_id, title, caption, status, client_label, deadline, position, image_url)
  VALUES
    (v_client_id, v_col_review,    'Summer Launch Campaign', 'Get ready for our biggest summer drop yet! ☀️ #SummerVibes', ARRAY['pending'],   'pendente',  (now() + interval '3 days'), 0, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080'),
    (v_client_id, v_col_approved,  'Product Spotlight: Aurora',  'Meet Aurora — designed for those who chase the light. ✨',   ARRAY['approved'],  'aprovado',  (now() + interval '5 days'), 0, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080'),
    (v_client_id, v_col_scheduled, 'Behind the Scenes',          'A peek behind the curtain of our latest shoot. 📸',           ARRAY['scheduled'], 'aprovado',  (now() + interval '7 days'), 0, 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1080'),
    (v_client_id, v_col_published, 'Customer Story: Sophie',     'Sophie shares how she built her morning routine with us. 💛', ARRAY['published'], 'aprovado',  (now() - interval '2 days'), 0, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1080'),
    (v_client_id, v_col_progress,  'Brand Reel — Draft 1',       'Cinematic montage of our spring collection. Music TBD.',     ARRAY['entrada'],   'pendente',  (now() + interval '10 days'), 0, 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1080');

  INSERT INTO public.client_notes (client_id, user_id, title, content, color)
  VALUES (v_client_id, v_owner, 'Welcome 👋', 'This is your content hub — review, approve, comment and track every post here.', '#fef08a');

  INSERT INTO public.client_links (client_id, section_title, title, url, position)
  VALUES (v_client_id, 'Brand Assets', 'Brand Guidelines (PDF)', 'https://demo-agency.com/brand.pdf', 0);
END $$;

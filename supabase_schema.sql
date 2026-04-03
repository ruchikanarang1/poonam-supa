-- ============================================================
--  POONAM STEEL ERP  —  Supabase SQL Schema
--  Run this entire script in the Supabase SQL Editor
--  Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Enable UUID generation (already on by default in Supabase)
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES  (one row per authenticated user)
-- ============================================================
create table if not exists profiles (
    id                uuid primary key references auth.users(id) on delete cascade,
    email             text,
    phone_number      text,
    display_name      text not null default 'Steel User',
    role              text not null default 'user',   -- 'user' | 'admin' | 'superadmin'
    active_company_id uuid,
    roles             jsonb default '[]'::jsonb,      -- per-company role array
    created_at        timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read/write their own profile"
    on profiles for all using (auth.uid() = id);

-- ============================================================
-- 2. COMPANIES
-- ============================================================
create table if not exists companies (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    location     text default '',
    owner_id     uuid references auth.users(id),
    admin_ids    uuid[]   default '{}',
    employee_ids uuid[]   default '{}',
    roles        jsonb    default '{}'::jsonb,   -- { "userId": ["admin","logistics"] }
    created_at   timestamptz default now()
);
alter table companies enable row level security;
create policy "Company members can read their company"
    on companies for select
    using (auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids));
create policy "Admins can update their company"
    on companies for update
    using (auth.uid() = any(admin_ids));
create policy "Authenticated users can create a company"
    on companies for insert
    with check (auth.uid() is not null);

-- ============================================================
-- 3. PRODUCTS
-- ============================================================
create table if not exists products (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    name        text not null,
    category    text,
    unit        text,
    price       numeric,
    image_url   text,
    description text,
    brand       text,
    sizes       text[],
    created_at  timestamptz default now()
);
alter table products enable row level security;
create policy "Company members can manage products"
    on products for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 4. ORDERS
-- ============================================================
create table if not exists orders (
    id         uuid primary key default gen_random_uuid(),
    company_id uuid references companies(id) on delete cascade,
    items      jsonb,
    total      numeric,
    status     text default 'pending',
    created_at timestamptz default now()
);
alter table orders enable row level security;
create policy "Company members can manage orders"
    on orders for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 5. LOGISTICS — TRANSPORT
-- ============================================================
create table if not exists logistics_transport (
    id                uuid primary key default gen_random_uuid(),
    company_id        uuid references companies(id) on delete cascade,
    date              date,
    time              text,
    lr_number         text,
    transport_company text,
    vendor_name       text,
    location          text,
    vehicle_no        text,
    driver_name       text,
    from_loc          text,
    to_loc            text,
    opened            boolean default false,
    goods             jsonb,
    status            text default 'pending',
    notes             text,
    metadata          jsonb default '{}'::jsonb,
    po_id             uuid,
    created_at        timestamptz default now()
);
alter table logistics_transport enable row level security;
create policy "Company members can manage logistics_transport"
    on logistics_transport for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 6. LOGISTICS — BILLS
-- ============================================================
create table if not exists logistics_bills (
    id                uuid primary key default gen_random_uuid(),
    company_id        uuid references companies(id) on delete cascade,
    date              date,
    time              text,
    bill_no           text,
    lr_number         text,
    transport_company text,
    vendor_name       text,
    location          text,
    vendor            text,
    amount            numeric,
    category          text,
    payment_mode      text,
    opened            boolean default false,
    notes             text,
    metadata          jsonb default '{}'::jsonb,
    po_id             uuid,
    created_at        timestamptz default now()
);
alter table logistics_bills enable row level security;
create policy "Company members can manage logistics_bills"
    on logistics_bills for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 7. TICKET CATEGORIES
-- ============================================================
create table if not exists ticket_categories (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    name        text not null,
    description text,
    color       text,
    fields      jsonb default '[]'::jsonb,
    created_at  timestamptz default now()
);
alter table ticket_categories enable row level security;
create policy "Company members can manage ticket_categories"
    on ticket_categories for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 8. TICKETS
-- ============================================================
create table if not exists tickets (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    category_id uuid references ticket_categories(id),
    title       text,
    status      text default 'open',
    priority    text default 'medium',
    assigned_to uuid references auth.users(id),
    created_by  uuid references auth.users(id),
    data        jsonb default '{}'::jsonb,
    created_at  timestamptz default now()
);
alter table tickets enable row level security;
create policy "Company members can manage tickets"
    on tickets for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 9. SUPPLIERS
-- ============================================================
create table if not exists suppliers (
    id         uuid primary key default gen_random_uuid(),
    company_id uuid references companies(id) on delete cascade,
    name       text not null,
    contact    text,
    email      text,
    address    text,
    brands     jsonb default '[]'::jsonb,
    gst_no     text,
    created_at timestamptz default now()
);
alter table suppliers enable row level security;
create policy "Company members can manage suppliers"
    on suppliers for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 10. GOODS CHECK-IN
-- ============================================================
create table if not exists goods_check_in (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    date        date,
    supplier_id uuid,
    vehicle_no  text,
    items       jsonb default '[]'::jsonb,
    notes       text,
    status      text default 'pending',
    created_at  timestamptz default now()
);
alter table goods_check_in enable row level security;
create policy "Company members can manage goods_check_in"
    on goods_check_in for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 11. VENDOR BRAND REGISTRY
-- ============================================================
create table if not exists vendor_brand_registry (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    vendor_name text not null,
    brand_name  text,
    category    text,
    notes       text,
    created_at  timestamptz default now()
);
alter table vendor_brand_registry enable row level security;
create policy "Company members can manage vendor_brand_registry"
    on vendor_brand_registry for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 12. TRANSPORTS  (master transport list)
-- ============================================================
create table if not exists transports (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    name        text not null,
    contact     text,
    vehicle_nos jsonb default '[]'::jsonb,
    notes       text,
    created_at  timestamptz default now()
);
alter table transports enable row level security;
create policy "Company members can manage transports"
    on transports for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 13. PURCHASE ORDERS
-- ============================================================
create table if not exists purchase_orders (
    id                  uuid primary key default gen_random_uuid(),
    company_id          uuid references companies(id) on delete cascade,
    po_number           text unique,
    supplier_id         uuid,
    items               jsonb default '[]'::jsonb,
    total_amount        numeric,
    status              text default 'pending', -- pending | partial | received
    transport_entry_id  uuid,
    bill_entry_id       uuid,
    notes               text,
    created_at          timestamptz default now()
);
alter table purchase_orders enable row level security;
create policy "Company members can manage purchase_orders"
    on purchase_orders for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 14. FORM CONFIGS  (dynamic form builder)
-- ============================================================
create table if not exists form_configs (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    form_type   text not null,
    fields      jsonb default '[]'::jsonb,
    unique (company_id, form_type)
);
alter table form_configs enable row level security;
create policy "Company members can manage form_configs"
    on form_configs for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 15. CONFIGS  (units list and other key/value settings)
-- ============================================================
create table if not exists configs (
    id          uuid primary key default gen_random_uuid(),
    company_id  uuid references companies(id) on delete cascade,
    key         text not null,
    value       jsonb default '{}'::jsonb,
    unique (company_id, key)
);
alter table configs enable row level security;
create policy "Company members can manage configs"
    on configs for all
    using (company_id in (select id from companies where auth.uid() = any(employee_ids) or auth.uid() = any(admin_ids)));

-- ============================================================
-- 16. AUTO-CREATE PROFILE ON SIGN UP  (Supabase trigger)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into public.profiles (id, email, phone_number, display_name, role)
    values (
        new.id,
        new.email,
        new.phone,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Steel User'),
        'user'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ============================================================
-- Done! Your DB is ready. Now go to:
--   Authentication → Providers → Enable Google + Phone
--   Storage → Create bucket called "product-images" (public)
-- ============================================================

-- ============================================================
-- APPROVAL SYSTEM (run these in SQL Editor)
-- ============================================================

-- Add status column to profiles (if you ran the initial schema already)
alter table profiles add column if not exists status text not null default 'pending';

-- Make yourself superadmin + approved (replace with your actual email)
-- update profiles set role = 'superadmin', status = 'approved' where email = 'you@gmail.com';


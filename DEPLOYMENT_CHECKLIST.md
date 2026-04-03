# Deployment Checklist - Migration Fixes

## ⚠️ CRITICAL: Database Changes Required

The code fixes are complete, but you MUST update your Supabase database RLS policies for the fixes to work properly.

## Step 1: Update RLS Policies in Supabase

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Run these SQL commands to update RLS policies:

```sql
-- Drop and recreate all RLS policies to check both employee_ids AND admin_ids

-- Products
DROP POLICY IF EXISTS "Company members can manage products" ON products;
CREATE POLICY "Company members can manage products"
    ON products FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Orders
DROP POLICY IF EXISTS "Company members can manage orders" ON orders;
CREATE POLICY "Company members can manage orders"
    ON orders FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Logistics Transport
DROP POLICY IF EXISTS "Company members can manage logistics_transport" ON logistics_transport;
CREATE POLICY "Company members can manage logistics_transport"
    ON logistics_transport FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Logistics Bills
DROP POLICY IF EXISTS "Company members can manage logistics_bills" ON logistics_bills;
CREATE POLICY "Company members can manage logistics_bills"
    ON logistics_bills FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Tickets
DROP POLICY IF EXISTS "Company members can manage tickets" ON tickets;
CREATE POLICY "Company members can manage tickets"
    ON tickets FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Ticket Categories
DROP POLICY IF EXISTS "Company members can manage ticket_categories" ON ticket_categories;
CREATE POLICY "Company members can manage ticket_categories"
    ON ticket_categories FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Suppliers
DROP POLICY IF EXISTS "Company members can manage suppliers" ON suppliers;
CREATE POLICY "Company members can manage suppliers"
    ON suppliers FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Goods Check-In
DROP POLICY IF EXISTS "Company members can manage goods_check_in" ON goods_check_in;
CREATE POLICY "Company members can manage goods_check_in"
    ON goods_check_in FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Vendor Brand Registry
DROP POLICY IF EXISTS "Company members can manage vendor_brand_registry" ON vendor_brand_registry;
CREATE POLICY "Company members can manage vendor_brand_registry"
    ON vendor_brand_registry FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Transports
DROP POLICY IF EXISTS "Company members can manage transports" ON transports;
CREATE POLICY "Company members can manage transports"
    ON transports FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Purchase Orders
DROP POLICY IF EXISTS "Company members can manage purchase_orders" ON purchase_orders;
CREATE POLICY "Company members can manage purchase_orders"
    ON purchase_orders FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Form Configs
DROP POLICY IF EXISTS "Company members can manage form_configs" ON form_configs;
CREATE POLICY "Company members can manage form_configs"
    ON form_configs FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));

-- Configs
DROP POLICY IF EXISTS "Company members can manage configs" ON configs;
CREATE POLICY "Company members can manage configs"
    ON configs FOR ALL
    USING (company_id IN (SELECT id FROM companies WHERE auth.uid() = ANY(employee_ids) OR auth.uid() = ANY(admin_ids)));
```

4. Click **Run** to execute all commands
5. Verify: You should see "Success. No rows returned" for each command

## Step 2: Deploy Code Changes

The following files have been updated and are ready to deploy:

- ✅ `src/lib/db.js` - Core database fixes
- ✅ `src/pages/LogisticsPortal.jsx` - Error handling
- ✅ `src/pages/GoodsCheckIn.jsx` - Error handling
- ✅ `src/components/admin/AdminOverview.jsx` - Error handling
- ✅ `supabase_schema.sql` - Updated RLS policies (reference only)

### Deploy to Production

```bash
# Build the application
npm run build

# Deploy to your hosting (Vercel/Netlify)
# Follow your normal deployment process
```

## Step 3: Verify Fixes

After deployment, test these scenarios:

### Test 1: Transport Entry Portal
1. Navigate to Transport Entry Portal
2. Fill out a transport entry with lots
3. Click Save
4. ✅ Verify: Entry appears in the ledger table immediately
5. ✅ Verify: No infinite loading state

### Test 2: Bill Entry Portal
1. Navigate to Bill Entry Portal
2. ✅ Verify: Portal loads within 2-3 seconds
3. ✅ Verify: Form and existing entries display correctly

### Test 3: Dashboard
1. Navigate to Admin Dashboard
2. ✅ Verify: Statistics load within 2-3 seconds
3. ✅ Verify: All metrics display correctly

### Test 4: Error Handling
1. Disconnect internet or block Supabase in browser DevTools
2. Try to load any portal
3. ✅ Verify: Error alert appears with message
4. ✅ Verify: No infinite loading state

### Test 5: Admin Access
1. Login as a user who is admin (in admin_ids)
2. ✅ Verify: Can access all company data
3. ✅ Verify: Can view and create logistics entries

## Step 4: Monitor for Issues

After deployment, monitor:
- Browser console for any errors
- Supabase logs for RLS policy violations
- User feedback on portal loading times

## Rollback Plan

If issues occur:

1. **Code Rollback**: Revert to previous deployment
2. **Database Rollback**: RLS policies can be reverted by re-running the old schema
3. **Contact**: Check error logs and contact support if needed

## Summary of Changes

✅ Fixed silent error handling - errors now throw and display to users
✅ Fixed field naming - created_at ↔ createdAt mapping
✅ Fixed data partitioning - lots ↔ goods mapping
✅ Fixed RLS policies - now check both employee_ids AND admin_ids
✅ Added user-friendly error messages in all portals

## Expected Results

After deployment:
- All portals load within 2-3 seconds
- Data saves and displays immediately
- Error messages show when operations fail
- Admins can access data properly
- No more infinite loading states

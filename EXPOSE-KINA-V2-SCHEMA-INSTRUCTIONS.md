# How to Expose kina_v2 Schema in Supabase Dashboard

## Problem
The error "The schema must be one of the following: public, graphql_public, kina, storage, graphql, tests" occurs because `kina_v2` schema is not exposed to PostgREST API.

## Solution: Add kina_v2 to Exposed Schemas

### Step 1: Go to Supabase Dashboard
1. Open your browser and go to: https://app.supabase.com
2. Select your project (gjaskifzrqjcesdnnqpa)

### Step 2: Navigate to API Settings
1. In the left sidebar, click **Settings** (gear icon)
2. Click **API** in the settings menu
3. Scroll down to **Data API Settings**

### Step 3: Add kina_v2 to Exposed Schemas
1. Find **"Exposed schemas"** field
2. You should see: `public, graphql_public, kina, storage, graphql, tests`
3. Add `kina_v2` to the list (comma-separated):
   ```
   public, graphql_public, kina, kina_v2, storage, graphql, tests
   ```
4. Also add `kina_v2` to **"Extra search path"** (if present):
   ```
   public, graphql_public, kina, kina_v2, storage, graphql, tests
   ```
5. Click **Save**

### Step 4: Wait for Changes to Apply
- Changes typically apply within 1-2 minutes
- You may need to restart your servers after the change

### Step 5: Verify It Works
1. Restart your Admin Dashboard server
2. Restart your Guest System server
3. Check if the connection error is gone

## Alternative: Use SQL (If Dashboard Option Not Available)

If you can't find the "Exposed schemas" option in the Dashboard, you may need to contact Supabase support or use the Supabase Management API to configure this.

## What We've Already Done

✅ **Database Permissions**: Already granted via migration
- `GRANT USAGE ON SCHEMA kina_v2 TO anon, authenticated, service_role`
- `GRANT ALL ON ALL TABLES IN SCHEMA kina_v2 TO anon, authenticated, service_role`
- `GRANT ALL ON ALL SEQUENCES IN SCHEMA kina_v2 TO anon, authenticated, service_role`

⏳ **PostgREST Configuration**: Needs to be done in Dashboard
- This is a Supabase infrastructure setting
- Can only be changed via Dashboard or Management API

## Temporary Workaround (If Needed)

If you need the system working immediately while waiting for schema exposure:
- You can temporarily change the code back to use `kina` schema
- But this defeats the purpose of the unified schema

## Notes

- The `kina_v2` schema exists and has all data migrated
- All permissions are correctly set
- Only the PostgREST exposure setting needs to be configured
- This is a one-time configuration that persists


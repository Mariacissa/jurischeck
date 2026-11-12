/*
# Revoke execute on handle_new_user from authenticated

## Purpose
The handle_new_user() SECURITY DEFINER function is a trigger function that
auto-creates a profile row when a new auth.users row is inserted. It should
only be called by the database trigger, never by any client via the REST API.

The previous migration revoked EXECUTE from PUBLIC and anon, but the
`authenticated` role still had execute permission (Postgres grants EXECUTE
to PUBLIC by default, and `authenticated` inherits from PUBLIC).

## Changes
1. Revoke EXECUTE on handle_new_user() from authenticated role.
2. The function remains callable by the trigger (runs as SECURITY DEFINER
   with service_role privileges).
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

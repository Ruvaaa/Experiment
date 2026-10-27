# GitHub Authentication Setup

GitHub sign-in uses Supabase Auth. The GitHub OAuth application must be configured in the Supabase Dashboard; secrets are not stored in this application.

## 1. Create a GitHub OAuth application

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Use the local and deployed application URLs as appropriate for the homepage.
3. Set the authorization callback URL to the Supabase project callback shown in **Supabase Dashboard → Authentication → Providers → GitHub**. It normally uses the project URL:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

4. Copy the GitHub Client ID and Client Secret.

## 2. Configure Supabase

In **Supabase Dashboard → Authentication → Providers → GitHub**, enable GitHub and enter the GitHub Client ID and Client Secret. No secret belongs in `.env`, source code, or `VITE_*` variables.

In **Authentication → URL Configuration**, add:

- Local development: `http://localhost:5173/dashboard`
- Production: `https://<production-host>/dashboard`

The client requests the `read:user` and `user:email` scopes only. Repository access is not enabled by this sign-in capability.

## 3. Apply the profile migration

Apply `supabase/migrations/004_github_oauth_profiles.sql` to the Supabase project. For a local Supabase project, the migration can be applied with:

```sh
supabase db push
```

The trigger upserts profile data for GitHub identity metadata and does not grant repository permissions.

## 4. Verify

1. Start the frontend and open `/login` or `/signup`.
2. Select **Continue with GitHub**.
3. Complete GitHub authorization.
4. Confirm the browser returns to `/dashboard` with a restored session.
5. Confirm a profile row exists with the GitHub display name and avatar when available.
6. Sign out and repeat sign-in to verify session restoration.

This repository does not ship GitHub OAuth credentials or contain the Supabase service-role key.

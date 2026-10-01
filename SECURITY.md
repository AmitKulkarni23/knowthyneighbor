# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub: go to the **Security** tab of this repository and click
**Report a vulnerability**. Include steps to reproduce and what an attacker could gain.

You can expect an acknowledgement within a few days. Please give us a reasonable chance to
fix the issue before disclosing it publicly.

## Scope

In scope:

- The live site (nextdoorish.com) and its Supabase backend: RLS policies, RPCs, Edge Functions
- Anything that exposes another user's private data (email, exact location, messages,
  join requests, invite codes) or lets one couple act as another
- Ways to bypass the rate limits on join requests, messages or the contact form

Out of scope:

- Denial of service and volumetric attacks
- Spam or social engineering of other users
- Findings that need a compromised device or browser
- Missing best-practice headers with no demonstrated impact

Please only test against accounts you own, and don't access or modify other users' data.

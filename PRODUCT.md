# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) on Vercel, Supabase (Auth, Postgres + PostGIS, Realtime, Edge Functions, Storage), Resend for transactional email. All infrastructure managed as code via Supabase CLI migrations.

## Users

Any couple looking for real human connection with other couples in their area. No age or life-stage filter. The common thread is wanting to share a meal with neighbors instead of scrolling feeds.

## Product Purpose

KnowThyNeighbor connects couples for shared meals. One person creates a couple profile, finds other couples nearby, sends a join request, chats to coordinate, and meets in person for brunch, lunch, or dinner. The product exists because people are tired of AI-generated content and algorithmic social feeds and want real, in-person interaction. Success is real meals happening between real people.

## Positioning

Anti-AI-slop. While other platforms optimize for engagement and screen time, KnowThyNeighbor optimizes for getting people off the screen and around a table. The differentiator is the couple-to-couple framing (not individuals, not groups) and the meal as the organizing event (not "hanging out" or "matching").

## Operating Context

A couple signs up together: one partner creates the profile for both and shares an invite link with their spouse. They set availability (days and meal slots), browse other couples sorted by distance, and send join requests to hosts. The host accepts or declines; acceptance opens a chat. Chat is for coordinating the meal, not general messaging. The host shares their address manually when they're ready. After the meal, the conversation is retained for 30 days then purged.

## Capabilities and Constraints

- Auth is passwordless magic link via Supabase Auth
- Only zip code collected for location; geocoded to lat/lng centroid. No street address stored
- Discovery has no radius cap for MVP; PostGIS infrastructure in place for future filtering
- Chat available only after join request is accepted
- Join requests trigger email notification to host via Resend
- Messages have a 30-day retention policy after meal completion
- Age is immutable after profile creation; zip code is updatable
- Ethnicity column exists in database but is not collected in the UI for MVP
- Two partners per couple, no exceptions

## Evidence on Hand

No logo, brand assets, testimonials, or real user data. The product name "KnowThyNeighbor" is not locked. All content must be created; nothing is fabricated as real user evidence.

## Product Principles

1. **Human connection is the product.** Every feature should reduce the distance between signing up and sitting down to eat with someone.
2. **Privacy by absence.** Don't collect what you don't need. No address on file means no address to leak.
3. **The couple is the unit.** Two people, one profile, one social identity. No individual mode, no groups.
4. **Chat is a bridge, not a destination.** Messaging exists to plan meals. It is not a social feed, not a group chat, not a place to hang out.
5. **Respect the threshold.** Entering someone's home is a big deal. The join-request gate, the explicit privacy copy, and the manual address sharing all honor that.

## Accessibility & Inclusion

No specific standard established yet. Default to WCAG 2.1 AA for all web surfaces.

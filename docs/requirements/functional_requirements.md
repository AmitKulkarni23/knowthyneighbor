# Functional Requirements — KnowThyNeighbor

## 1. Authentication

- Users sign up and log in via magic link (email-based, no passwords)
- On first login, the user is prompted to create their couple profile
- A user who receives a partner invite link is authenticated and auto-joined to the existing couple profile

## 2. Couple Profile (Single-Form Creation)

- One person (the creator) signs up and fills out a **single form** with all couple information:
  - **Their own details**: full name, age, has kids (yes/no), number of kids
  - **Partner's details**: full name, age, has kids (yes/no), number of kids
  - **Couple details**: couple display name (optional, e.g., "The Patels"), short bio, zip code, hosting preference (host, visit, or both)
- Profile photos are optional (one per person)
- A couple is always exactly **two people** — no solo users, no groups
- After creation, the creator copies a shareable invite link and sends it to their spouse
- The spouse clicks the link, signs up via magic link, and is auto-joined to the couple as partner 2
- The spouse does not re-enter information — the creator already provided it
- Age is **immutable** after initial entry — cannot be edited by either partner
- Zip code **can** be updated (people move)
- Ethnicity is **not collected in the UI** for MVP (column exists in the database for future use)
- No street address is ever collected or stored

## 3. Availability

- Couples set their calendar availability:
  - Day of week (recurring) or specific dates
  - Time slot: brunch, lunch, or dinner
- Availability is visible to other couples during discovery

## 4. Discovery & Search

- Discovery is **filter-based browsing**, not keyword search
- **No radius restriction for MVP** — all couples are discoverable regardless of distance
- The PostGIS infrastructure (zip code geocoding, distance calculation) is in place for future radius filtering
- Available filters:
  - Has kids / No kids
  - Meal type (brunch, lunch, dinner)
  - Hosting preference (hosts only, visitors only, or both)
  - Availability overlap with the user's own calendar
- Results are sorted by **distance** (closest first)
- Search results show **approximate distance only** (e.g., "2.3 miles away") — never an address or precise location

## 5. Join Requests

- When a visiting couple finds a hosting couple they'd like to meet, they send a **join request**
- The join request includes:
  - Preferred meal type (brunch, lunch, dinner)
  - Optional short message (e.g., "We love Thai food and have a 3-year-old!")
- The host couple receives an **email notification** about the join request via **Resend**
- The host couple can **accept** or **decline** the request
- Accepting a request opens a chat conversation between the two couples
- Declining notifies the requester (in-app only, no email)

## 6. Messaging

- Chat is available **only after a join request is accepted** — no unsolicited messaging
- Chat is a simple text-based interface between two couples
- Messages are delivered in real-time when both parties are online
- When a user opens a chat, message history is loaded from the database
- Messages are stored by the service with a **30-day retention policy** after a meal is completed or cancelled
- Chat is a coordination tool to plan the meal, not a general messaging platform

## 7. Meals

- Either couple can propose a meal from within the chat
- A meal proposal includes:
  - Meal type (brunch, lunch, dinner)
  - Proposed date and time
  - Which couple is hosting
- The other couple can accept or decline the proposal
- Meal statuses: proposed → confirmed → completed / cancelled
- Once a meal is completed, the conversation and messages are retained for 30 days, then purged

## 8. Privacy & Safety

- **No street address is ever collected, stored, or displayed by the service**
- Only the user's zip code is collected; it is geocoded to a centroid lat/lng for proximity calculation
- The UI explicitly states:
  > "We only ask for your zip code to find couples near you. We never ask for or store your home address. Share your address only when you're ready, directly in chat, after you've done your own due diligence on who you're inviting home."
- Host couples share their address **manually via chat** at their own discretion
- Discovery results show approximate distance, never coordinates or location details

## 9. Email Notifications

- Email is sent **only** for join requests — when a couple wants to be hosted
- No email notifications for chat messages
- No email notifications for meal proposals (those are in-app via chat)
- Email is delivered via **Resend**
- Email templates are managed in Supabase (auth emails) and via Resend (transactional emails)

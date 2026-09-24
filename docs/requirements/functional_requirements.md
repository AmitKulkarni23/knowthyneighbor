# Functional Requirements — KnowThyNeighbor

## 1. Authentication

- Users sign up and log in via magic link (email-based, no passwords)
- On first login, the user is prompted to create their profile
- A user who receives a partner invite link is authenticated and auto-joined to the existing couple profile

## 2. Profile

- Each user creates an individual profile with:
  - Full name
  - Age
  - Ethnicity
  - Has kids (yes/no) and number of kids
  - Profile photo (optional)
- Age is **immutable** after initial entry — cannot be edited
- No street address is ever collected or stored

## 3. Couple Profile

- One user creates the couple profile after completing their individual profile
- The creator can invite their partner via email (magic link)
- The couple profile includes:
  - Couple display name (optional, e.g., "The Patels")
  - Short bio
  - Zip code (used for geolocation — only the zip centroid lat/lng is stored)
  - Hosting preference: host, visit, or both
- Zip code can be updated (people move), but age cannot
- A couple is always exactly two people (no solo users, no groups in MVP)

## 4. Availability

- Couples set their calendar availability:
  - Day of week (recurring) or specific dates
  - Time slot: brunch, lunch, or dinner
- Availability is visible to other couples during discovery

## 5. Discovery & Search

- Discovery is **filter-based browsing**, not keyword search
- All results are restricted to a **hard-capped 15-mile radius** from the user's zip code centroid
- Users cannot adjust the radius (fixed at 15 miles for MVP)
- Available filters:
  - Has kids / No kids
  - Ethnicity
  - Meal type (brunch, lunch, dinner)
  - Hosting preference (hosts only, visitors only, or both)
  - Availability overlap with the user's own calendar
- Results are sorted by **distance** (closest first)
- Search results show **approximate distance only** (e.g., "2.3 miles away") — never an address or precise location

## 6. Join Requests

- When a visiting couple finds a hosting couple they'd like to meet, they send a **join request**
- The join request includes:
  - Preferred meal type (brunch, lunch, dinner)
  - Optional short message (e.g., "We love Thai food and have a 3-year-old!")
- The host couple receives an **email notification** about the join request
- The host couple can **accept** or **decline** the request
- Accepting a request opens a chat conversation between the two couples
- Declining notifies the requester (in-app only, no email)

## 7. Messaging

- Chat is available **only after a join request is accepted** — no unsolicited messaging
- Chat is a simple text-based interface between two couples
- Messages are delivered in real-time when both parties are online
- When a user opens a chat, message history is loaded from the database
- Messages are stored by the service with a **30-day retention policy** after a meal is completed or cancelled
- Chat is a coordination tool to plan the meal, not a general messaging platform

## 8. Meals

- Either couple can propose a meal from within the chat
- A meal proposal includes:
  - Meal type (brunch, lunch, dinner)
  - Proposed date and time
  - Which couple is hosting
- The other couple can accept or decline the proposal
- Meal statuses: proposed → confirmed → completed / cancelled
- Once a meal is completed, the conversation and messages are retained for 30 days, then purged

## 9. Privacy & Safety

- **No street address is ever collected, stored, or displayed by the service**
- Only the user's zip code is collected; it is geocoded to a centroid lat/lng for proximity search
- The UI explicitly states:
  > "We only ask for your zip code to find couples near you. We never ask for or store your home address. Share your address only when you're ready, directly in chat, after you've done your own due diligence on who you're inviting home."
- Host couples share their address **manually via chat** at their own discretion
- Discovery results show approximate distance, never coordinates or location details

## 10. Email Notifications

- Email is sent **only** for join requests — when a couple wants to be hosted
- No email notifications for chat messages
- No email notifications for meal proposals (those are in-app via chat)
- Email is delivered via a transactional email service (Resend or SendGrid)

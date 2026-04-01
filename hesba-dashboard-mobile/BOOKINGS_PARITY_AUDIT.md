# Bookings Parity Audit

Last updated: March 9, 2026  
Owner: Engineering  
Web Reference: `zayna-dashboard`  
Mobile Target: `zayna-dashboard-mobile`  
Backend Source of Truth: `zayna-backend-v1`

## 1) Objective

Bring the mobile `Bookings` module to **professional operational parity** with the web dashboard while preserving a **mobile-first user experience**.

The goal is not to copy the web bookings module visually.  
The goal is to ensure the user can manage bookings from mobile with the same business confidence and most of the same operational power.

---

## 2) Executive Summary

### Current Situation

The web bookings module is already broad and mature. It includes:

- bookings list
- stats
- filters
- booking details
- create booking
- edit booking
- cancel action
- no-show action
- payment action
- invoice access
- calendar view
- guest booking flow

The mobile bookings module currently includes:

- bookings list
- booking details route
- create booking route
- bookings API layer

### Main Conclusion

The mobile bookings module is a **good foundation**, but it is still **partial parity**.

The highest-value missing pieces are:

1. full action parity on booking details
2. stronger filter/search parity
3. edit booking parity
4. payment flow parity
5. cancel/no-show operational parity
6. mobile-appropriate calendar/agenda experience
7. stricter backend DTO alignment

### Strategic Decision

Bookings should be the **first major parity-completion module** in mobile because it is:

- the operational core of the product
- used daily
- dependent on clients/services/staff, which makes it a good integration driver
- the clearest proof that mobile is becoming a real admin tool, not only a companion app

---

## 3) Reference Inventory

## 3.1 Web Reference Files

Key web routes and components identified:

- bookings list page
- booking details page
- booking edit page
- booking create page
- guest booking page
- booking calendar page
- booking invoice page

Key web components identified:

- `BookingsClient`
- `BookingsTable`
- `BookingDetailsClient`
- `BookingForm`
- `BookingCalendarClient`
- `PaymentDialog`
- `CancelDialog`
- `NoShowDialog`
- `BookingInvoiceClient`

Key web data layer identified:

- `src/lib/api/services/bookings.ts`
- `src/lib/api/hooks/use-bookings.ts`

## 3.2 Mobile Reference Files

Current mobile bookings files identified:

- `src/app/(client)/bookings/index.tsx`
- `src/app/(client)/bookings/[id].tsx`
- `src/app/(client)/bookings/new.tsx`
- `src/lib/api/bookings.api.ts`
- `src/i18n/locales/ar/bookings.json`
- `src/i18n/locales/en/bookings.json`

## 3.3 Backend Reference Files

Key backend booking sources identified:

- `src/modules/bookings/bookings.controller.ts`
- `src/modules/bookings/bookings.service.ts`
- `src/modules/bookings/calendar/calendar.controller.ts`
- `src/modules/bookings/dto/create-booking.dto.ts`
- `src/modules/bookings/dto/update-booking.dto.ts`
- `src/modules/bookings/dto/search-bookings.dto.ts`
- `src/modules/bookings/dto/record-payment.dto.ts`
- `src/modules/bookings/dto/cancel-booking.dto.ts`

---

## 4) Business Scope of Bookings

The `Bookings` module is responsible for the full lifecycle of appointments:

- listing bookings
- searching and filtering bookings
- viewing booking details
- creating a booking
- updating a booking
- confirming a booking
- starting a booking
- completing a booking
- cancelling a booking
- marking a booking as no-show
- recording payments
- viewing invoice data
- viewing booking calendar/agenda data

### Related Dependencies

Bookings depends directly on:

- clients
- services
- staff
- payments
- calendar
- invoice data

Because of that, the bookings module should be treated as a **composed orchestration module**, not a simple CRUD screen set.

---

## 5) Current Parity Assessment

## 5.1 Functional Comparison

| Capability | Web | Mobile | Status | Notes |
|---|---|---|---|---|
| List bookings | Yes | Yes | Partial | mobile list exists, but filter depth is lighter |
| Search bookings | Yes | Yes | Partial | current mobile search exists, but needs debounce/filter expansion |
| Status tabs | Yes | Yes | Partial | present, but not full parity yet |
| Stats summary | Yes | Not clearly surfaced | Missing | mobile list screen lacks web-equivalent stats layer |
| View details | Yes | Route exists | Partial | needs action parity and UX verification |
| Create booking | Yes | Yes | Partial | good wizard start, but needs stricter validation and draft behavior |
| Edit booking | Yes | Not confirmed | Missing | must be implemented |
| Confirm booking | Yes | API exists | Partial | needs detail-screen UI integration |
| Start booking | Yes | API exists | Partial | needs detail-screen UI integration |
| Complete booking | Yes | API exists | Partial | needs detail-screen UI integration |
| Cancel booking | Yes | API exists | Partial | mobile API is under-specified vs backend DTO |
| Mark no-show | Yes | API exists | Partial | needs UI flow |
| Record payment | Yes | API exists | Partial | mobile payload is under-specified vs backend DTO |
| Invoice access | Yes | API exists | Missing | mobile UI not established |
| Calendar view | Yes | Calendar API exists | Missing | no mobile agenda/calendar UX confirmed |
| Guest booking | Yes | No | Missing | decide if required for admin mobile parity |

## 5.2 Architecture Assessment

### Strengths in Mobile

- there is already a dedicated bookings API service
- list screen has mobile-aware card layout
- create screen is already mobile-oriented and not a web clone
- mobile already uses query-based data access

### Gaps in Mobile

- actions are not fully composed into one reusable bookings feature layer
- DTO alignment is incomplete in some mutations
- no obvious reusable bookings-specific hooks layer yet
- current implementation appears screen-first, not feature-layer-first
- list/detail/create do not yet show a complete state machine flow

---

## 6) Critical Contract Gaps

These gaps are important because they affect correctness, not just UI polish.

## 6.1 Create Booking Contract

### Backend

Backend `CreateBookingDto` expects:

- `clientId`
- `serviceId`
- `startTime`
- optional `addOnIds`
- optional `clientNotes`
- optional `source`
- optional `staffId`

### Web / Mobile Current Pattern

Web and mobile currently use a frontend request shape that includes:

- `serviceIds[]`
- `bookingDate`
- `startTime`

Then they map to backend payload.

### Decision

Keep the frontend-friendly request type if helpful, but centralize the mapping in the API layer only.  
No screen should manually reshape this contract.

## 6.2 Update Booking Contract

### Backend

Backend `UpdateBookingDto` accepts:

- optional `serviceId`
- optional `staffMemberId`
- optional `staffNotes`
- inherited optional booking fields from create DTO except `clientId`

### Risk

The frontend naming is inconsistent between:

- `staffId`
- `staffMemberId`
- date/start fields

### Decision

Create a single mobile adapter function for update payloads so screen code never has to remember backend naming details.

## 6.3 Cancel Booking Contract

### Backend

`CancelBookingDto` expects:

- `reason` required
- `cancelledBy` required
- optional `isAdmin`
- optional `metadata`

### Current Mobile Risk

Current mobile API only sends:

- `reason`

This is **not full DTO parity**.

### Decision

The mobile bookings cancellation flow must be updated so it can send the required backend shape or use a backend-supported server-side default if the backend is intentionally deriving `cancelledBy`.

This must be verified before marking cancel flow complete.

## 6.4 Payment Contract

### Backend

`BookingRecordPaymentDto` expects:

- `amount`
- `paymentMethod`
- `receivedBy`
- optional `transactionRef`
- optional `receiptNumber`
- optional `transactionId`
- optional `notes`

### Current Mobile Risk

Current mobile API sends only:

- `amount`
- `paymentMethod`
- optional `notes`

This is **not full DTO parity**.

### Decision

Mobile payment flow must explicitly resolve:

- who is `receivedBy`
- which fields are hidden/defaulted
- how payment methods map to backend enum

Without this, payment parity is incomplete.

---

## 7) Target Mobile Architecture for Bookings

The bookings module should move toward a dedicated feature architecture.

## 7.1 Target Feature Structure

```text
src/features/bookings/
  api/
    bookings.api.ts
    bookings.adapters.ts
    bookings.keys.ts
  hooks/
    use-bookings-list.ts
    use-booking-detail.ts
    use-booking-actions.ts
    use-booking-form.ts
    use-booking-calendar.ts
  types/
    bookings.types.ts
    bookings.filters.ts
    bookings.forms.ts
  components/
    BookingCard.tsx
    BookingStatusTabs.tsx
    BookingFiltersSheet.tsx
    BookingStatsStrip.tsx
    BookingActionSheet.tsx
    BookingDetailsSection.tsx
    BookingPaymentForm.tsx
    BookingCancelForm.tsx
    BookingNoShowConfirm.tsx
    BookingSlotPicker.tsx
    BookingFormStep.tsx
  screens/
    BookingsListScreen.tsx
    BookingDetailsScreen.tsx
    BookingCreateScreen.tsx
    BookingEditScreen.tsx
    BookingPaymentScreen.tsx
    BookingAgendaScreen.tsx
  utils/
    bookings.formatters.ts
    bookings.permissions.ts
    bookings.validation.ts
```

### Why This Structure

- isolates booking complexity
- avoids repeating action logic across screens
- makes clients/services/staff lookup integration easier
- supports future parity without rewriting screens

---

## 8) Screen Plan

## 8.1 Bookings List Screen

### Goal

Allow fast browsing, filtering, and entry into booking operations.

### Required Features

- search
- status tabs
- filter sheet
- pull-to-refresh
- paginated / infinite list
- optional stats strip
- CTA for new booking

### Mobile UX Recommendation

Use:

- horizontal status chips/tabs
- compact filter button opening a bottom sheet
- booking cards with:
  - client
  - service
  - time/date
  - status
  - payment state
  - total amount

### Key Components

- `BookingStatusTabs`
- `BookingFiltersSheet`
- `BookingCard`
- `BookingStatsStrip`

### Performance Notes

- virtualized list required
- debounce search input
- avoid refetching entire list on every keystroke

## 8.2 Booking Details Screen

### Goal

Provide a complete operational view of one booking and all relevant actions.

### Required Features

- core booking summary
- client info
- service info
- staff info
- payment summary
- notes
- status badge
- status-based actions
- invoice entry point

### Mobile UX Recommendation

Use:

- stacked information sections
- persistent action area or action sheet
- only show context-valid actions for current status

### Required Actions

- confirm
- start
- complete
- cancel
- no-show
- edit
- payment
- invoice view

### Important Design Rule

Avoid showing all actions equally.  
Primary action should follow booking status.

## 8.3 Booking Create Screen

### Goal

Make booking creation fast, safe, and easy on mobile.

### Required Features

- client selection
- service selection
- date selection
- slot selection
- optional staff selection
- notes
- submission

### Current Mobile Assessment

The current step-based create flow is directionally strong and should be preserved.

### Improvements Needed

- stronger validation
- draft persistence
- better slot invalidation when service/date/staff changes
- explicit empty/error states for slot loading
- keyboard-safe notes behavior
- reusable form-step primitives

## 8.4 Booking Edit Screen

### Goal

Allow professional rescheduling and data updates.

### Required Features

- load current booking state
- allow editable fields based on business rules
- preserve invalidation logic
- re-fetch available slots when relevant fields change

### Mobile UX Recommendation

Reuse the create flow structure with edit-aware defaults and change indicators.

## 8.5 Booking Payment Screen / Flow

### Goal

Allow payment recording in a focused, low-error mobile experience.

### Required Features

- amount
- payment method
- received by
- optional transaction/receipt fields
- optional notes
- summary of current due/paid state

### Mobile UX Recommendation

Use a focused modal or full screen form, not a tiny dialog clone.

### Keyboard Requirements

- amount uses decimal keyboard
- text fields use appropriate capitalization and auto-correct settings

## 8.6 Booking Agenda / Calendar Screen

### Goal

Provide a mobile-suitable calendar experience.

### Recommendation

Do **not** port the desktop calendar literally.

Instead prioritize:

1. agenda view
2. day view
3. week summary

Month view can be secondary if it hurts readability.

### Best Mobile Pattern

- date header
- day agenda cards
- staff filter
- quick jump to today / next / previous day

---

## 9) Key Components

## 9.1 Shared Domain Components

- `BookingCard`
- `BookingStatusBadge`
- `BookingSummaryCard`
- `BookingMetaSection`
- `BookingPaymentSummary`
- `BookingClientSection`
- `BookingServiceSection`

## 9.2 Action Components

- `BookingActionSheet`
- `CancelBookingSheet`
- `NoShowConfirmDialog`
- `RecordPaymentSheet`
- `BookingStatusActionBar`

## 9.3 Form Components

- `BookingClientPicker`
- `BookingServicePicker`
- `BookingStaffPicker`
- `BookingDatePicker`
- `BookingSlotPicker`
- `BookingNotesInput`

## 9.4 Support Components

- `BookingFiltersSheet`
- `BookingStatsStrip`
- `BookingListEmptyState`
- `BookingListErrorState`
- `BookingDetailSkeleton`

---

## 10) Data Structures

These structures should be normalized for the mobile feature layer.

## 10.1 BookingListItem

Used in lists only.

```ts
type BookingListItem = {
  id: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  totalAmount: number;
  isPaid: boolean;
  client: {
    id: string;
    fullName: string;
    phone?: string;
  } | null;
  primaryService: {
    id: string;
    name: string;
  } | null;
  staff: {
    id: string;
    name: string;
  } | null;
};
```

## 10.2 BookingDetailsViewModel

Used in details screen.

```ts
type BookingDetailsViewModel = {
  id: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  source?: string;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  isPaid: boolean;
  clientNotes?: string;
  staffNotes?: string;
  client: ClientSummary | null;
  service: ServiceSummary | null;
  staff: StaffSummary | null;
  payments: PaymentSummary[];
};
```

## 10.3 BookingFilters

```ts
type BookingFilters = {
  page: number;
  limit: number;
  search?: string;
  status?: BookingStatus;
  clientId?: string;
  serviceId?: string;
  staffMemberId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  isPaid?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
```

### Note

Keep filter naming aligned with backend where possible.  
If the UI uses friendlier names, adapt once in the API adapter layer.

## 10.4 BookingCreateFormState

```ts
type BookingCreateFormState = {
  clientId: string | null;
  serviceId: string | null;
  staffId: string | null;
  bookingDate: string | null;
  slotTime: string | null;
  clientNotes: string;
  source: 'ADMIN' | 'PHONE' | 'WHATSAPP' | 'WALK_IN';
};
```

## 10.5 RecordPaymentFormState

```ts
type RecordPaymentFormState = {
  amount: string;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  receiptNumber?: string;
  transactionId?: string;
  transactionRef?: string;
  notes?: string;
};
```

---

## 11) Algorithms and Interaction Logic

## 11.1 Search Algorithm

### Goal

Fast booking lookup without overfetching.

### Plan

- local input state
- debounce `300–500ms`
- query refetch only after debounce
- reset page when search changes

### Reason

Prevents network noise and improves perceived responsiveness.

## 11.2 Slot Fetching Algorithm

### Goal

Return valid slots based on selected booking parameters.

### Trigger Conditions

Fetch available slots only when:

- service is selected
- date is selected
- optionally staff changes

### Rules

- clear selected slot when date/service/staff changes
- show loading state during refetch
- disable submit until a valid slot is selected
- guard against stale slot selection

## 11.3 Status Action Resolution

### Goal

Show only valid booking actions for the current state.

### State Machine Recommendation

```ts
PENDING     -> confirm | cancel | no-show
CONFIRMED   -> start | payment | cancel | no-show | edit
IN_PROGRESS -> complete | payment
COMPLETED   -> invoice | payment-history
CANCELLED   -> view-only
NO_SHOW     -> view-only
```

### Reason

Prevents invalid actions and keeps the screen clean.

## 11.4 Query Invalidation Algorithm

After any booking mutation, invalidate only what is necessary.

### Required Invalidations

- bookings lists
- booking detail
- booking stats
- calendar/agenda related queries

### Conditional Invalidations

- client detail queries if booking affects client stats/history
- accounting/invoice queries if payment affects financial state

## 11.5 Pagination Strategy

### Recommendation

Use infinite scrolling for mobile lists.

### Rules

- keep page size modest
- preserve scroll performance
- show footer loader
- stop fetching when `hasMore` is false

---

## 12) Keyboard and Form UX Requirements

This section is critical for the mobile bookings module.

## 12.1 General Rules

- all forms must remain usable while keyboard is open
- submit button must remain reachable
- focus order must be intentional
- dismiss keyboard on outside tap where appropriate
- multiline notes should not collapse usability

## 12.2 Input Rules

### Search

- search inputs use search-oriented return key
- debounce requests

### Amount

- decimal keyboard
- sanitize display vs numeric payload

### Notes

- multiline input
- controlled max length
- scroll-friendly container

### Optional Text Fields

- no aggressive auto-correct for IDs/transaction fields

## 12.3 Recommended Layout Pattern

For create/edit/payment flows:

- `KeyboardAvoidingView`
- internal scroll container
- sticky or bottom-safe submit section
- field grouping by task

---

## 13) Performance and Scalability Plan

## 13.1 Performance

Required:

- virtualized booking lists
- memoized card components
- exact query keys
- debounced search
- do not fetch unnecessary lookup lists repeatedly
- prefetch detail data on likely navigation if useful

## 13.2 Scalability

The bookings module should scale by:

- isolating data adapters
- isolating hooks by concern
- keeping screen components thin
- keeping action logic reusable
- allowing later support for:
  - multi-service bookings
  - richer payment histories
  - more advanced calendar views

## 13.3 Maintainability

Use:

- one bookings feature folder
- one place for query keys
- one place for request adapters
- one place for validation
- one place for action visibility rules

---

## 14) Implementation Plan

## Phase A — Contract Hardening

### Tasks

- audit all booking request/response types in mobile
- fix create/update payload adapters
- fix cancel payload shape
- fix payment payload shape
- align filter names with backend

### Done When

- mobile bookings API layer is contract-safe

## Phase B — Feature Layer Refactor

### Tasks

- extract bookings feature folder
- move shared booking components out of route files
- introduce query key helpers
- introduce adapters and action resolvers

### Done When

- route files become thin screen entry points

## Phase C — List Parity

### Tasks

- add stats strip
- add proper filter sheet
- improve search behavior
- improve pagination strategy
- align states with web capabilities

### Done When

- mobile list becomes the operational entry point for bookings

## Phase D — Details Parity

### Tasks

- implement status-driven action area
- implement payment entry point
- implement cancel/no-show flows
- implement invoice entry point
- improve detail sections

### Done When

- user can manage a booking from details screen without switching to web

## Phase E — Create/Edit Parity

### Tasks

- harden create flow
- add edit flow
- share form logic
- add slot refresh guards
- add draft persistence if needed

### Done When

- create/edit workflows are reliable and professional on mobile

## Phase F — Calendar/Agenda Parity

### Tasks

- implement agenda/day-first mobile calendar screen
- add date navigation
- add optional staff filter
- add link from list and details

### Done When

- mobile users can inspect schedule efficiently without desktop UI patterns

## Phase G — Polish and QA

### Tasks

- translations parity
- RTL/LTR review
- Android/iOS review
- loading/empty/error review
- destructive action confirmation review

### Done When

- bookings module is production-grade from mobile UX and contract perspectives

---

## 15) Recommended Build Order

Build in this exact order:

1. API contract hardening
2. bookings query keys + hooks
3. list screen parity
4. details screen parity
5. payment/cancel/no-show flows
6. edit booking flow
7. agenda/day calendar flow
8. QA and polish

---

## 16) Definition of Done

Bookings parity is complete only when:

1. booking list is operationally strong on mobile
2. booking details supports all valid booking actions
3. create and edit flows are both stable
4. cancel and payment payloads are backend-safe
5. no-show flow works from mobile
6. invoice access is available where needed
7. calendar/agenda access is mobile-appropriate
8. keyboard and form UX are polished
9. Android and iOS behavior are acceptable
10. the user can manage bookings professionally from mobile without relying on the web for normal daily work

---

## 17) Immediate Next Action

The next engineering step should be:

### `Bookings Contract Hardening`

Specifically:

1. verify `cancelledBy` handling in cancel flow
2. verify `receivedBy` handling in payment flow
3. normalize update payload naming (`staffId` vs `staffMemberId`)
4. centralize booking adapters in the mobile API layer

Only after that should UI parity work continue, so the module grows on a correct contract foundation.

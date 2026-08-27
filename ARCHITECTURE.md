# Doves Event Management System — Architecture Design

## 1. Overview

Doves is a full event-production platform: inquiries convert into signed orders, orders are classified by profile level, staffed with teams and vehicles, equipped via a stores/inventory department and BOQ-driven procurement, executed, and closed out with sign-off documentation.

Built with **Django REST Framework + PostgreSQL**, hosted independently (Railway) as a new project.

## 2. User roles

| Role | Access |
|---|---|
| Admin | Full system access, user management, all events |
| Event planner / project manager | Manage inquiries, orders, staffing, BOQs, budgets |
| Storekeeper | Manage stores inventory, stock-in/stock-out, product catalog |
| Accounts | Process requisitions, approve purchases, manage payments |
| Team leader | View assigned event, log comments, confirm equipment/return sheet |
| Vendor | View own bookings, upload documents, update availability |
| Client | View their event, guest list, budget summary, sign order |

## 3. Order-to-execution lifecycle

```
Inquiry → Order (signed in, approved)
        → BOQ created (by planner/manager, post-approval)
        → Stock check per BOQ item:
            in stock  → deducted from inventory
            out of stock → listed as requested → Requisition → Accounts → stock/budget updated
        → Staffing (teams, vehicles) + equipment dispatch (incl. additionals)
        → Execution
        → Completion (comments, return/dismantling sheet)
        → Status: pending → processed → done
```

## 4. Stores / inventory management

### 4.1 Store window (product catalog)
- Every item categorized by: **branding**, **equipment type**, **returnable / non-returnable**, and current **availability**
- Availability computed as `quantity_total - quantity_in_use - quantity_under_maintenance`
- Non-returnable items (consumables) don't return to stock after an event; returnable items (rigging, sound gear) flow back through the return/dismantling sheet

### 4.2 Stock movement records
- **Stock-in**: every purchase/goods-received record — supplier, quantity, unit cost, date, received-by
- **Stock-out**: every time an item leaves stores — linked to an event/BOQ, quantity, taken-by, date, expected-return date (for returnables)
- This pairing gives a full audit trail: what came in, what went out, who took it, and for which event

### 4.3 Inventory analytics
- Most/least used items — derived from stock-out frequency over a period
- Low-stock alerts — flagged when `availability` drops below a per-item reorder threshold
- Utilization reports feed into the reporting phase (final build phase)

## 5. Bill of Quantities (BOQ)

- BOQ created by a project/event manager **only after the order is approved** — enforced as a status gate, not just a UI convention
- Each BOQ line item is checked against store availability at creation time:
  - **Available** → deducted from inventory immediately, linked as a stock-out record
  - **Not available** → line item marked **requested** rather than deducted, and feeds into a requisition
- A BOQ can be a mix of stock-deducted and requested items

## 6. Requisitions

- Requisitions are raised two ways:
  - **Automatically** from an unavailable BOQ item (equipment shortfall)
  - **Manually** by a planner/team leader for anything not on the BOQ — food, transport, fuel, site-purchased tools/consumables, or any other on-the-day expense
- Every requisition carries a **category** (equipment, food, transport, site purchase, other) so accounts can report on spend type, not just approve/reject
- Manual requisitions link to an **event** but not necessarily a BOQ item; BOQ-triggered ones link to both
- Routed to the **accounts department** for approval and processing
- Once accounts marks a requisition processed, the system updates:
  - Stock-in records (if the requisition was for equipment received into stores)
  - BOQ item status (requested → fulfilled), when linked to a BOQ item
  - Budget/payment records (cost of the purchase), always — this is what keeps the event budget accurate even for off-BOQ spend like food or transport

## 7. Logistics: team, vehicle setup and live tracking

### 7.1 Team and vehicle setup for an event
- A planner assigns one or more **teams** to an event (`EventTeamAssignment`), and separately selects an **available vehicle** with a **driver** (`Vehicle` / `VehicleAssignment`)
- The driver is typically a `Staff` member with a driver role, but doesn't have to belong to the assigned team — vehicles and teams are chosen independently and linked only through the event
- Creating a `VehicleAssignment` automatically creates a linked **Trip** record, which is what live tracking hangs off
- **Decided:** a driver may only have **one active (`en_route`) trip at a time** — the server rejects starting a new trip while another is still active. This keeps location pings unambiguous and matches the trip-scoped tracking model in §7.2/7.3.

### 7.2 Live GPS tracking
- Tracking is **trip-scoped, not person-scoped**: the driver's phone only reports location while their trip is active (`en_route`), started by the driver themselves from their portal — never a background always-on tracker. This matters both for driver privacy and phone battery
- While active, the driver's phone (a browser-based PWA screen, not a separate native app) sends periodic location pings — e.g. every 15–30 seconds — using the browser's Geolocation API
- Each ping is stored (`LocationPing`), building a full route history per trip, useful later for ETA calculation or dispute resolution ("were they actually on site by X time")
- **Viewing is on-demand**, per the confirmed approach — a planner/admin opens the map for a specific trip when they want to check it, rather than a permanently-open live dashboard.
- **Decided:** start with **polling**. The map view calls `GET /api/trips/{id}/location/latest` every few seconds while open, and stops calling when closed. No extra infrastructure beyond what's already planned. Django Channels + a Redis channel layer remains a documented upgrade path if push-based updates are wanted later, but is out of scope for the initial build — the ping data model is identical either way, so the swap doesn't require a data model change.

### 7.3 Privacy and reliability
- Location is only ever collected within the bounds of an active trip; a `Trip` model tracks `started_at`/`ended_at` explicitly, and pings outside that window are rejected server-side
- Drivers see a clear on-screen indicator that tracking is active, and can end the trip themselves (not just have it timed out silently)
- Handle gaps gracefully — phones lose signal or lock; the map shows "last seen X minutes ago" rather than silently freezing on a stale pin

## 8. Office management calendar

- Calendar view showing all tasks assigned to staff on their scheduled date cells
- Aggregates from existing scheduling data rather than duplicating it: `Task` due dates, `EventTeamAssignment` call times, `VehicleAssignment` dispatch/return times
- Filterable by staff member, team, or event — gives a single "who's doing what, when" view for office management, not just per-event views

## 9. Policies / guidance

Policies have two modes, both driven by the same tagging (client type, event type, classification):

- **Advisory** — surfaced as suggestions when a planner creates an order or BOQ for a matching client/event type, e.g. a policy tagged "corporate + high-profile" shows relevant guidance automatically
- **Enforced** — a policy can be flagged `requires_approval`, naming which workflow gate it applies to (order approval, BOQ creation, or requisition processing) and which role must sign off (typically admin). When a matching event/order hits that gate, the system blocks progression until someone with the required role explicitly approves it — this is a hard gate, not just a visible reminder
- Example: a policy "high-profile client → requires admin approval before order sign-in" would stop a planner from moving the order to `signed` on their own; the system records who approved it and when

Kept as structured content (not a separate wiki) so it can be queried, suggested, and enforced contextually within the same workflow.

## 10. Data model (Django models, core entities)

```python
# users / auth — roles via Django Groups
User(AbstractUser)

# inquiries & orders
Inquiry(client_name, contact, event_type, date_requested, budget_range, status, notes)
Order(inquiry=FK(null=True), event=OneToOne, signed_by, signed_at, order_status, approved_by, approved_at)

# core event
Event(name, type, client=FK(User), planner=FK(User), date_start, date_end, venue,
      classification, event_status)

# --- stores / inventory ---
Product(name, brand, equipment_type, category, returnable, quantity_total,
        reorder_threshold, notes)
StockIn(product=FK, quantity, unit_cost, supplier, received_by=FK(User), date)
StockOut(product=FK, quantity, event=FK(Event, null=True), taken_by=FK(User), date,
         expected_return_date, returned=bool)

# --- BOQ & requisitions ---
BOQ(event=OneToOne(Order), created_by=FK(User), created_at)
BOQItem(boq=FK, product=FK, quantity_requested, status[stock_deducted|requested|fulfilled])
Requisition(event=FK(Event), boq_item=FK(null=True), category[equipment|food|transport|site_purchase|other],
            description, amount_estimate, raised_by=FK(User), status[pending|approved|rejected|processed],
            processed_by=FK(User, null=True), processed_at)

# vendors
Vendor(name, category, contact_email, contact_phone, notes)
EventVendor(event=FK, vendor=FK, agreed_price, deposit_paid, contract_status, contract_doc)

# budget
BudgetItem(event=FK, category, planned_amount, actual_amount)
Payment(event=FK, type, amount, date, method, reference)

# guests
Guest(event=FK, name, email, phone, rsvp_status, dietary_notes, table_no)
Task(event=FK, title, due_date, owner=FK(User), status)

# staffing
Staff(name, role, contact, active)
Team(name, leader=FK(Staff))
TeamMember(team=FK, staff=FK)
EventTeamAssignment(event=FK, team=FK, call_time, role_on_site)

# vehicles
Vehicle(plate_no, type, capacity, status)
VehicleAssignment(event=FK, vehicle=FK, driver=FK(Staff), dispatch_time, return_time)

# logistics / live tracking
Trip(vehicle_assignment=OneToOne(VehicleAssignment), status[scheduled|en_route|arrived|returning|completed],
     started_at, ended_at)
LocationPing(trip=FK, latitude, longitude, accuracy, recorded_at)

# completion
EventComment(event=FK, author=FK(User), comment, created_at)
ReturnSheet(event=OneToOne, items_returned=JSONField, damages_notes, dismantled_by,
            dismantle_date, signed_off_by, doc_file)

# policies
Policy(title, client_type, event_type, classification, content,
       requires_approval, approval_gate[order_approval|boq_creation|requisition_processing],
       approver_role)
PolicyApproval(policy=FK, event=FK, approved_by=FK(User), approved_at)

Document(event=FK, type, file, generated_at)
Notification(user=FK, message, read, created_at)
```

Note: `EquipmentDispatch` from earlier drafts is superseded by `StockOut` (linked to `Product`), since stores now tracks all movement, not just per-event dispatch — the "additionals" concept becomes simply another `StockOut` record against the same event after the initial dispatch.

## 11. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Django + Django REST Framework | Models, serializers, viewsets |
| Database | PostgreSQL | `JSONField`, native Django Postgres integration |
| Auth | `djangorestframework-simplejwt` | JWT tokens; Django Groups map to roles incl. Storekeeper, Accounts |
| Admin/back-office | Django admin | Product catalog, staff/vehicle directories, requisition review |
| Frontend | React + Vite | Admin dashboard, client portal, team-leader mobile view, office calendar view |
| PDF generation | WeasyPrint or ReportLab | Contracts, invoices, return/dismantling sheets |
| File storage | `django-storages` → S3-compatible bucket | Contracts, return sheets, guest CSVs |
| Background jobs | Celery + Redis | Low-stock alerts, reminder emails/SMS, PDF generation |
| Calendar | FullCalendar (React) consuming a `/api/calendar/` aggregation endpoint | Combines Task, EventTeamAssignment, VehicleAssignment by date |
| Live map | Leaflet (with OpenStreetMap tiles) or Mapbox GL JS | Driver's browser Geolocation API sends pings; map renders latest position + route history |
| Real-time (future upgrade) | Django Channels + Redis channel layer | Push-based live updates for the map view; not part of initial build — polling ships first (see §7.2) |
| Hosting | **Railway** | Python + Postgres, minimal ops overhead — decided (see §15) |

## 12. API structure (high level)

```
/api/inquiries/                  CRUD, convert-to-order
/api/orders/                     sign-in, approve, status transitions
/api/events/                     CRUD, classification, event_status transitions
/api/products/                   store catalog CRUD, availability, low-stock list
/api/stock-in/                   record purchases
/api/stock-out/                  record item movement, mark returned
/api/boqs/                       create (post order-approval), list items, status
/api/requisitions/                raise (manual or BOQ-linked, with category), list, approve/reject/process (accounts-only)
/api/events/{id}/vendors/        assign/unassign vendors
/api/events/{id}/budget/         budget items, totals
/api/events/{id}/payments/       record payments
/api/events/{id}/guests/         guest CRUD, bulk import, RSVP
/api/events/{id}/teams/          assign teams, set team leader
/api/events/{id}/vehicles/       assign vehicle, log dispatch/return
/api/trips/{id}/start/           driver starts a trip (from their portal); rejected if driver has another trip already en_route
/api/trips/{id}/end/             driver ends a trip
/api/trips/{id}/location/        driver app posts a location ping (only while trip is active)
/api/trips/{id}/location/latest/ latest known position, for map polling
/ws/trips/{id}/                  future upgrade only: live push channel for the map view (Django Channels) — not part of initial build
/api/events/{id}/comments/       post/list comments
/api/events/{id}/return-sheet/   generate/view return-dismantling sheet
/api/staff/, /api/teams/         staff and team directory CRUD
/api/vehicles/                   vehicle directory CRUD
/api/policies/                    CRUD, suggest-by-client-and-event-type, approve (records a PolicyApproval for a gated event)
/api/calendar/                   aggregated tasks/assignments by date
/api/notifications/              list, mark read
```

## 13. Security considerations

- DRF permission classes per viewset, keyed to Django Groups (including scoping requisition approval to Accounts only)
- BOQ creation blocked server-side unless the linked order's status is `approved`
- Any workflow gate (order approval, BOQ creation, requisition processing) with a matching `requires_approval` Policy is blocked server-side until a `PolicyApproval` exists for that event and gate — checked in the serializer/view, not left to the frontend to hide a button
- Stock deduction and requisition creation happen inside a single transaction per BOQ item to avoid race conditions on availability
- Team leaders scoped to their assigned events only
- Location pings only accepted server-side while the trip's `status` is `en_route` — reject pings outside an active trip window, and reject pings from any user other than that trip's assigned driver
- Only one active (`en_route`) trip permitted per driver at a time — enforced server-side on trip start
- Event classification (high/middle/low) changeable by **admin only**
- Return sheet sign-off required before an event moves to `processed`, and is signed off by the **team leader only**
- Order sign-in uses a confirmation click + timestamp (`signed_by`/`signed_at`) rather than a captured e-signature
- Audit trail (custom model or `django-auditlog`) on: stock movements, requisition approvals, classification changes, event status transitions

## 14. Suggested build phases

1. Django project setup, models, admin panel, auth (Groups + JWT)
2. Inquiry → Order flow + Event CRUD with classification
3. Stores: product catalog, stock-in/out, low-stock analytics
4. BOQ creation + stock-check logic + requisitions → accounts
5. Staffing: staff directory, teams, team-leader assignment, vehicle tracking
6. Logistics: trip lifecycle, driver location pings, on-demand live map (polling)
7. Comments + return/dismantling sheet + event status workflow
8. Vendor management + budget/invoicing
9. Guest management + RSVP portal
10. Office calendar (aggregated view) + policy suggestions
11. React frontend across all portals
12. Reporting (inventory usage, per-event P&L, staff/vehicle utilization)

## 15. Decisions (previously open questions)

| Question | Decision |
|---|---|
| Order sign-in: real digital signature or confirmation click/timestamp? | Confirmation click + timestamp (`signed_by`/`signed_at`); no captured e-signature |
| Who can change an event's classification (high/middle/low)? | **Admin only** |
| Who signs the return/dismantling sheet? | **Team leader only** |
| Live tracking: polling or Django Channels first? | **Polling first**; Channels remains a documented future upgrade, not in initial build |
| Can a driver have multiple trips in progress at once? | **No — one active (`en_route`) trip at a time**, enforced server-side |
| Hosting: Railway, Render, or Fly.io? | **Railway** |

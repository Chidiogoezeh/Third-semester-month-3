Naija Bite Restaurant ChatBot and Admin Dashboard

Naija Bite is a fully automated, mobile-responsive restaurant conversational chatbot built with Node.js, Express, Socket.io, and MongoDB. The system utilizes a device-bound Finite State Machine (FSM) to allow customers to seamlessly browse menus, manage a persistent shopping cart, and complete secure payments via Paystack without requiring a manual user login. It includes a web-based Administrative Dashboard for real-time CRUD menu configuration and live order monitoring.

- 1. System Architecture Overview

The codebase is split into decoupled, stateless components designed for immediate synchronization between administrative changes and live customer chat windows:

├── config/
│ ├── db.js # Mongoose / MongoDB automatic retry connection pipeline
│ └── paystack.js # Secure environment key validation and administrative secret gate
├── controllers/
│ ├── botController.js # Core Finite State Machine (FSM) routing conversational input
│ └── paymentController.js # Paystack gateway checkouts and secure cryptographic webhooks
├── models/
│ ├── Menu.js # Collection schema for dishes, category grouping, and soft deletes
│ ├── Order.js # State tracking for sales totals and idempotency fingerprints
│ └── Session.js # Persistent key-value device states, carts, and menu snapshots
├── public/
│ ├── css/style.css # Unified CSS variable matrix and responsive layout rules
│ ├── js/
│ │ ├── admin.js # Asynchronous DOM engine for CRUD operations and live order streams
│ │ ├── app.js # Client-side chatbot interface, session management, and fallback handler
│ │ └── socket-client.js # Clean abstraction layer for persistent WebSocket channels
│ ├── admin.html # Markup structure for the Administrative Management Dashboard
│ └── index.html # Main customer interface framework housing the responsive chat viewport
├── routes/
│ ├── api.js # Core API endpoint declarations and administrative secure gates
│ └── bot.js # Session identification and entry-point routing modules
├── utils/
│ └── helpers.js # Precision integer currency sanitizers and string formatters
└── server.js # Central system entry point binding HTTP, WebSockets, and API pipelines

- 2. Installation and Quickstart

- System Requirements

Node.js: v16.x or newer
MongoDB: Local Community Server instance or an Atlas cloud cluster
Paystack: Active Test or Production profile API keys

- Step 1: Environment Configuration Setup

Create a `.env` file in the root workspace directory and populate it with your specific operational credentials:

.env

- # Server Configuration

  PORT=3000
  APP_URL=http://localhost:3000

- # Database Configuration

  MONGO_URI=mongodb://127.0.0.1:27017/restaurant_chatbot

- # Paystack API Credentials

  PAYSTACK_SECRET_KEY=sk_test_your_exact_paystack_secret_key_here

- # Administrative Access Protection

  ADMIN_SECRET_KEY=SuperSecretAdminKey123

- Step 2: Install Project Dependencies

Execute the clean installations sequentially to pull down the project dependency tree:

npm install express mongoose socket.io axios dotenv crypto
npm install --save-dev nodemon

- Step 3: Populate Initial Menu Data

Execute the seed script. This automatically creates your database index structures, wipes any stale data, and pre-populates your standard dynamic categories (_Rice Dishes, Swallow & Soups, Drinks, etc._):

node seed.js

- Step 4: Launch the Server Cluster

Spin up the main application thread using Node or Nodemon:

node server.js

The application will launch on your configured workspace address: `http://localhost:3000`.

- 3. Core Chatbot Interaction and State Machine

The conversation layer runs on an atomic, multi-state system bound directly to individual client web layout nodes. Sessions are automatically recovered on reconnection without manual authentication gates.

                  ┌────────────────────────────────────────┐
                  │               IDLE STATE               │◄──────────────────────────────┐
                  └───────────┬────────────────┬───────────┘                               │
                              │                │                                           │
                    [Select 1]│                │[Select 99]                                │
                              ▼                ▼                                           │
         ┌──────────────────────┐    ┌────────────────────────────────────────┐            │
         │  AWAITING_CATEGORY   │    │            AWAITING_PAYMENT            │            │
         └────────────┬─────────┘    └───────────────────┬────────────────────┘            │
                      │                                  │                                 │
           [Select Category Code]                        │[Webhook / Success Callback]     │
                      ▼                                  ▼                                 │
         ┌──────────────────────┐    ┌────────────────────────────────────────┐            │
         │    AWAITING_ITEM     │    │        ORDER CONFIRMED STATUS          ├────────────┘
         └────────────┬─────────┘    └────────────────────────────────────────┘
                      │
             [Select Item Code]
                      ▼
         ┌──────────────────────┐
         │  AWAITING_QUANTITY   │
         └────────────┬─────────┘
                      │
               [Enter Quantity]
                      ▼
               (Auto Cart Push) ───► Loop back to AWAITING_CATEGORY Menu

- Global Commands Mapping

The chatbot monitors structural numeric arguments at any level of the idle flow to manipulate state tracking objects securely:

- **`1`**: Compiles an active category mapping layer pulled directly from the `Menu` collection. This creates an isolated, numeric temporary lookup snapshot on the user's document to safely process sub-menu inputs.
- **`97`**: Queries the `Session` schema to aggregate, compute, and format active order sub-totals, while appending unique dynamic removal codes (`7[key]`) for cart maintenance.
- **`98`**: Scans the long-term `Order` document index to output completed receipts with historical dates, quantities, and cash metrics.
- **`99`**: Begins checkout by calculating local weights, changing the session status, and returning a secure checkout string payload.
- **`0`**: Deletes all array elements from the current shopper's cart, wipes operational temporary snapshots, resets structural locks, and returns the user to the main entry layout.

- 4. Advanced Technical Implementation Features

- Secure Local Session Continuity

Instead of high-overhead traditional tracking engines, user identity is assigned using an encrypted browser local storage string (`bot_session`), initialized with a strict UUIDv4 verification pattern:

- javascript
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

If a user closes their window or experiences network drops during checkout, the Socket.io connection layer intercepts the `join-chat` pipeline. It automatically reads their state from MongoDB and provides a targeted context recovery instruction instead of breaking the flow.

- Cryptographic Double-Charge Prevention (Idempotency)

Selecting `99` creates a SHA-256 fingerprint token composed of the customer's unique device ID, the items array string, and the raw currency balance:

- javascript
  const itemPayloadFingerprint = crypto
  .createHash("sha256")
  .update(JSON.stringify(session.currentOrder.items) + session.currentOrder.total + session.deviceId)
  .digest("hex");

The database blocks duplicate transaction initialization requests matching an active token. If a consumer clicks a checkout link multiple times, the engine catches the duplicate lock, intercepts the query, and routes them to the original pending checkout process securely.

- Floating-Point Math Failure Isolation

To eliminate floating-point calculation errors native to JavaScript, all currency calculations are converted into safe integers (representing Nigerian Kobo values) via a precision anchoring algorithm before hitting database totals or the external Paystack API:

- javascript
  export const safeIntAmount = (amount) => Math.round((amount \* 100).toFixed(2));

- Clean Webhook Transitions and URL Sanitization

When a customer clicks the secure payment button, they are redirected to a temporary gateway route (`/api/pay-trigger`) which coordinates initialization calls with Paystack. Upon a successful transaction, Paystack fires an authenticated webhook back to `/api/paystack-webhook`, validating the transaction signature with an HMAC-SHA512 key check.

Once confirmed, the user is redirected back to the app with clear indicators. To prevent looping issues caused by browser reloads, `app.js` instantly strips payment tokens from the browser address bar using the HTML5 history manipulation engine:

- javascript
  window.history.replaceState({}, document.title, window.location.pathname);

- 5. Administrative Dashboard Architecture

The dashboard accessible via `admin.html` provides a real-time command portal for managing restaurant menus and active orders:

- Token-Gated Security Control: All operations modifying the database (`POST`, `PUT`, `DELETE`) pass through an explicit router gate (`adminSecureGate`), which cross-references incoming payloads against your encrypted `x-admin-secret` header.
- Cascading Soft Deletions: When an entire item category is dropped, the admin engine pulls up matching underlying identifiers and flags them as `isDeleted: true`. This prevents broken indexes for past customer orders while immediately removing the items from the active menu.
- Stateless UI Pipeline: The control deck reads active order data streams on an automated `10000ms` polling interval, sorting requests between **Pending Payment** and **Order Placed** categories cleanly.

- Contribution
  Follow best practices

License
MIT

Naija Bite Restaurant ChatBot & Admin Dashboard

Welcome to Naija Bite, a fully automated, mobile-responsive restaurant conversational chatbot built with Node.js, Express, Socket.io, and MongoDB. It allows users to browse menus categorized by Nigerian delicacies, place and schedule orders, view active carts or historical transactions, and complete payments seamlessly via Paystack. It also includes a web-based Admin Dashboard for full CRUD menu lifecycle control.

System Architecture Overview

The system features a decoupled component layout structured for state continuity and atomic real-time updates:

```
├── config/
│   ├── db.js                 # Mongoose / MongoDB core connection pipeline
│   └── paystack.js           # Production & Test credential matrix environments
├── controllers/
│   ├── botController.js      # Finite State Machine routing user commands
│   └── paymentController.js  # Paystack initialization and verification webhooks
├── models/
│   ├── Menu.js               # Persistence layer for menu items and pricing structures
│   ├── Order.js              # State definitions for orders and billing tracking
│   └── Session.js            # Key-value state registers map linked to specific devices
├── public/
│   ├── css/style.css         # Responsive layout configurations
│   ├── js/
│   │   ├── admin.js          # Asynchronous DOM controller for CRUD mechanics
│   │   ├── app.js            # Gateway event-handler linking frontend interface to Socket pipeline
│   │   └── socket-client.js  # Clean abstractions managing live WebSockets
│   ├── admin.html            # Entry point markup for the Administrative Dashboard
│   └── index.html            # Main User Interface presentation framework
├── routes/
│   ├── api.js                # Core API endpoint declarations
│   └── chat.js               # Initial fallback REST routing rules 
├── utils/
│   └── helpers.js            # Validation algorithms and data parsing formatting utilities
└── server.js                 # System entrypoint uniting WebSockets, API engines, and HTTP server layers

```

Installation & Execution Guide

 1. System Requirements

-Node.js: (v16.x or newer recommended)
-MongoDB: instance (Local or Atlas cloud cluster)
-Paystack API Keys (Test profile environment credentials)

 2. Environment Configuration Setup

Create a file named `.env` in the root workspace folder and configure your parameters:

PORT=3000
MONGO_URI=mongodb+srv://yourUsername:yourPassword@cluster.example.mongodb.net/<naijabite>
PAYSTACK_SECRET_KEY=sk_test_your_secure_paystack_secret_key_string
APP_URL=http://localhost:3000
BASE_URL=http://localhost:3000

 3. Dependencies Setup

Execute the following clean installs sequentially to pull up the dependency environment tree:

npm install express mongoose socket.io axios dotenv

 4. Database Initialization

Ensure your MongoDB collection contains items matching the core categories (*Rice Dishes, Swallow & Soups, Beans and Tubers, Snacks and Protein, Drinks*). You can run your `seed.js` script to populate the default menu items into the database.

 5. Running the Application

Spin up the main server cluster instance:

node server.js

The server will bind on the specified environment port (`http://localhost:3000`).

Interaction Flow & Command Map

The system uses a device-bound Finite State Machine (FSM) engine to run user sessions seamlessly across page reloads without requiring manual authentication credentials.


                  ┌──────────────────────────────┐
                  │          IDLE STATE          │◄───────────────────────────┐
                  └──────────────┬───────────────┘                            │
                                 │                                            │
                        [Select 1: View Menu]                                 │
                                 │                                            │
                                 ▼                                            │
                  ┌──────────────────────────────┐                            │
                  │        ORDERING STATE        │                            │
                  └──────────────┬───────────────┘                            │
                                 │                                            │
                     [Select 99: Place Order]                                 │
                                 │                                            │
                                 ▼                                            │
                  ┌──────────────────────────────┐                            │
                  │       SCHEDULING STATE       │                            │
                  └──────────────┬───────────────┘                            │
                                 │                                            │
                     [Enter Window / Type SKIP]                               │
                                 │                                            │
                                 ▼                                            │
                  ┌──────────────────────────────┐                            │
                  │   AWAITING PAYMENT STATE     │                            │
                  └──────────────┬───────────────┘                            │
                                 │                                            │
                            [Type PAY]                                        │
                                 │                                            │
                                 ▼                                            │
                  ┌──────────────────────────────┐                            │
                  │    REDIRECT TO PAYSTACK      │                            │
                  └──────────────┬───────────────┘                            │
                                 │                                            │
                     [Verification / Webhook]                                 │
                                 │                                            │
                                 ▼                                            │
                  ┌──────────────────────────────┐                            │
                  │    COMPLETED / RECOVERY      ├────────────────────────────┘
                  └──────────────────────────────┘

```

Main Root Commands

The chatbot monitors input streams dynamically at runtime. Users can issue global structural shortcuts from any interface level:

1: Compiles an explicit categorized query across the `Menu` collection schema. Stores positions atomically inside an active snapshot map array to resolve selection requests correctly.
97: Queries the `Session` document collection to extract and calculate your active order breakdown and item pricing sub-totals.
98: Scans the persistent `Order` history schema to display historical receipts tied to your specific device footprint ID.
99: Submits the structural content payload from the active basket to generate a new transaction entry. Advances the session pointer context straight into the scheduling stage.
0: Clears active cart buffers, terminates ongoing payment processes, sets pending transactions to `cancelled`, and restores the bot configuration state back to the main system greeting.

Paystack Checkout & Order Scheduling Pipeline

1. Checkout Trigger: When a user inputs option `99`, an order snapshot entry is committed to MongoDB with an initial status of `pending`.
2. Flexible Delivery Windows: The conversation state moves to `scheduling`. The client is prompted to type a specific delivery slot (e.g., *7 PM tomorrow*) or submit `SKIP` to schedule the delivery immediately (`ASAP`).
3. Secure Token Distribution: The interface generates a dynamic link pointing directly to the checkout engine endpoint: `/api/pay-trigger?orderId=<Target_ID>`.
4. Gateway Integration: The API controller references the local order total, multiplies the figure by 100 to meet Kobo parameter standards, and sends a transaction initialization request to the Paystack API servers. It then redirects the browser window directly to the secure payment page.
5. Session Recovery: After authorization processing completes, the platform redirects the transaction handle back to the success processing endpoint: `/api/payment-success`.
6. Payment Finalization: The system sets the order's status to `completed` and updates its billing tracking status to `paid`. The system then routes the client back to the root application view (`/?payment=success`), triggering a success confirmation alert in the conversation history window.


Mobile-Responsive Admin Dashboard

The system features an integrated administrative web workspace accessible via `admin.html`. This interface gives managers full control over the restaurant's offerings without needing manual database access:

Real-time Management: Administrators can add new dishes, update pricing, or change descriptions. Changes take effect instantly across all active customer chat sessions.
Adaptive Display Control: Built with clean CSS variables and modern layout styling, the management dashboard balances data density and scannability across desktop displays, tablets, and smartphone interfaces.
Dynamic Data Updates: The interface uses modern JavaScript DOM manipulation logic. Content updates are rendered efficiently on the fly, preventing full-page reloads and keeping your data sync secure.</Target_ID>
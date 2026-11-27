# User_analytics_dashboard
A small full-stack analytics application for collecting browser page_view and click events, grouping them into sessions, inspecting user journeys, and plotting click locations.
Tech stack
Tracker: dependency-free browser JavaScript, session ID persisted in localStorage
API: Node.js, Express, Mongoose
Database: MongoDB
Dashboard: React 18 + Vite, plain CSS, Lucide icons
Architecture
Demo page / any website
        |
        | tracker sends POST /api/events
        v
Express API  ------> MongoDB events collection
        ^                       |
        | GET sessions/events/pages/heatmap
        |                       |
React dashboard <---------------+
Requirements
Node.js 18.18+ (Node 20 LTS recommended)
npm 9+
MongoDB local instance or MongoDB Atlas connection string

Run locally
Install dependencies from the project root:
npm install
Configure the API:
cp server/.env.example server/.env
Set MONGODB_URI to your local MongoDB URI or Atlas connection string. The example uses a local database named causalfunnel_analytics.
Start MongoDB if running locally, then start both applications from the root:
npm run dev
API: http://localhost:4000
Dashboard: http://localhost:5173
Open the demo page. From the project root, run a static server in a second terminal:
npx http-server . -p 8080
Visit http://localhost:8080/demo/. Click around and navigate/refresh to create events. The demo page sends events to http://localhost:4000/api/events.
Open the dashboard at http://localhost:5173. The sessions list refreshes every 15 seconds; use Refresh to update immediately. Select a session to inspect its ordered events. Choose Click heatmap and a page URL to inspect clicks.
Tracker installation on another site
Copy tracker/analytics.js to a location served by your website and add this script tag before the closing </body> tag:
<script src="https://YOUR_TRACKER_HOST/analytics.js"
  data-endpoint="https://YOUR_API_HOST/api/events"
></script>
For local development, the demo uses:
<script src="../tracker/analytics.js" data-endpoint="http://localhost:4000/api/events"></script>
The script automatically sends one page_view on load and listens for document clicks. It uses localStorage to keep the same session ID across page loads in the same browser profile. A session is therefore a browser identifier, not a login/account identity.
API reference
Method
Endpoint
Purpose
POST
/api/events
Validate and store one event
GET
/api/sessions
Sessions with total event count, first/last seen, and page URLs
GET
/api/sessions/:sessionId/events
Chronological events for one session
GET
/api/pages
Distinct page URLs observed
GET
/api/heatmap?page_url=<encoded URL>
Click positions for an exact page URL
GET
/api/health
API health check
Event shape
Page view:
{
  "session_id": "browser-session-id",
  "event_type": "page_view",
  "page_url": "https://shop.example/products",
  "timestamp": "2026-11-27T10:00:00.000Z"
}
Click:
{
  "session_id": "browser-session-id",
  "event_type": "click",
  "page_url": "https://shop.example/products",
  "timestamp": "2026-11-27T10:00:01.000Z",
  "x": 320,
  "y": 240,
  "viewport_width": 1440,
  "viewport_height": 900
}
Database design
Each event is one document in the events collection. This is an append-only event model: it keeps raw activity simple and flexible, while session summaries are computed with MongoDB aggregation. Indexes support session timelines and page click queries.
session_id: string, required, indexed
event_type: enum page_view | click, required, indexed
page_url: absolute HTTP(S) URL, required
timestamp: BSON Date, required
x, y: click coordinates in CSS pixels relative to the viewport
viewport_width, viewport_height: viewport dimensions at click time
Assumptions and trade-offs
Session definition: A session is a persistent browser localStorage ID. This is simple and survives reloads, but does not expire after inactivity and is not shared across devices/browsers. A production analytics system would normally use an inactivity timeout and consent-aware identity rules.
Coordinates: clientX/clientY are viewport-relative CSS pixels. Viewport dimensions are stored to normalize coordinates. The dashboard's heatmap is an illustrative page canvas, not a screenshot or DOM reconstruction of the tracked page. A production heatmap should collect page dimensions and element metadata, handle scrolling, and overlay points on a captured page image.
Delivery: sendBeacon is preferred for navigation reliability; fetch is the fallback. The browser tracker does not retry failed events or batch them.
Privacy/security: This is a hiring-assignment prototype. Before production, add consent management, retention/deletion controls, rate limiting, authentication for dashboard APIs, origin allowlists, abuse protection, and a privacy review. Avoid collecting form inputs or sensitive data.
URL identity: The full absolute URL is used as the page key, including query strings and fragments. If needed, canonicalize URLs before ingestion.
Time: Timestamps are generated in the browser as ISO strings and stored as MongoDB dates (UTC instants).
Production build
npm run build
The dashboard output is written to client/dist. The API is started with:
npm start
Set VITE_API_URL at build time if the API is hosted somewhere other than http://localhost:4000/api. For a public deployment, deploy the client and API separately, configure CORS, and use MongoDB Atlas. Never commit .env or database credentials.

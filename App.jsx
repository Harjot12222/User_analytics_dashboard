import React, { useEffect, useMemo, useState } from "react";
import { Activity, MousePointer2, Users, RefreshCw, ExternalLink, Clock3, Globe2, ChevronRight, Search, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const fmt = value => value ? new Date(value).toLocaleString() : "—";

function App() {
  const [tab, setTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [heatmap, setHeatmap] = useState({ clicks: [], total_clicks: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function request(path) {
    const response = await fetch(`${API}${path}`);
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.json();
  }
  async function refresh() {
    setLoading(true); setError("");
    try {
      const [sessionData, pageData] = await Promise.all([request("/sessions"), request("/pages")]);
      setSessions(sessionData); setPages(pageData);
      if (!selectedPage && pageData.length) setSelectedPage(pageData[0]);
      if (selectedSession && !sessionData.some(s => s.session_id === selectedSession)) {
        setSelectedSession(""); setEvents([]);
      }
    } catch (e) { setError(`${e.message}. Check that the API and MongoDB are running.`); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!selectedSession) { setEvents([]); return; }
    request(`/sessions/${encodeURIComponent(selectedSession)}/events`).then(setEvents).catch(e => setError(e.message));
  }, [selectedSession]);
  useEffect(() => {
    if (!selectedPage) { setHeatmap({ clicks: [], total_clicks: 0 }); return; }
    request(`/heatmap?page_url=${encodeURIComponent(selectedPage)}`).then(setHeatmap).catch(e => setError(e.message));
  }, [selectedPage]);

  const filtered = useMemo(() => sessions.filter(s => s.session_id.toLowerCase().includes(filter.toLowerCase())), [sessions, filter]);
  const totalEvents = sessions.reduce((sum, s) => sum + s.total_events, 0);
  const totalClicks = heatmap.total_clicks || 0;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><b>FunnelScope</b><small>USER ANALYTICS</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${tab === "sessions" ? "active" : ""}`} onClick={() => setTab("sessions")}><Users size={18}/> Sessions <span>›</span></button>
      <button className={`nav-item ${tab === "heatmap" ? "active" : ""}`} onClick={() => setTab("heatmap")}><MousePointer2 size={18}/> Click heatmap <span>›</span></button>
      <div className="sidebar-bottom"><div className="live-dot"/> API dashboard <small>Auto-refreshes every 15s</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">OVERVIEW</span><h1>{tab === "sessions" ? "Sessions" : "Click heatmap"}</h1></div>
        <button className="refresh" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button></header>
      {error && <div className="error"><AlertCircle size={17}/>{error}</div>}
      {tab === "sessions" ? <>
        <section className="stats">
          <div className="stat-card"><div className="stat-icon purple"><Users size={19}/></div><span>Tracked sessions</span><strong>{sessions.length.toLocaleString()}</strong><small>Unique browser sessions</small></div>
          <div className="stat-card"><div className="stat-icon blue"><Activity size={19}/></div><span>Total events</span><strong>{totalEvents.toLocaleString()}</strong><small>Page views and clicks</small></div>
          <div className="stat-card"><div className="stat-icon orange"><Globe2 size={19}/></div><span>Tracked pages</span><strong>{pages.length.toLocaleString()}</strong><small>Unique page URLs</small></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>All sessions</h2><p>Explore visitor activity and individual user journeys.</p></div>
            <div className="search"><Search size={16}/><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search session ID"/></div></div>
          <div className="table-wrap"><table><thead><tr><th>SESSION ID</th><th>EVENTS</th><th>FIRST SEEN</th><th>LAST ACTIVE</th><th>PAGES</th><th></th></tr></thead>
            <tbody>{filtered.map(s => <tr key={s.session_id} className={selectedSession === s.session_id ? "selected" : ""} onClick={() => setSelectedSession(s.session_id)}>
              <td><div className="session-id"><span className="avatar">{s.session_id.slice(0,1).toUpperCase()}</span><code>{s.session_id}</code></div></td><td><b>{s.total_events}</b></td><td>{fmt(s.first_seen)}</td><td>{fmt(s.last_seen)}</td><td>{s.page_urls?.length || 0}</td><td><ChevronRight size={17}/></td>
            </tr>)}
            {!filtered.length && <tr><td colSpan="6" className="empty">No sessions yet. Open the demo page and interact with it to generate events.</td></tr>}</tbody>
          </table></div>
        </section>
        {selectedSession && <section className="panel journey"><div className="panel-head"><div><h2>User journey</h2><p><code>{selectedSession}</code> · {events.length} events, chronological order</p></div><button className="text-button" onClick={() => setSelectedSession("")}>Close</button></div>
          <div className="timeline">{events.map((event, i) => <div className="timeline-row" key={event._id || i}><div className={`event-icon ${event.event_type}`}><span>{event.event_type === "page_view" ? <Globe2 size={16}/> : <MousePointer2 size={16}/>}</span></div><div className="event-content"><div><b>{event.event_type.replace("_", " ")}</b><time><Clock3 size={13}/>{fmt(event.timestamp)}</time></div><a href={event.page_url} target="_blank" rel="noreferrer">{event.page_url} <ExternalLink size={12}/></a>{event.event_type === "click" && <small>Clicked at x: {Math.round(event.x)}, y: {Math.round(event.y)} px</small>}</div></div>)}
            {!events.length && <div className="empty">No events in this session.</div>}</div></section>}
      </> : <section className="panel heat-panel"><div className="panel-head"><div><h2>Click distribution</h2><p>Click coordinates collected for the selected page.</p></div><div className="click-count"><MousePointer2 size={16}/><b>{totalClicks}</b><span>clicks</span></div></div>
        <label className="select-label">PAGE URL</label><select className="page-select" value={selectedPage} onChange={e => setSelectedPage(e.target.value)}><option value="">Select a tracked page</option>{pages.map(p => <option key={p} value={p}>{p}</option>)}</select>
        {selectedPage ? <><div className="heat-legend"><span><i/> Each dot represents one click</span><span>Coordinates are viewport-relative</span></div>
          <div className="heat-stage"><div className="browser-bar"><i/><i/><i/><span>{selectedPage}</span></div><div className="heat-canvas">
            <div className="mock-page"><div className="mock-nav"><b>YOUR STORE</b><span>Shop　 About　 Contact</span></div><div className="mock-hero"><small>NEW COLLECTION</small><h3>Discover something<br/>you'll love.</h3><p>A sample page canvas for click activity.</p><div className="mock-cta">Explore collection</div></div><div className="mock-products"><div/><div/><div/></div></div>
            {heatmap.clicks.map((c, i) => <span key={i} className="heat-dot" title={`x ${c.x}, y ${c.y}`} style={{ left: `${Math.min(100, Math.max(0, c.x / (c.viewport_width || 1) * 100))}%`, top: `${Math.min(100, Math.max(0, c.y / (c.viewport_height || 1) * 100))}%` }}/>)}
          </div></div><p className="heat-note">The preview is illustrative, not a screenshot of the original page. Dots are plotted as percentages of the recorded viewport so different viewport sizes can be compared approximately.</p>
        </> : <div className="empty heat-empty">No tracked pages yet. Visit your demo page with the tracking script installed.</div>}
      </section>}
      <footer>FunnelScope · Simple product analytics <span>Built with React, Express & MongoDB</span></footer>
    </main>
  </div>;
}
export default App;

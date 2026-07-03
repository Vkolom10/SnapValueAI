import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, List, Home, Search, X, Plus, Trash2, Copy, ImagePlus, ChevronRight, Pencil, Sparkles, MoreHorizontal, Tag, TrendingUp, BarChart3, Settings } from 'lucide-react';
import './styles.css';

const seedItems = [
  { id:'1', name:'KitchenAid Mixer', category:'Kitchen', status:'estimated', low:210, good:245, best:285, platform:'eBay', condition:'Good', confidence:92, ship:18, profit:75, photo:'', notes:'Works, small scratches on bowl.', sold:[215,228,240] },
  { id:'2', name:'Nintendo Switch', category:'Electronics', status:'estimated', low:145, good:175, best:210, platform:'Facebook', condition:'OK', confidence:88, ship:12, profit:65, photo:'', notes:'Console only, charger included.', sold:[150,168,185] },
  { id:'3', name:'DeWalt Drill', category:'Tools', status:'working', low:0, good:0, best:0, platform:'eBay', condition:'Unknown', confidence:0, ship:0, profit:0, photo:'', notes:'', sold:[] },
  { id:'4', name:'Unknown Item', category:'', status:'needs', low:0, good:0, best:0, platform:'', condition:'Unknown', confidence:0, ship:0, profit:0, photo:'', notes:'Needs label photo or more details.', sold:[] }
];

function loadItems(){
  try { return JSON.parse(localStorage.getItem('snapvalue-items')) || seedItems; } catch { return seedItems; }
}
function saveItems(items){ localStorage.setItem('snapvalue-items', JSON.stringify(items)); }
const money = n => `$${Number(n||0).toLocaleString()}`;
const platformShort = p => ({ eBay:'eB', Facebook:'FB', Craigslist:'CL', Mercari:'ME', Garage:'GS' }[p] || 'AI');
const platformColors = { eBay:'#e53238', Facebook:'#1877f2', Craigslist:'#6b3fa0', Mercari:'#ff4b0a' };
const platformMark = p => (p||'?')[0];

function App(){
  const [items,setItemsState] = useState(loadItems());
  const [page,setPage] = useState('dashboard');
  const [selected,setSelected] = useState(null);
  const [editing,setEditing] = useState(null);
  const fileRef = useRef(null);
  const uploadRef = useRef(null);

  const setItems = next => { setItemsState(next); saveItems(next); };
  const conservativeTotal = useMemo(()=>items.reduce((s,i)=>s+(i.status==='estimated'?Number(i.low||0):0),0),[items]);
  const estimated = items.filter(i=>i.status==='estimated');
  const top = [...estimated].sort((a,b)=>(b.profit||b.low)-(a.profit||a.low)).slice(0,5);

  async function handlePhoto(e){
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const id = String(Date.now());
      const dataUrl = reader.result; // e.g. "data:image/jpeg;base64,AAAA..."
      const [meta, base64] = dataUrl.split(',');
      const mediaType = meta.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

      const newItem = {
        id, name:'AI scanning...', status:'working', low:0, good:0, best:0, platform:'', condition:'Unknown', confidence:0, ship:0, profit:0,
        photo:dataUrl, notes:'', sold:[]
      };
      const next = [newItem, ...items];
      setItems(next);
      setPage('list');
      e.target.value='';

      try{
        const res = await fetch('/api/estimate', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType })
        });
        const data = await res.json();

        if(!res.ok || data.error){
          const failed = loadItems().map(i=> i.id===id ? { ...i, status:'needs', name:'Scan failed', notes:data.error||'AI request failed. Edit to retry or add details.' } : i);
          setItems(failed);
          return;
        }

        if(data.needsInfo){
          const needsInfo = loadItems().map(i=> i.id===id ? { ...i, status:'needs', name:i.name==='AI scanning...' ? 'Unidentified Item' : i.name, notes:data.notes||'AI needs a clearer photo.' } : i);
          setItems(needsInfo);
          return;
        }

        const low = Number(data.low)||0;
        const updated = loadItems().map(i=> i.id===id ? {
          ...i,
          name:data.name || 'Unidentified Item',
          category:data.category || 'Item',
          status:'estimated',
          low,
          good:Number(data.good)||low,
          best:Number(data.best)||low,
          platform:data.platform || 'Facebook',
          condition:data.condition || 'Good',
          confidence:Number(data.confidence)||0,
          ship:8+Math.floor(low*.06), // rough shipping placeholder, no real carrier rate lookup yet
          profit:Math.floor(low*.35),
          notes:data.notes || '',
          sold:[]
        } : i);
        setItems(updated);
      } catch(err){
        console.error('Estimate error:', err);
        const failed = loadItems().map(i=> i.id===id ? { ...i, status:'needs', name:'Scan failed', notes:'Network error reaching AI. Edit to retry.' } : i);
        setItems(failed);
      }
    };
    reader.readAsDataURL(file);
  }

  function openCamera(){ fileRef.current?.click(); }
  function openUpload(){ uploadRef.current?.click(); }
  function clearAllData(){
    if(confirm('Delete all scanned items? This cannot be undone.')){
      setItems([]);
    }
  }
  function updateItem(updated){ setItems(items.map(i=>i.id===updated.id?updated:i)); setEditing(null); }
  function deleteItem(id){ setItems(items.filter(i=>i.id!==id)); setSelected(null); setEditing(null); }

  return <div className="phone-shell">
    <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto}/>
    <input ref={uploadRef} type="file" accept="image/*" hidden onChange={handlePhoto}/>
    <main className="app">
      {page==='dashboard' && <Dashboard items={items} total={conservativeTotal} top={top} openList={()=>setPage('list')} openDetails={setSelected}/>}      
      {page==='list' && <FullList items={items} setSelected={setSelected} setEditing={setEditing}/>}      
      {page==='stats' && <StatsPage items={items}/>}
      {page==='settings' && <SettingsPage clearAllData={clearAllData} itemCount={items.length}/>}
    </main>
    <BottomNav page={page} setPage={setPage} openCamera={openCamera} openUpload={openUpload}/>
    {selected && <Details item={selected} close={()=>setSelected(null)} edit={()=>{setEditing(selected); setSelected(null)}} deleteItem={deleteItem}/>}    
    {editing && <EditSheet item={editing} close={()=>setEditing(null)} save={updateItem} deleteItem={deleteItem}/>}    
  </div>
}

function Dashboard({items,total,top,openList,openDetails}){
  const hasItems = items.length>0;
  const topItem = top[0];
  return <div className="screen dashboard">
    <section className={`hero ${!hasItems?'empty':''}`}>
      <div className="hero-bg"></div>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="brand"><Tag size={16}/> SnapValue AI</div>
        {!hasItems ? <div className="empty-hero"><h1>Find the money sitting at home.</h1><p>Tap Scan and take your first picture.</p></div> : <div className="value-card">
          <div className="stat-row">
            <div className="stat">
              <p>Low estimated value</p>
              <h1>{money(total)}</h1>
              <span>{items.length} items</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <p>Top item value</p>
              <div className="trend-row"><span className="trend-dot"><TrendingUp size={13}/></span><h1 className="stat-sm">{topItem?money(topItem.low):'—'}</h1></div>
              <span>{topItem?topItem.name:'None yet'}</span>
            </div>
          </div>
        </div>}
      </div>
    </section>
    {hasItems && <>
      <section className="panel sell-mini">
        <h2>Where to sell</h2>
        <div className="sell-scroll">
          {['eBay','Facebook','Craigslist','Mercari'].map(p=>
            <div className="sell-chip" key={p}>
              <span className="sell-mark-sm" style={{background:platformColors[p]}}>{platformMark(p)}</span>{p}
            </div>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head-col">
          <div className="panel-head-row"><h2>Top items</h2><button onClick={openList}>See all</button></div>
          <span className="sub">Highest profit potential</span>
        </div>
        {top.map(item=><ItemCard key={item.id} item={item} onClick={()=>openDetails(item)}/>) }
        {!top.length && <p className="muted">AI is still working. Estimated items will show here.</p>}
      </section>
    </>}
  </div>
}

function ItemCard({item,onClick}){
  return <button className="top-card slim" onClick={onClick}>
    <Thumb item={item}/>
    <span className="ic-name">{item.name}</span>
    {item.platform && <span className="plat-badge" style={{background:platformColors[item.platform]||'#888'}}>{platformMark(item.platform)}</span>}
    <strong className="ic-price">{money(item.low)}</strong>
  </button>
}
function FullList({items,setSelected,setEditing}){
  const [q,setQ]=useState('');
  const filtered=items.filter(i=>i.name.toLowerCase().includes(q.toLowerCase()));
  let tapTimer=useRef(null);
  function handleClick(item){
    if(tapTimer.current){ clearTimeout(tapTimer.current); tapTimer.current=null; setEditing(item); return; }
    tapTimer.current=setTimeout(()=>{ setSelected(item); tapTimer.current=null; },230);
  }
  return <div className="screen list-screen">
    <header className="plain-head"><h1>Full List</h1><p>Tap for AI details. Double tap to edit.</p></header>
    <label className="search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search items"/></label>
    <div className="rows">
      {filtered.map(item=><button key={item.id} className="row" onClick={()=>handleClick(item)}>
        <Thumb item={item}/><div className="grow"><b>{item.name}</b><Status item={item}/></div>
        {item.platform && <span className="plat-badge sm" style={{background:platformColors[item.platform]||'#888'}}>{platformMark(item.platform)}</span>}
        <div className="row-price"><strong>{item.status==='estimated'?money(item.low):'—'}</strong></div><ChevronRight size={16}/>
      </button>)}
    </div>
  </div>
}
function Status({item}){
  if(item.status==='estimated') return <small className="ok">AI Estimated</small>;
  if(item.status==='working') return <small className="work">AI Working...</small>;
  return <small className="need">Needs More Info</small>;
}
function Thumb({item}){ return <div className="thumb">{item.photo ? <img src={item.photo}/> : <span>{item.name?.[0]||'?'}</span>}</div> }
function BottomNav({page,setPage,openCamera,openUpload}){
  const [open,setOpen] = useState(false);
  const go = (p) => { setOpen(false); setPage(p); };
  return <nav className="bottom-nav slim">
    <button className={page==='dashboard'?'active':''} onClick={()=>go('dashboard')}><Home size={20}/><span>Home</span></button>
    <button className="scan" onClick={()=>{setOpen(false); openCamera();}}><Camera size={26}/></button>
    <div className="more-wrap">
      <button className={open?'active':''} onClick={()=>setOpen(!open)}><MoreHorizontal size={20}/><span>More</span></button>
      {open && <div className="more-menu">
        <button onClick={()=>go('list')}><List size={16}/> My Items</button>
        <button onClick={()=>go('stats')}><BarChart3 size={16}/> Stats</button>
        <button onClick={()=>go('settings')}><Settings size={16}/> Settings</button>
        <div className="menu-divider"></div>
        <button onClick={()=>{setOpen(false); openUpload();}}><ImagePlus size={16}/> Upload from files</button>
      </div>}
    </div>
  </nav>
}
function Details({item,close,edit,deleteItem}){
  const listing = `${item.name}\nCondition: ${item.condition}\nPrice: ${money(item.low)}\nPlatform: ${item.platform || 'Local'}\n${item.notes||''}`;
  return <div className="sheet-back"><div className="sheet"><button className="x" onClick={close}><X/></button><Thumb item={item}/><h2>{item.name}</h2><Status item={item}/>{item.status==='needs' && <p className="alert">AI needs more info. Double tap item or press Edit to add notes/photos.</p>}<div className="price-grid"><Box label="Low" value={money(item.low)}/><Box label="Good" value={money(item.good)}/><Box label="Best" value={money(item.best)}/></div><div className="info"><p><b>Best platform:</b> {item.platform||'Unknown'}</p><p><b>Condition:</b> {item.condition}</p><p><b>Confidence:</b> {item.confidence||0}%</p><p><b>Shipping:</b> {item.ship?money(item.ship):'Needs weight'}</p><p><b>Sold comps:</b> {item.sold?.length?item.sold.map(money).join(' · '):'Still searching'}</p></div><div className="actions"><button onClick={()=>navigator.clipboard?.writeText(listing)}><Copy size={17}/> Copy Listing</button><button onClick={edit}><Pencil size={17}/> Edit</button><button className="danger" onClick={()=>deleteItem(item.id)}><Trash2 size={17}/> Delete</button></div></div></div>
}
function StatsPage({items}){
  const estimated = items.filter(i=>i.status==='estimated');
  const total = estimated.reduce((s,i)=>s+i.low,0);
  const avgConfidence = estimated.length ? Math.round(estimated.reduce((s,i)=>s+(i.confidence||0),0)/estimated.length) : 0;
  const byCategory = {};
  estimated.forEach(i=>{ const c=i.category||'Other'; byCategory[c]=(byCategory[c]||0)+i.low; });
  const catRows = Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
  const byPlatform = {};
  estimated.forEach(i=>{ if(i.platform) byPlatform[i.platform]=(byPlatform[i.platform]||0)+1; });
  const platRows = Object.entries(byPlatform).sort((a,b)=>b[1]-a[1]);

  return <div className="screen list-screen">
    <header className="plain-head"><h1>Stats</h1><p>Based on your {estimated.length} estimated item{estimated.length===1?'':'s'}.</p></header>
    {!estimated.length ? <p className="muted" style={{margin:'0 16px'}}>Scan and estimate a few items to see stats here.</p> : <>
      <div className="stats-grid">
        <div className="mini"><small>Total value</small><b>{money(total)}</b></div>
        <div className="mini"><small>Items</small><b>{estimated.length}</b></div>
        <div className="mini"><small>Avg confidence</small><b>{avgConfidence}%</b></div>
      </div>
      <section className="panel">
        <div className="panel-head"><h2>By category</h2></div>
        {catRows.map(([cat,val])=>
          <div className="stat-bar-row" key={cat}>
            <span>{cat}</span>
            <div className="stat-bar-track"><div className="stat-bar-fill" style={{width:`${Math.max(6,(val/total)*100)}%`}}></div></div>
            <strong>{money(val)}</strong>
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-head"><h2>By platform</h2></div>
        <div className="sell-grid">
          {platRows.map(([p,count])=>
            <div className="sell-card" key={p}>
              <div className="sell-mark" style={{background:platformColors[p]||'#888'}}>{platformMark(p)}</div>
              <span>{p} · {count}</span>
            </div>
          )}
        </div>
      </section>
    </>}
  </div>
}

function SettingsPage({clearAllData,itemCount}){
  return <div className="screen list-screen">
    <header className="plain-head"><h1>Settings</h1><p>Local, on this device only.</p></header>
    <section className="panel">
      <div className="panel-head"><h2>Data</h2></div>
      <p className="muted" style={{margin:'0 0 12px'}}>{itemCount} item{itemCount===1?'':'s'} saved in this browser's local storage. Not synced or backed up anywhere else.</p>
      <button className="danger-block" onClick={clearAllData}><Trash2 size={16}/> Clear all data</button>
    </section>
    <section className="panel">
      <div className="panel-head"><h2>About</h2></div>
      <p className="muted" style={{margin:0}}>SnapValue AI — personal resale scanner. More settings will show up here once there's something real to configure.</p>
    </section>
  </div>
}
function Box({label,value}){return <div className="mini"><small>{label}</small><b>{value}</b></div>}
function EditSheet({item,close,save,deleteItem}){
  const [draft,setDraft]=useState(item);
  const file=useRef(null);
  function addPhoto(e){ const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setDraft({...draft,photo:r.result,status:'working'}); r.readAsDataURL(f); }
  return <div className="sheet-back"><div className="sheet edit"><button className="x" onClick={close}><X/></button><h2>Edit Item</h2><Thumb item={draft}/><input ref={file} hidden type="file" accept="image/*" capture="environment" onChange={addPhoto}/><button className="add-photo" onClick={()=>file.current.click()}><ImagePlus/> Add better photo</button><label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Condition<select value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}><option>Unknown</option><option>Fair</option><option>OK</option><option>Good</option><option>Excellent</option></select></label><label>Notes<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value,status:'working'})} placeholder="Example: works, missing charger, scratched, label says model 123..."/></label><div className="actions"><button onClick={()=>save(draft)}>Save</button><button className="danger" onClick={()=>deleteItem(item.id)}>Delete</button></div></div></div>
}

createRoot(document.getElementById('root')).render(<App/>);

import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, List, Home, Search, X, Plus, Trash2, Copy, ImagePlus, ChevronRight, Pencil, Sparkles } from 'lucide-react';
import './styles.css';

const seedItems = [
  { id:'1', name:'KitchenAid Mixer', status:'estimated', low:210, good:245, best:285, platform:'eBay', condition:'Good', confidence:92, ship:18, profit:75, photo:'', notes:'Works, small scratches on bowl.', sold:[215,228,240] },
  { id:'2', name:'Nintendo Switch', status:'estimated', low:145, good:175, best:210, platform:'Facebook', condition:'OK', confidence:88, ship:12, profit:65, photo:'', notes:'Console only, charger included.', sold:[150,168,185] },
  { id:'3', name:'DeWalt Drill', status:'working', low:0, good:0, best:0, platform:'eBay', condition:'Unknown', confidence:0, ship:0, profit:0, photo:'', notes:'', sold:[] },
  { id:'4', name:'Unknown Item', status:'needs', low:0, good:0, best:0, platform:'', condition:'Unknown', confidence:0, ship:0, profit:0, photo:'', notes:'Needs label photo or more details.', sold:[] }
];

function loadItems(){
  try { return JSON.parse(localStorage.getItem('snapvalue-items')) || seedItems; } catch { return seedItems; }
}
function saveItems(items){ localStorage.setItem('snapvalue-items', JSON.stringify(items)); }
const money = n => `$${Number(n||0).toLocaleString()}`;
const platformShort = p => ({ eBay:'eB', Facebook:'FB', Craigslist:'CL', Mercari:'ME', Garage:'GS' }[p] || 'AI');

function App(){
  const [items,setItemsState] = useState(loadItems());
  const [page,setPage] = useState('dashboard');
  const [selected,setSelected] = useState(null);
  const [editing,setEditing] = useState(null);
  const fileRef = useRef(null);

  const setItems = next => { setItemsState(next); saveItems(next); };
  const conservativeTotal = useMemo(()=>items.reduce((s,i)=>s+(i.status==='estimated'?Number(i.low||0):0),0),[items]);
  const estimated = items.filter(i=>i.status==='estimated');
  const top = [...estimated].sort((a,b)=>(b.profit||b.low)-(a.profit||a.low)).slice(0,5);

  function handlePhoto(e){
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = String(Date.now());
      const newItem = {
        id, name:'AI scanning...', status:'working', low:0, good:0, best:0, platform:'', condition:'Unknown', confidence:0, ship:0, profit:0,
        photo:reader.result, notes:'', sold:[]
      };
      const next = [newItem, ...items];
      setItems(next);
      setPage('list');
      setTimeout(()=>{
        const names = ['Garage Tool','Small Appliance','Home Decor Item','Electronics Item','Kitchen Item'];
        const platforms = ['Facebook','eBay','Craigslist','Mercari'];
        const low = 25 + Math.floor(Math.random()*150);
        const updated = loadItems().map(i=> i.id===id ? {
          ...i,
          name:names[Math.floor(Math.random()*names.length)],
          status:'estimated',
          low,
          good:low+Math.floor(low*.22),
          best:low+Math.floor(low*.45),
          platform:platforms[Math.floor(Math.random()*platforms.length)],
          condition:'Good',
          confidence:74+Math.floor(Math.random()*20),
          ship:8+Math.floor(Math.random()*22),
          profit:Math.floor(low*.35),
          sold:[low+3, low+12, low+21]
        } : i);
        setItems(updated);
      }, 2200);
      e.target.value='';
    };
    reader.readAsDataURL(file);
  }

  function openCamera(){ fileRef.current?.click(); }
  function updateItem(updated){ setItems(items.map(i=>i.id===updated.id?updated:i)); setEditing(null); }
  function deleteItem(id){ setItems(items.filter(i=>i.id!==id)); setSelected(null); setEditing(null); }

  return <div className="phone-shell">
    <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto}/>
    <main className="app">
      {page==='dashboard' && <Dashboard items={items} total={conservativeTotal} top={top} openList={()=>setPage('list')} openDetails={setSelected}/>}      
      {page==='list' && <FullList items={items} setSelected={setSelected} setEditing={setEditing}/>}      
    </main>
    <BottomNav page={page} setPage={setPage} openCamera={openCamera}/>
    {selected && <Details item={selected} close={()=>setSelected(null)} edit={()=>{setEditing(selected); setSelected(null)}} deleteItem={deleteItem}/>}    
    {editing && <EditSheet item={editing} close={()=>setEditing(null)} save={updateItem} deleteItem={deleteItem}/>}    
  </div>
}

function Dashboard({items,total,top,openList,openDetails}){
  const hasItems = items.length>0;
  return <div className="screen dashboard">
    <section className={`hero ${!hasItems?'empty':''}`}>
      <div className="hero-bg"></div>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="brand"><Sparkles size={16}/> SnapValue AI</div>
        {!hasItems ? <div className="empty-hero"><h1>Find the money sitting at home.</h1><p>Tap Scan and take your first picture.</p></div> : <div className="value-card">
          <p>Low Estimated Value</p>
          <h1>{money(total)}</h1>
          <span>{items.length} items scanned</span>
        </div>}
      </div>
    </section>
    {hasItems && <>
      <section className="sell-strip">
        <span>Where to sell</span><div><b>eBay</b><b>Facebook</b><b>Craigslist</b><b>Mercari</b></div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Top items</h2><button onClick={openList}>View all</button></div>
        {top.map(item=><ItemCard key={item.id} item={item} onClick={()=>openDetails(item)}/>) }
        {!top.length && <p className="muted">AI is still working. Estimated items will show here.</p>}
      </section>
    </>}
  </div>
}

function ItemCard({item,onClick}){
  return <button className="top-card" onClick={onClick}>
    <Thumb item={item}/><div className="grow"><b>{item.name}</b><small>{platformShort(item.platform)} · High profit</small></div><strong>{money(item.low)}</strong>
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
        <Thumb item={item}/><div className="grow"><b>{item.name}</b><Status item={item}/></div><div className="row-price"><strong>{item.status==='estimated'?money(item.low):'—'}</strong><small>{platformShort(item.platform)}</small></div><ChevronRight size={16}/>
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
function BottomNav({page,setPage,openCamera}){ return <nav className="bottom-nav"><button className={page==='dashboard'?'active':''} onClick={()=>setPage('dashboard')}><Home size={20}/><span>Home</span></button><button className="scan" onClick={openCamera}><Camera size={28}/></button><button className={page==='list'?'active':''} onClick={()=>setPage('list')}><List size={20}/><span>List</span></button></nav> }
function Details({item,close,edit,deleteItem}){
  const listing = `${item.name}\nCondition: ${item.condition}\nPrice: ${money(item.low)}\nPlatform: ${item.platform || 'Local'}\n${item.notes||''}`;
  return <div className="sheet-back"><div className="sheet"><button className="x" onClick={close}><X/></button><Thumb item={item}/><h2>{item.name}</h2><Status item={item}/>{item.status==='needs' && <p className="alert">AI needs more info. Double tap item or press Edit to add notes/photos.</p>}<div className="price-grid"><Box label="Low" value={money(item.low)}/><Box label="Good" value={money(item.good)}/><Box label="Best" value={money(item.best)}/></div><div className="info"><p><b>Best platform:</b> {item.platform||'Unknown'}</p><p><b>Condition:</b> {item.condition}</p><p><b>Confidence:</b> {item.confidence||0}%</p><p><b>Shipping:</b> {item.ship?money(item.ship):'Needs weight'}</p><p><b>Sold comps:</b> {item.sold?.length?item.sold.map(money).join(' · '):'Still searching'}</p></div><div className="actions"><button onClick={()=>navigator.clipboard?.writeText(listing)}><Copy size={17}/> Copy Listing</button><button onClick={edit}><Pencil size={17}/> Edit</button><button className="danger" onClick={()=>deleteItem(item.id)}><Trash2 size={17}/> Delete</button></div></div></div>
}
function Box({label,value}){return <div className="mini"><small>{label}</small><b>{value}</b></div>}
function EditSheet({item,close,save,deleteItem}){
  const [draft,setDraft]=useState(item);
  const file=useRef(null);
  function addPhoto(e){ const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>setDraft({...draft,photo:r.result,status:'working'}); r.readAsDataURL(f); }
  return <div className="sheet-back"><div className="sheet edit"><button className="x" onClick={close}><X/></button><h2>Edit Item</h2><Thumb item={draft}/><input ref={file} hidden type="file" accept="image/*" capture="environment" onChange={addPhoto}/><button className="add-photo" onClick={()=>file.current.click()}><ImagePlus/> Add better photo</button><label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Condition<select value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}><option>Unknown</option><option>Fair</option><option>OK</option><option>Good</option><option>Excellent</option></select></label><label>Notes<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value,status:'working'})} placeholder="Example: works, missing charger, scratched, label says model 123..."/></label><div className="actions"><button onClick={()=>save(draft)}>Save</button><button className="danger" onClick={()=>deleteItem(item.id)}>Delete</button></div></div></div>
}

createRoot(document.getElementById('root')).render(<App/>);

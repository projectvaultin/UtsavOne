/* UtsavOne / Festival OS
   GitHub Pages + Supabase build.
   The Supabase URL is public; use only an anon/publishable key here.
*/
const SUPABASE_URL = "https://dxtljclujkxczljotoyc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dGxqY2x1amt4Y3psam90b3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDQ4NTUsImV4cCI6MjEwNTMyMDg1NX0.vomNe7a15tEnDsQ2892_6xuDWxFQ0e3wxYgNgcFtpCc";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let session = null;

const state = {festivals:JSON.parse(localStorage.getItem("fos_festivals")||"[]"),members:JSON.parse(localStorage.getItem("fos_members")||"[]"),events:JSON.parse(localStorage.getItem("fos_events")||"[]"),donations:JSON.parse(localStorage.getItem("fos_donations")||"[]"),expenses:JSON.parse(localStorage.getItem("fos_expenses")||"[]"),tasks:JSON.parse(localStorage.getItem("fos_tasks")||"[]"),page:"Dashboard",festivalId:null};
if(!state.festivals.length){state.festivals=[{id:crypto.randomUUID(),name:"Dussehra",year:2026,location:"Penugonda",status:"Active"}];}
state.festivalId=state.festivals[0]?.id||null;

function save(){
  for(const k of ["festivals","members","events","donations","expenses","tasks"])
    localStorage.setItem("fos_"+k,JSON.stringify(state[k]));
}

async function syncFestivals(){
  if(!session || !state.festivals.length) return;
  try{
    // The UtsavOne festivals table does NOT have a "status" column.
    // Store only columns that exist in the current schema.
    for(const f of state.festivals){
      const row={
        name:String(f.name||"Festival"),
        festival_year:Number(f.year||new Date().getFullYear()),
        location:f.location||null,
        is_active:f.status!=="Inactive"
      };
      const {error}=await sb.from("festivals").upsert(row,{onConflict:"name,festival_year"});
      if(error) throw error;
    }
  }catch(e){
    console.warn("UtsavOne Supabase festival sync unavailable:",e.message||e);
  }
}

async function loadFestivalsFromSupabase(){
  if(!session) return;
  try{
    const {data,error}=await sb.from("festivals")
      .select("*")
      .eq("is_active",true)
      .order("priority",{ascending:true})
      .order("festival_date",{ascending:true});
    if(error) throw error;
    if(Array.isArray(data) && data.length){
      state.festivals=data.map(f=>({
        ...f,
        id:String(f.id),
        year:Number(f.festival_year??new Date().getFullYear()),
        status:f.is_active===false?"Inactive":"Active",
        location:f.location||""
      }));
      state.festivalId=state.festivals[0]?.id||null;
      localStorage.setItem("fos_festivals",JSON.stringify(state.festivals));
    }else{
      await syncFestivals();
    }
  }catch(e){
    console.warn("UtsavOne Supabase festival load unavailable:",e.message||e);
  }
}

function authHtml(message=""){
  return `<div class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">🎉</div>
      <h1>UtsavOne</h1>
      <p class="muted">Festival Management System</p>
      <div id="auth-message" class="${message?"auth-message":"auth-message hidden"}">${esc(message)}</div>

      <form id="login-form" class="form" onsubmit="event.preventDefault();loginUser(this)">
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="Enter email"></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="Enter password"></label>
        <button class="primary auth-submit">Login</button>
      </form>

      <div class="auth-divider"><span>New user?</span></div>

      <form id="signup-form" class="form" onsubmit="event.preventDefault();signupUser(this)">
        <label>Full Name<input name="name" autocomplete="name" required placeholder="Your name"></label>
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="Enter email"></label>
        <label>Password<input name="password" type="password" autocomplete="new-password" minlength="6" required placeholder="Create password"></label>
        <button class="secondary auth-submit">Create Account</button>
      </form>
    </div>
  </div>`;
}

async function loginUser(form){
  const btn=form.querySelector("button");
  btn.disabled=true; btn.textContent="Signing in...";
  const {data,error}=await sb.auth.signInWithPassword({
    email:form.email.value.trim(),
    password:form.password.value
  });
  btn.disabled=false; btn.textContent="Login";
  if(error){showAuthError(error.message);return;}
  session=data.session;
  await bootApp();
}

async function signupUser(form){
  const btn=form.querySelector("button");
  btn.disabled=true; btn.textContent="Creating...";
  const {data,error}=await sb.auth.signUp({
    email:form.email.value.trim(),
    password:form.password.value,
    options:{data:{full_name:form.name.value.trim()}}
  });
  btn.disabled=false; btn.textContent="Create Account";
  if(error){showAuthError(error.message);return;}
  if(data.session){
    session=data.session;
    await bootApp();
  }else{
    showAuthError("Account created. Check your email to verify the account, then log in.");
  }
}

function showAuthError(message){
  const el=document.querySelector("#auth-message");
  if(el){el.textContent=message;el.classList.remove("hidden");}
}

async function logoutUser(){
  await sb.auth.signOut();
  session=null;
  document.querySelector("#app").innerHTML=authHtml("You have been logged out.");
}

function userEmail(){
  return session?.user?.email||"";
}

async function bootApp(){
  await loadFestivalsFromSupabase();
  render();
  // Keep local changes synchronized without blocking the UI.
  syncFestivals();
}

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function current(){return state.festivals.find(x=>x.id===state.festivalId)||state.festivals[0]}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN")}
function nav(){return ["Dashboard","Festivals","Members","Committee","Events","Volunteers","Donations","Expenses","Tasks","Registrations","Attendance","Reports","Gallery","Documents","Automation","Settings"]}
function render(){
  if(!session){document.querySelector("#app").innerHTML=authHtml();return;}
  document.querySelector("#app").innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand">🎉 Festival OS</div><div class="nav">${nav().map(x=>`<button class="${state.page===x?"active":""}" onclick="go('${x}')">${icon(x)} ${x}</button>`).join("")}</div></aside><main class="main"><div class="top"><div><h1>${esc(state.page)}</h1><div class="muted">${esc(current().name)} ${current().year} • ${esc(current().location)}</div></div><div class="top-actions"><span class="user-email">${esc(userEmail())}</span><button class="secondary" onclick="newFestival()">＋ Festival</button><button class="secondary" onclick="logoutUser()">Logout</button></div></div>${pageHtml()}</main><div class="mobilebar">${["Dashboard","Members","Events","Reports"].map(x=>`<button onclick="go('${x}')">${icon(x)}<br>${x}</button>`).join("")}</div></div>`}
function icon(x){return ({Dashboard:"⌂",Festivals:"🎉",Members:"👥",Committee:"🏛️",Events:"📅",Volunteers:"🤝",Donations:"💰",Expenses:"💸",Tasks:"✓",Registrations:"🎟️",Attendance:"▣",Reports:"📊",Gallery:"📷",Documents:"📄",Automation:"⚡",Settings:"⚙️"})[x]||"•"}
function go(p){state.page=p;render()}
function pageHtml(){switch(state.page){case"Dashboard":return dashboard();case"Festivals":return festivals();case"Members":return members();case"Committee":return committee();case"Events":return events();case"Donations":return donations();case"Expenses":return expenses();case"Tasks":return tasks();case"Reports":return reports();default:return generic(state.page)}}
function dashboard(){let d=state.donations.reduce((a,x)=>a+Number(x.amount),0),e=state.expenses.reduce((a,x)=>a+Number(x.amount),0);return `<div class="hero"><h2>Festival Command Center</h2><div>Manage members, positions, events, finance, volunteers and custom festival operations.</div></div><div class="cards section">${card("Festivals",state.festivals.length,"🎉")}${card("Members",state.members.length,"👥")}${card("Events",state.events.length,"📅")}${card("Balance",money(d-e),"₹")}</div><div class="grid"><div class="card"><h3>Quick actions</h3><div class="quick"><button onclick="addMember()">👤<br><b>Add Member</b></button><button onclick="addEvent()">📅<br><b>Add Event</b></button><button onclick="addFinance('donation')">💰<br><b>Add Donation</b></button></div></div><div class="card"><h3>Current festival</h3><p><b>${esc(current().name)} ${current().year}</b></p><p class="muted">${esc(current().location)}</p><span class="pill">${esc(current().status)}</span></div></div>`}
function card(a,b,c){return `<div class="card"><div>${c} ${a}</div><div class="metric">${b}</div></div>`}
function festivals(){return `<div class="toolbar"><button class="primary" onclick="newFestival()">＋ Create Festival</button><button class="secondary" onclick="copyFestival()">Copy Current Festival</button></div><div class="grid">${state.festivals.map(f=>`<div class="card"><h3>${esc(f.name)} ${f.year}</h3><p class="muted">${esc(f.location)}</p><span class="pill">${esc(f.status)}</span><div class="actions"><button class="secondary" onclick="selectFestival('${f.id}')">Open</button></div></div>`).join("")}</div>`}
function selectFestival(id){state.festivalId=id;state.page="Dashboard";render()}
function members(){return listPage("Members",["Name","Mobile","Position","Status"],state.members.map(x=>[x.name,x.mobile,x.position,x.status]),addMember)}
function committee(){let rows=state.members.filter(x=>x.position).map(x=>[x.name,x.position,x.mobile,x.status]);return listPage("Committee",["Member","Position","Mobile","Status"],rows,addMember)}
function events(){return listPage("Events",["Event","Date","Time","Location"],state.events.map(x=>[x.name,x.date,x.time,x.location]),addEvent)}
function donations(){return listPage("Donations",["Donor","Amount","Date","Purpose"],state.donations.map(x=>[x.donor,money(x.amount),x.date,x.purpose]),()=>addFinance("donation"))}
function expenses(){return listPage("Expenses",["Category","Amount","Date","Paid By"],state.expenses.map(x=>[x.category,money(x.amount),x.date,x.paidBy]),()=>addFinance("expense"))}
function tasks(){return listPage("Tasks",["Task","Assigned","Due","Status"],state.tasks.map(x=>[x.name,x.assigned,x.due,x.status]),addTask)}
function listPage(title,heads,rows,add){return `<div class="toolbar"><button class="primary" onclick="${add.name}()">＋ Add ${title==="Committee"?"Member":title.slice(0,-1)}</button></div><div class="tablewrap">${rows.length?`<table class="table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`:`<div class="empty">No ${title.toLowerCase()} yet. Use the button above to add one.</div>`}</div>`}
function reports(){let d=state.donations.reduce((a,x)=>a+Number(x.amount),0),e=state.expenses.reduce((a,x)=>a+Number(x.amount),0);return `<div class="cards">${card("Donations",money(d),"💰")}${card("Expenses",money(e),"💸")}${card("Balance",money(d-e),"📈")}${card("Members",state.members.length,"👥")}</div><div class="card section"><h3>Festival report</h3><p>This report summarizes the currently stored Festival OS data.</p><button class="primary" onclick="downloadReport()">Export JSON Report</button></div>`}
function generic(p){return `<div class="card"><h2>${icon(p)} ${p}</h2><p class="muted">This workspace is ready for the ${p.toLowerCase()} module. The architecture supports adding custom fields, workflows and festival-specific configuration.</p>${p==="Volunteers"?`<button class="primary" onclick="addMember()">＋ Add Volunteer</button>`:""}${p==="Registrations"?`<button class="primary" onclick="addMember()">＋ Add Registration</button>`:""}</div>`}
function modal(title,body){const d=document.createElement("div");d.className="modal";d.id="modal";d.innerHTML=`<div class="modalbox"><h2>${title}</h2>${body}</div>`;document.body.appendChild(d)}
function closeModal(){document.querySelector("#modal")?.remove()}
function newFestival(){modal("Create Festival",`<form class="form" onsubmit="event.preventDefault();createFestival(this)"><label>Name<input name="name" required></label><label>Year<input name="year" type="number" value="2026" required></label><label>Location<input name="location" value="Penugonda" required></label><label>Type<select name="type"><option>Cultural</option><option>Religious</option><option>Community</option><option>Custom</option></select></label><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Create</button></div></form>`)}
function createFestival(f){let x={id:crypto.randomUUID(),name:f.name.value,year:+f.year.value,location:f.location.value,status:"Active",type:f.type.value};state.festivals.push(x);state.festivalId=x.id;save();closeModal();toast("Festival created");render()}
function copyFestival(){let f=current(),x={...f,id:crypto.randomUUID(),year:f.year+1,name:f.name,status:"Draft"};state.festivals.push(x);state.festivalId=x.id;save();toast("Festival copied");render()}
function addMember(){modal("Add Member",`<form class="form" onsubmit="event.preventDefault();createMember(this)"><label>Name<input name="name" required></label><label>Mobile<input name="mobile"></label><label>Position<input name="position" placeholder="President / Secretary / Volunteer"></label><label>Status<select name="status"><option>Active</option><option>Inactive</option></select></label><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`)}
function createMember(f){state.members.push({id:crypto.randomUUID(),name:f.name.value,mobile:f.mobile.value,position:f.position.value,status:f.status.value,festivalId:state.festivalId});save();closeModal();toast("Member saved");render()}
function addEvent(){modal("Add Event",`<form class="form" onsubmit="event.preventDefault();createEvent(this)"><label>Event Name<input name="name" required></label><label>Date<input name="date" type="date" required></label><label>Time<input name="time" type="time"></label><label>Location<input name="location"></label><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`)}
function createEvent(f){state.events.push({id:crypto.randomUUID(),name:f.name.value,date:f.date.value,time:f.time.value,location:f.location.value,festivalId:state.festivalId});save();closeModal();toast("Event saved");render()}
function addFinance(type){let title=type==="donation"?"Add Donation":"Add Expense";modal(title,`<form class="form" onsubmit="event.preventDefault();createFinance(this,'${type}')"><label>${type==="donation"?"Donor":"Category"}<input name="who" required></label><label>Amount<input name="amount" type="number" min="0" step="0.01" required></label><label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>${type==="donation"?"Purpose":"Paid By"}<input name="note"></label><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`)}
function createFinance(f,type){let x={id:crypto.randomUUID(),amount:+f.amount.value,date:f.date.value};if(type==="donation"){x.donor=f.who.value;x.purpose=f.note.value;state.donations.push(x)}else{x.category=f.who.value;x.paidBy=f.note.value;state.expenses.push(x)}save();closeModal();toast("Saved");render()}
function addTask(){modal("Add Task",`<form class="form" onsubmit="event.preventDefault();createTask(this)"><label>Task<input name="name" required></label><label>Assigned To<input name="assigned"></label><label>Due<input name="due" type="date"></label><label>Status<select name="status"><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save</button></div></form>`)}
function createTask(f){state.tasks.push({id:crypto.randomUUID(),name:f.name.value,assigned:f.assigned.value,due:f.due.value,status:f.status.value});save();closeModal();toast("Task saved");render()}
function downloadReport(){let blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="festival-os-report.json";a.click();URL.revokeObjectURL(a.href)}
function toast(s){let d=document.createElement("div");d.className="toast";d.textContent=s;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}

(async function startUtsavOne(){
  const {data:{session:currentSession}} = await sb.auth.getSession();
  session=currentSession;
  sb.auth.onAuthStateChange((_event,newSession)=>{
    session=newSession;
    if(session) bootApp();
    else document.querySelector("#app").innerHTML=authHtml();
  });
  if(session) await bootApp();
  else document.querySelector("#app").innerHTML=authHtml();
})();

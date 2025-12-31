// Team page script
// This version fetches VTC members from TruckersMP (configurable URL) and
// enhances each member with a player lookup to obtain the avatar and canonical name.

const TEAM_CONFIG = {
  // VTLog VTC members endpoint (switch per request)
  vtcMembersUrl: 'https://api.vtlog.net/v1/vtc/8136/members',
  // Optional: API key for VTLog (will be sent as Bearer token if set)
  apiKey: '289489c3d68c1b4ecaef9eb7b0c90c5c5a97b326772165ca6ca4138c02e0cb00'
};

async function fetchVtcMembers(url){
  try{
    const headers = { 'Accept': 'application/json' };
    if(TEAM_CONFIG.apiKey) headers['Authorization'] = `Bearer ${TEAM_CONFIG.apiKey}`;
    const res = await fetch(url, { headers });
    if(!res.ok){
      // Propagate status for UI reporting
      const msg = `HTTP ${res.status} ${res.statusText}`;
      console.warn('VTC members fetch failed:', msg);
      return { error: true, message: msg };
    }
    const payload = await res.json();
    // VTLog likely returns { data: [ ... ] } — accept multiple shapes for robustness
    let raw = [];
    if(payload && Array.isArray(payload)) raw = payload;
    else if(payload && Array.isArray(payload.data)) raw = payload.data;
    else if(payload && payload.response && Array.isArray(payload.response.members)) raw = payload.response.members;
    else if(payload && Array.isArray(payload.response)) raw = payload.response;

    // Normalize to local shape. Try common field names for name/role/avatar
    return raw.map(m => ({
      name: m.username || m.name || m.display_name || m.player_name || m.driver_name || '',
      role: (m.role && typeof m.role === 'string') ? m.role : (m.position || m.title || (m.roles && m.roles[0] && m.roles[0].name)) || '',
      avatar: m.avatar || m.avatar_url || m.profile_picture || m.avatarUrl || ''
    }));
  }catch(e){
    console.warn('Failed to fetch VTC members:', e);
    return { error: true, message: e && e.message ? String(e.message) : 'unknown error' };
  }
}

// Removed player lookup: we only use the VTC members endpoint you provided.

async function renderTeam(){
  const root = document.getElementById('team-list');
  if(!root) return;
  root.innerHTML = '';

  // Fetch members from configured VTC API
  const members = TEAM_CONFIG.vtcMembersUrl ? await fetchVtcMembers(TEAM_CONFIG.vtcMembersUrl) : { error: true, message: 'No vtcMembersUrl configured' };
  if(!members || members.error){
    const errMsg = members && members.message ? members.message : 'Fehler beim Laden der Mitglieder.';
    const errEl = document.createElement('div'); errEl.className = 'empty'; errEl.textContent = `Fehler: ${errMsg}`;
    root.appendChild(errEl);
    return;
  }

  if(!Array.isArray(members) || members.length === 0){
    root.innerHTML = '<div class="empty">Keine Mitglieder gefunden.</div>';
    return;
  }

  for(const m of members){
    const card = document.createElement('article'); card.className = 'member-card';
    // optional avatar
    if(m.avatar){
      const avatarImg = document.createElement('img'); avatarImg.className = 'member-avatar';
      avatarImg.src = m.avatar;
      card.appendChild(avatarImg);
    }
    const nameEl = document.createElement('div'); nameEl.className = 'member-name';
    const roleEl = document.createElement('div'); roleEl.className = 'member-role';
    nameEl.textContent = m.name || 'Unbekannt';
    roleEl.textContent = m.role || '';

    card.appendChild(nameEl);
    card.appendChild(roleEl);
    root.appendChild(card);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{ renderTeam(); });

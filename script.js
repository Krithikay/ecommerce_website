
const PRODUCTS = [
  { id: 1, title: "Wireless Headphones", category: "electronics", price: 59.99, rating:4.3, desc: "Comfortable over-ear headphones with long battery life.", img: "wireless_headphone.jpg" },
  { id: 2, title: "Classic Tee", category: "clothing", price: 19.99, rating:4.1, desc: "Soft cotton tee available in multiple sizes.", img: "tee.jpg" },
  { id: 3, title: "Ceramic Mug", category: "home", price: 12.5, rating:4.7, desc: "Dishwasher-safe ceramic mug, 350ml.", img: "ceramic mug.jpg" },
  { id: 4, title: "Leather Wallet", category: "accessories", price: 34.0, rating:4.5, desc: "Hand-stitched minimalist wallet.", img: "leather Wallet.jpg" },
  { id: 5, title: "Bestseller Novel", category: "books", price: 9.99, rating:4.8, desc: "An engaging page-turner for weekend reading.", img: "Bestseller Novel.jpg" },
  { id: 6, title: "Denim Jacket", category: "clothing", price: 79.0, rating:4.2, desc: "Classic denim jacket with a modern fit.", img: "Denim Jacket.jpg" },
  // ... add more products as needed
];

/* ---------- Utilities ---------- */
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

function fmtPrice(n){ return "₹" + Number(n).toFixed(2); }
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---------- App state ---------- */
let state = {
  view: 'home',      // home | list | product | cart | checkout | orders
  category: 'all',
  page: 1,
  perPage: 12,
  q: '',
  sort: 'relevance',
  currentProduct: null
};

/* Cart stored in localStorage under key 'ministore_cart' */
const CART_KEY = 'ministore_cart_v1';
function loadCart(){ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); }

let cart = loadCart();

/* ---------- DOM refs ---------- */
const featuredGrid = $('#featuredGrid');
const productGrid = $('#productGrid');
const listTitle = $('#listTitle');
const productDetail = $('#productDetail');
const detailCard = $('#detailCard');
const cartCountEl = $('#cartCount');
const cartContent = $('#cartContent');
const modal = $('#modal');
const modalContent = $('#modalContent');
const modalPanel = $('.modal-panel');

/* ---------- Rendering ---------- */

function renderFeatured(){
  const picks = PRODUCTS.slice(0,4);
  featuredGrid.innerHTML = picks.map(p => productCardHtml(p)).join('');
  // attach events
  $$('.card').forEach(card => {
    card.addEventListener('click', onCardClick);
  });
}

function productCardHtml(p){
  return `
    <article class="card" data-id="${p.id}" role="button" tabindex="0">
      <div class="media"><img src="${p.img}" alt="${escapeHtml(p.title)}"></div>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="desc">${escapeHtml(p.desc)}</p>
      <div class="meta">
        <div class="price">${fmtPrice(p.price)}</div>
        <div><button class="btn small add-btn" data-id="${p.id}">Add</button></div>
      </div>
    </article>
  `;
}

function renderList(){
  const filtered = PRODUCTS.filter(p => {
    if(state.category !== 'all' && p.category !== state.category) return false;
    if(state.q && !(p.title.toLowerCase().includes(state.q) || p.desc.toLowerCase().includes(state.q))) return false;
    return true;
  });

  // sort
  if(state.sort === 'price-asc') filtered.sort((a,b)=>a.price-b.price);
  else if(state.sort === 'price-desc') filtered.sort((a,b)=>b.price-a.price);
  else if(state.sort === 'name-asc') filtered.sort((a,b)=>a.title.localeCompare(b.title));

  const html = filtered.map(productCardHtml).join('');
  productGrid.innerHTML = html;
  $('.section.hidden') && $('.section.hidden'); // noop

  // attach
  $$('.card').forEach(card => card.addEventListener('click', onCardClick));
  $$('.add-btn').forEach(btn => btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    const id = parseInt(btn.getAttribute('data-id'),10);
    addToCartById(id);
  }));
  listTitle.textContent = `Results (${filtered.length})`;
}

/* ---------- Events / Handlers ---------- */

function onCardClick(e){
  const card = e.currentTarget;
  const id = parseInt(card.getAttribute('data-id'),10);
  showProductDetail(id);
}

function showView(view){
  state.view = view;
  // hide all main sections
  $('#featured').classList.toggle('hidden', view !== 'home');
  $('#listings').classList.toggle('hidden', view !== 'list');
  $('#productDetail').classList.toggle('hidden', view !== 'product');
  $('#cartPage').classList.toggle('hidden', view !== 'cart');
  $('#checkoutPage').classList.toggle('hidden', view !== 'checkout');
  $('#ordersPage').classList.toggle('hidden', view !== 'orders');
}

function showProductDetail(id){
  const p = PRODUCTS.find(x => x.id === id);
  if(!p) return;
  state.currentProduct = p;
  showView('product');
  detailCard.innerHTML = `
    <div class="detail-card">
      <div class="detail-media"><img src="${p.img}" alt="${escapeHtml(p.title)}"></div>
      <div class="detail-info">
        <h2>${escapeHtml(p.title)}</h2>
        <p class="desc">${escapeHtml(p.desc)}</p>
        <p><strong>Price:</strong> ${fmtPrice(p.price)}</p>
        <p><strong>Category:</strong> ${escapeHtml(p.category)}</p>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <input id="detailQty" type="number" value="1" min="1" class="qty-input" aria-label="Quantity">
          <button id="detailAdd" class="btn">Add to cart</button>
          <button id="buyNow" class="btn ghost">Buy now</button>
        </div>
      </div>
    </div>
  `;
  $('#backToList').addEventListener('click', ()=>{ showView('list'); });
  $('#detailAdd').addEventListener('click', ()=>{
    const q = Math.max(1, parseInt($('#detailQty').value,10) || 1);
    addToCart(p, q);
    alert('Added to cart');
  });
  $('#buyNow').addEventListener('click', ()=>{
    const q = Math.max(1, parseInt($('#detailQty').value,10) || 1);
    addToCart(p, q);
    goToCheckout();
  });
}

function openModal(contentHtml){
  modalContent.innerHTML = contentHtml;
  modal.setAttribute('aria-hidden','false');
}
function closeModal(){
  modal.setAttribute('aria-hidden','true');
  modalContent.innerHTML = '';
}

/* ---------- Cart functions ---------- */
function addToCart(p, qty=1){
  const id = typeof p === 'number' ? p : p.id;
  const product = typeof p === 'number' ? PRODUCTS.find(x=>x.id===p) : p;
  if(!product) return;
  const existing = cart.find(i=>i.id===product.id);
  if(existing) existing.qty += qty; else cart.push({ id: product.id, qty: qty });
  saveCart(cart);
  renderCartBadge();
}

function addToCartById(id){
  addToCart(id, 1);
  renderList(); // to update any UI if needed
  renderFeatured();
}

function renderCartBadge(){
  const total = cart.reduce((s,i)=>s+i.qty,0);
  cartCountEl.textContent = total;
}

/* render full cart page */
function renderCartPage(){
  showView('cart');
  if(cart.length === 0){
    cartContent.innerHTML = `<div class="cart-list"><p>Your cart is empty.</p></div>`;
    return;
  }
  const rows = cart.map(item => {
    const p = PRODUCTS.find(x=>x.id===item.id);
    return `
      <div class="cart-item">
        <img src="${p.img}" alt="${escapeHtml(p.title)}">
        <div style="flex:1">
          <strong>${escapeHtml(p.title)}</strong>
          <div>${fmtPrice(p.price)} &times; <input class="qty-input" data-id="${p.id}" type="number" min="1" value="${item.qty}"></div>
        </div>
        <div style="text-align:right">
          <div>${fmtPrice(p.price*item.qty)}</div>
          <div style="margin-top:8px"><button class="btn ghost small remove-item" data-id="${p.id}">Remove</button></div>
        </div>
      </div>
    `;
  }).join('');
  const total = cart.reduce((s,i)=> s + (PRODUCTS.find(p=>p.id===i.id).price * i.qty), 0);
  cartContent.innerHTML = `
    <div class="cart-list">${rows}</div>
    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
      <div><strong>Total:</strong> ${fmtPrice(total)}</div>
      <div style="display:flex;gap:8px">
        <button id="continueShopping" class="btn ghost">Continue shopping</button>
        <button id="proceedCheckout" class="btn">Proceed to checkout</button>
      </div>
    </div>
  `;
  // listeners
  $$('.qty-input', cartContent).forEach(inp => {
    inp.addEventListener('change', (e)=>{
      const id = parseInt(e.target.getAttribute('data-id'),10);
      const q = Math.max(1, parseInt(e.target.value,10) || 1);
      const item = cart.find(i=>i.id===id);
      if(item){ item.qty = q; saveCart(cart); renderCartBadge(); renderCartPage(); }
    });
  });
  $$('.remove-item', cartContent).forEach(b => b.addEventListener('click', (e)=>{
    const id = parseInt(e.target.getAttribute('data-id'),10);
    cart = cart.filter(i=>i.id!==id); saveCart(cart); renderCartBadge(); renderCartPage();
  }));
  $('#continueShopping').addEventListener('click', ()=>{ showView('list'); });
  $('#proceedCheckout').addEventListener('click', ()=> goToCheckout());
}

/* ---------- Checkout & Orders (client-side mock) ---------- */
const ORDERS_KEY = 'ministore_orders_v1';
function placeOrder(billing){
  const order = {
    id: 'ORD' + Date.now(),
    items: cart.map(i => ({ id:i.id, qty:i.qty, product: PRODUCTS.find(p=>p.id===i.id) })),
    total: cart.reduce((s,i)=> s + PRODUCTS.find(p=>p.id===i.id).price * i.qty, 0),
    createdAt: new Date().toISOString(),
    billing
  };
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  cart = []; saveCart(cart); renderCartBadge();
  return order;
}

function goToCheckout(){
  // If not "signed in" show sign in modal
  if(!currentUser()){
    openSignInModal(()=> openCheckoutForm());
  } else {
    openCheckoutForm();
  }
}

function openCheckoutForm(){
  showView('checkout');
  const total = cart.reduce((s,i)=> s + PRODUCTS.find(p=>p.id===i.id).price * i.qty, 0);
  $('#checkoutContent').innerHTML = `
    <div class="cart-list">
      <p><strong>Order total:</strong> ${fmtPrice(total)}</p>
      <label>Full name<br><input id="billName" type="text" style="padding:8px;width:100%" /></label>
      <label>Phone or email<br><input id="billContact" type="text" style="padding:8px;width:100%" /></label>
      <label>Address<br><textarea id="billAddress" rows="3" style="padding:8px;width:100%"></textarea></label>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button id="placeOrderBtn" class="btn">Place order (demo)</button>
        <button id="cancelOrder" class="btn ghost">Cancel</button>
      </div>
    </div>
  `;
  $('#placeOrderBtn').addEventListener('click', ()=>{
    const billing = {
      name: $('#billName').value || 'Guest',
      contact: $('#billContact').value || '',
      address: $('#billAddress').value || ''
    };
    if(cart.length===0){ alert('Cart empty'); return; }
    const order = placeOrder(billing);
    $('#checkoutContent').innerHTML = `<h3>Order placed: ${order.id}</h3><p>Total: ${fmtPrice(order.total)}</p><p>We saved this demo order locally. View it in My Orders.</p>`;
  });
  $('#cancelOrder').addEventListener('click', ()=> showView('cart'));
}

/* ---------- Auth (very simple client-side mock) ---------- */
const USERS_KEY = 'ministore_users_v1';
function saveUser(u){
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  users.push(u);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function findUser(email, password){
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  return users.find(x => x.email === email && x.password === password);
}
const CURRENT_KEY = 'ministore_current_v1';
function setCurrentUser(user){ localStorage.setItem(CURRENT_KEY, JSON.stringify(user)); updateAuthUi(); }
function currentUser(){ return JSON.parse(localStorage.getItem(CURRENT_KEY) || 'null'); }
function logout(){ localStorage.removeItem(CURRENT_KEY); updateAuthUi(); }

function openSignInModal(onSuccess){
  const html = `
    <h3>Sign in or Register</h3>
    <div style="display:flex;gap:8px">
      <div style="flex:1">
        <h4>Sign in</h4>
        <label>Email<br><input id="siEmail" type="email" style="padding:8px;width:100%"></label>
        <label>Password<br><input id="siPass" type="password" style="padding:8px;width:100%"></label>
        <div style="margin-top:8px"><button id="doSignIn" class="btn">Sign in</button></div>
      </div>
      <div style="flex:1">
        <h4>Register</h4>
        <label>Name<br><input id="rName" type="text" style="padding:8px;width:100%"></label>
        <label>Email<br><input id="rEmail" type="email" style="padding:8px;width:100%"></label>
        <label>Password<br><input id="rPass" type="password" style="padding:8px;width:100%"></label>
        <div style="margin-top:8px"><button id="doRegister" class="btn ghost">Register</button></div>
      </div>
    </div>
  `;
  openModal(html);
  $('#doSignIn').addEventListener('click', ()=>{
    const email = $('#siEmail').value.trim(), pass = $('#siPass').value;
    const user = findUser(email, pass);
    if(user){ setCurrentUser({name:user.name,email:user.email}); closeModal(); onSuccess && onSuccess(); }
    else alert('Invalid credentials (demo).');
  });
  $('#doRegister').addEventListener('click', ()=>{
    const name = $('#rName').value.trim(), email = $('#rEmail').value.trim(), pass = $('#rPass').value;
    if(!name || !email || !pass){ alert('Fill all'); return; }
    saveUser({name,email,password:pass});
    setCurrentUser({name,email}); closeModal(); onSuccess && onSuccess();
  });
}

/* ---------- Orders UI ---------- */
function renderOrders(){
  showView('orders');
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  if(orders.length===0){ $('#ordersContent').innerHTML = '<p>No orders yet.</p>'; return; }
  const html = orders.map(o => `
    <div class="cart-list" style="margin-bottom:12px;padding:12px">
      <strong>Order ${o.id}</strong> — ${new Date(o.createdAt).toLocaleString()}<br>
      Items: ${o.items.map(it => `${escapeHtml(it.product.title)} x${it.qty}`).join(', ')}<br>
      Total: ${fmtPrice(o.total)}<br>
      Ship to: ${escapeHtml(o.billing.name)} — ${escapeHtml(o.billing.contact)}
    </div>
  `).join('');
  $('#ordersContent').innerHTML = html;
}

/* ---------- Misc utilities: Export CSV, Print ---------- */
function exportProductsCsv(){
  const rows = [['id','title','category','price','desc']];
  PRODUCTS.forEach(p => rows.push([p.id, `"${p.title.replace(/"/g,'""')}"`, p.category, p.price, `"${p.desc.replace(/"/g,'""')}"`]));
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'products.csv'; a.click(); URL.revokeObjectURL(a.href);
}
function printProducts(){
  const w = window.open('','_blank'); const html = `
    <html><head><title>Products</title><style>body{font-family:Arial;padding:20px}</style></head><body>
    <h1>Product list</h1><ul>${PRODUCTS.map(p=>`<li>${escapeHtml(p.title)} — ${fmtPrice(p.price)} (${escapeHtml(p.category)})</li>`).join('')}</ul>
    </body></html>`;
  w.document.write(html); w.document.close(); w.print();
}

/* ---------- Initialization & event wiring ---------- */

function updateAuthUi(){
  const user = currentUser();
  if(user){
    $('#signinBtn').textContent = `Hi, ${user.name.split(' ')[0]}`; $('#signinBtn').classList.add('ghost');
    $('#signinBtn').removeEventListener('click', promptSignIn);
    $('#signinBtn').addEventListener('click', ()=> {
      if(confirm('Log out?')){ logout(); }
    });
  } else {
    $('#signinBtn').textContent = 'Sign in';
    $('#signinBtn').addEventListener('click', promptSignIn);
  }
}

function promptSignIn(){ openSignInModal(()=>{}); }

function wireUi(){
  // header actions
  $('#shopNow').addEventListener('click', ()=> { showView('list'); state.view='list'; state.category='all'; renderList(); });
  $('#cartBtn').addEventListener('click', ()=> { renderCartPage(); });
  $$('.cat-btn').forEach(b => b.addEventListener('click', (e)=>{
    $$('.cat-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.category = b.getAttribute('data-cat');
    showView('list');
    renderList();
  }));
  $('#searchForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    state.q = $('#searchInput').value.trim().toLowerCase();
    state.sort = $('#sortSelect').value;
    showView('list'); renderList();
  });
  $('#sortSelect').addEventListener('change', ()=>{ state.sort = $('#sortSelect').value; renderList(); });

  // modal close handlers
  document.addEventListener('click', (e)=>{
    if(e.target.matches('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

  // footer links
  $('#exportCsv').addEventListener('click', (e)=>{ e.preventDefault(); exportProductsCsv(); });
  $('#printList').addEventListener('click', (e)=>{ e.preventDefault(); printProducts(); });
  $('#viewOrders').addEventListener('click', (e)=>{ e.preventDefault(); renderOrders(); });

  // modal click inside
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

  // sign-in button
  $('#signinBtn').addEventListener('click', ()=> openSignInModal(()=>{}));
}

/* ---------- Boot ---------- */
function boot(){
  renderFeatured();
  renderList(); // initial list behind hero
  renderCartBadge();
  wireUi();
  updateAuthUi();
}
boot();

/* ---------- Accessibility: focus trap for modal (simple) ---------- */
modal.addEventListener('keydown', (e)=>{
  if(e.key === 'Tab'){
    const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if(focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length-1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
});


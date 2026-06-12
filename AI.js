// ai.js — Shared AI helper used by all pages + ai.html
// Calls Anthropic API via the artifact proxy

const AI_MODEL = 'claude-sonnet-4-6';

async function callAI(systemPrompt, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}

// ── Fetch live data helpers ───────────────────────────────────────────────────
const API = 'http://127.0.0.1:5000/api';

async function fetchData(endpoint, fallback) {
  try {
    const r = await fetch(API + endpoint);
    return await r.json();
  } catch(e) { return fallback; }
}

// ── 1. Sales Insight for a dealer or distributor page ─────────────────────────
async function getSalesInsight(type, data) {
  const total = data.reduce((s,d) => s + Number(d.sales), 0);
  const active = data.filter(d => d.status === 'Active').length;
  const top = data.reduce((m,d) => Number(d.sales) > Number(m.sales) ? d : m, data[0]);
  const inactive = data.filter(d => d.status === 'Inactive');

  const prompt = `You are a business analyst for SAIL, an Indian steel company. 
Analyze this ${type} performance data and give 3-4 short, specific, actionable insights.
Use bullet points. Be concise. Mention specific names and numbers from the data.`;

  const msg = `${type} Data:
- Total ${type}s: ${data.length} (${active} active, ${data.length - active} inactive)
- Total Sales: ₹${total.toLocaleString()}
- Top performer: ${top?.name} with ₹${Number(top?.sales).toLocaleString()}
- Inactive: ${inactive.map(d=>d.name).join(', ') || 'None'}
Full data: ${JSON.stringify(data)}`;

  return callAI(prompt, msg);
}

// ── 2. Inventory Alert ────────────────────────────────────────────────────────
async function getInventoryAlert(items) {
  const lowStock = items.filter(i => i.status === 'Low Stock' || i.quantity < 500);
  const outOfStock = items.filter(i => i.status === 'Out of Stock' || i.quantity === 0);
  const totalValue = items.reduce((s,i) => s + (i.quantity * i.unit_price), 0);

  const prompt = `You are an inventory manager for SAIL steel company.
Analyze the inventory and give specific alerts and reorder recommendations.
Use bullet points. Be direct and practical. Mention product names and quantities.`;

  const msg = `Inventory Summary:
- Total products: ${items.length}
- Low stock items: ${lowStock.map(i => i.product_name + ' (' + i.quantity + ' ' + i.unit + ')').join(', ') || 'None'}
- Out of stock: ${outOfStock.map(i => i.product_name).join(', ') || 'None'}
- Total inventory value: ₹${totalValue.toLocaleString()}
Full inventory: ${JSON.stringify(items)}`;

  return callAI(prompt, msg);
}

// ── 3. Report Summary ─────────────────────────────────────────────────────────
async function getReportSummary(dealers, dists, transactions, inventory) {
  const totalIncome  = transactions.filter(t=>t.type==='Credit').reduce((s,t)=>s+Number(t.amount),0);
  const totalExpense = transactions.filter(t=>t.type==='Debit').reduce((s,t)=>s+Number(t.amount),0);
  const pending      = transactions.filter(t=>t.status==='Pending').reduce((s,t)=>s+Number(t.amount),0);

  const prompt = `You are a senior business analyst for SAIL, an Indian steel distribution company.
Write a concise executive summary (5-6 bullet points) covering: financial performance, 
top performers, inventory health, and 2 strategic recommendations.
Be specific with numbers. Professional tone.`;

  const msg = `Business Data:
FINANCIALS: Income ₹${totalIncome.toLocaleString()}, Expenses ₹${totalExpense.toLocaleString()}, Net ₹${(totalIncome-totalExpense).toLocaleString()}, Pending ₹${pending.toLocaleString()}
DEALERS (${dealers.length}): Top - ${dealers.sort((a,b)=>b.sales-a.sales)[0]?.name} ₹${dealers[0]?.sales?.toLocaleString()}
DISTRIBUTORS (${dists.length}): Top - ${dists.sort((a,b)=>b.sales-a.sales)[0]?.name} ₹${dists[0]?.sales?.toLocaleString()}
INVENTORY: ${inventory.length} products, ${inventory.filter(i=>i.status==='Low Stock').length} low stock`;

  return callAI(prompt, msg);
}

// ── UI helper — inject an AI insight box into a page ─────────────────────────
function createInsightBox(containerId, title) {
  const existing = document.getElementById('aiInsightBox');
  if (existing) existing.remove();

  const box = document.createElement('div');
  box.id = 'aiInsightBox';
  box.style.cssText = `
    background:white; border-radius:15px; padding:24px; margin-bottom:24px;
    box-shadow:0 2px 10px rgba(0,0,0,0.1); border-left:4px solid #667eea;
  `;
  box.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h3 style="color:#1e293b;font-size:16px;">🤖 ${title}</h3>
      <button id="aiRefreshBtn" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;">✨ Get AI Insights</button>
    </div>
    <div id="aiInsightContent" style="color:#475569;font-size:14px;line-height:1.7;">
      Click <strong>Get AI Insights</strong> to analyze your data with AI.
    </div>
  `;

  const container = document.getElementById(containerId);
  if (container) container.parentNode.insertBefore(box, container);

  return box;
}

function showAILoading() {
  const el = document.getElementById('aiInsightContent');
  if (el) el.innerHTML = '<span style="color:#667eea;">⏳ AI is analyzing your data...</span>';
}

function showAIResult(text) {
  const el = document.getElementById('aiInsightContent');
  if (!el) return;
  // Convert bullet points to styled HTML
  const html = text
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*')
      ? `<div style="padding:4px 0 4px 16px;border-left:3px solid #667eea;margin:6px 0;">${l.replace(/^[•\-\*]\s*/,'')}</div>`
      : `<p style="margin:6px 0;">${l}</p>`)
    .join('');
  el.innerHTML = html;
}

function showAIError() {
  const el = document.getElementById('aiInsightContent');
  if (el) el.innerHTML = '<span style="color:#ef4444;">⚠️ Could not connect to AI. Check your internet connection.</span>';
}
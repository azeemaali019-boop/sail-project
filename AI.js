// ai.js — shared AI helper for all SAIL pages
// All Gemini API calls go through Flask (/api/ai) to avoid browser CORS blocks

var AI_FLASK = 'http://127.0.0.1:5000/api/ai';

// ── Core call: sends prompt to Flask which calls Gemini ───────────────────────
async function callAI(systemPrompt, userMessage) {
  var res = await fetch(AI_FLASK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ system: systemPrompt, message: userMessage })
  });
  var data = await res.json().catch(function() { return null; });
  if (!res.ok) {
    var msg = data && data.error ? data.error : ('AI API error: ' + res.status);
    throw new Error(msg);
  }
  if (!data || typeof data.reply !== 'string') {
    throw new Error('AI API returned invalid response');
  }
  return data.reply;
}

// ── 1. Sales Insight ──────────────────────────────────────────────────────────
async function getSalesInsight(type, data) {
  var total   = data.reduce(function(s,d){ return s + Number(d.sales); }, 0);
  var active  = data.filter(function(d){ return d.status === 'Active'; }).length;
  var sorted  = data.slice().sort(function(a,b){ return Number(b.sales)-Number(a.sales); });
  var top     = sorted[0];
  var bottom  = sorted[sorted.length-1];
  var inactive = data.filter(function(d){ return d.status==='Inactive'; }).map(function(d){ return d.name; });

  var sys = 'You are a business analyst for SAIL, an Indian steel company. '
    + 'Analyze the ' + type + ' performance data and give 4 short bullet point insights. '
    + 'Be specific — use actual names and numbers. Each bullet on a new line starting with -';

  var msg = type + ' Summary:\n'
    + '- Total: ' + data.length + ' (' + active + ' active, ' + (data.length-active) + ' inactive)\n'
    + '- Total Sales: ₹' + total.toLocaleString() + '\n'
    + '- Top performer: ' + (top ? top.name + ' ₹' + Number(top.sales).toLocaleString() : 'N/A') + '\n'
    + '- Lowest performer: ' + (bottom ? bottom.name + ' ₹' + Number(bottom.sales).toLocaleString() : 'N/A') + '\n'
    + '- Inactive: ' + (inactive.length ? inactive.join(', ') : 'None') + '\n\n'
    + 'Full data: ' + JSON.stringify(data);

  return callAI(sys, msg);
}

// ── 2. Inventory Alert ────────────────────────────────────────────────────────
async function getInventoryAlert(items) {
  var low     = items.filter(function(i){ return i.status==='Low Stock'; });
  var out     = items.filter(function(i){ return i.status==='Out of Stock'; });
  var value   = items.reduce(function(s,i){ return s+(i.quantity*i.unit_price); }, 0);

  var sys = 'You are an inventory manager for SAIL steel company. '
    + 'Analyze the inventory and give 4 bullet point alerts and reorder recommendations. '
    + 'Mention specific product names, quantities and urgency. Each bullet on a new line starting with -';

  var msg = 'Inventory Summary:\n'
    + '- Total products: ' + items.length + '\n'
    + '- Low stock: ' + (low.map(function(i){ return i.product_name+'('+i.quantity+' '+i.unit+')'; }).join(', ')||'None') + '\n'
    + '- Out of stock: ' + (out.map(function(i){ return i.product_name; }).join(', ')||'None') + '\n'
    + '- Total inventory value: ₹' + value.toLocaleString() + '\n\n'
    + 'Full data: ' + JSON.stringify(items);

  return callAI(sys, msg);
}

// ── 3. Report Summary ─────────────────────────────────────────────────────────
async function getReportSummary(dealers, dists, transactions, inventory) {
  var income  = transactions.filter(function(t){ return t.type==='Credit'; }).reduce(function(s,t){ return s+Number(t.amount); },0);
  var expense = transactions.filter(function(t){ return t.type==='Debit';  }).reduce(function(s,t){ return s+Number(t.amount); },0);
  var pending = transactions.filter(function(t){ return t.status==='Pending'; }).reduce(function(s,t){ return s+Number(t.amount); },0);

  var sys = 'You are a senior business analyst for SAIL, an Indian steel distribution company. '
    + 'Write a concise executive summary with 5-6 bullet points covering: financial health, '
    + 'top performers, inventory status, and 2 strategic recommendations. '
    + 'Be specific with numbers. Each bullet on a new line starting with -';

  var msg = 'Business Overview:\n'
    + 'FINANCIALS: Income ₹'+income.toLocaleString()+', Expenses ₹'+expense.toLocaleString()
    + ', Net ₹'+(income-expense).toLocaleString()+', Pending ₹'+pending.toLocaleString()+'\n'
    + 'DEALERS ('+dealers.length+'): '+dealers.map(function(d){ return d.name+' ₹'+Number(d.sales).toLocaleString(); }).join(', ')+'\n'
    + 'DISTRIBUTORS ('+dists.length+'): '+dists.map(function(d){ return d.name+' ₹'+Number(d.sales).toLocaleString(); }).join(', ')+'\n'
    + 'INVENTORY: '+inventory.length+' products, '+inventory.filter(function(i){ return i.status==='Low Stock'; }).length+' low stock\n';

  return callAI(sys, msg);
}
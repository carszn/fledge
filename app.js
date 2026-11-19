/* Fledge site script: chatbot "Pip", Paycheck Planner, scroll reveals */
(function () {
  "use strict";

  var BIRD = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 38c0-12 9-22 22-22 7 0 12 3 15 7l9-2-6 7c1 2 1 4 1 6 0 12-10 20-22 20-11 0-19-6-19-16z" fill="#13203a"/><path d="M24 36c6 0 12 3 16 9-9 3-19 1-24-6 2-2 5-3 8-3z" fill="#2a9d8f"/><circle cx="40" cy="27" r="3" fill="#fff"/><circle cx="41" cy="27" r="1.5" fill="#13203a"/></svg>';

  var money = function (n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  };
  var fv = function (monthly, years, rate) {
    var r = (rate || 0.07) / 12, n = years * 12;
    return monthly * ((Math.pow(1 + r, n) - 1) / r);
  };

  /* ---------- video: make sure it autoplays + loops ---------- */
  document.querySelectorAll("video[autoplay]").forEach(function (v) {
    v.muted = true;
    v.loop = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      document.addEventListener("click", function once() { v.play(); document.removeEventListener("click", once); });
    });
  });

  /* ---------- scroll reveal ---------- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  document.querySelectorAll(".reveal").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });

  /* ---------- Paycheck Planner (X-Factor) ---------- */
  var planner = document.getElementById("planner-app");
  if (planner) {
    var pay = document.getElementById("pay");
    var rN = document.getElementById("r-needs"), rW = document.getElementById("r-wants"), rS = document.getElementById("r-save");
    var arcs = { needs: document.getElementById("arc-needs"), wants: document.getElementById("arc-wants"), save: document.getElementById("arc-save") };
    var C = 2 * Math.PI * 80;
    var shown = {};

    var countTo = function (el, to) {
      var from = shown[el.id] || 0, t0 = performance.now();
      shown[el.id] = to;
      var tick = function (t) {
        var k = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - k, 3);
        el.textContent = money(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    var balance = function (changed) {
      var vals = { n: +rN.value, w: +rW.value, s: +rS.value };
      var key = changed === rN ? "n" : changed === rW ? "w" : changed === rS ? "s" : null;
      var over = vals.n + vals.w + vals.s - 100;
      if (key && over !== 0) {
        var others = ["n", "w", "s"].filter(function (k) { return k !== key; });
        others.sort(function (a, b) { return over > 0 ? vals[b] - vals[a] : vals[a] - vals[b]; });
        others.forEach(function (k) {
          var take = over > 0 ? Math.min(over, vals[k]) : Math.max(over, vals[k] - 100);
          vals[k] -= take; over -= take;
        });
      }
      rN.value = vals.n; rW.value = vals.w; rS.value = vals.s;
    };

    var drawGrowth = function (monthly) {
      var svg = document.getElementById("growth"), W = 600, H = 130, pts = [], max = fv(monthly, 30) || 1;
      for (var y = 0; y <= 30; y++) pts.push([y / 30 * W, H - 8 - (fv(monthly, y) || 0) / max * (H - 20)]);
      var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      svg.innerHTML =
        '<defs><linearGradient id="gg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f2a541" stop-opacity=".55"/><stop offset="1" stop-color="#f2a541" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + line + " L" + W + " " + H + " L0 " + H + ' Z" fill="url(#gg)"/>' +
        '<path d="' + line + '" fill="none" stroke="#f2a541" stroke-width="3" stroke-linecap="round"/>' +
        [10, 20, 30].map(function (y) { var p = pts[y]; return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#fff" stroke="#f2a541" stroke-width="3"/>'; }).join("");
    };

    var update = function (e) {
      balance(e && e.target);
      var p = Math.max(0, parseFloat(String(pay.value).replace(/[^0-9.]/g, "")) || 0);
      var n = +rN.value, w = +rW.value, s = +rS.value;
      document.getElementById("l-needs").textContent = n + "%";
      document.getElementById("l-wants").textContent = w + "%";
      document.getElementById("l-save").textContent = s + "%";
      countTo(document.getElementById("v-needs"), p * n / 100);
      countTo(document.getElementById("v-wants"), p * w / 100);
      countTo(document.getElementById("v-save"), p * s / 100);
      countTo(document.getElementById("d-total"), p);
      var off = 0;
      [["needs", n], ["wants", w], ["save", s]].forEach(function (pair) {
        var len = C * pair[1] / 100;
        arcs[pair[0]].style.strokeDasharray = len + " " + (C - len);
        arcs[pair[0]].style.strokeDashoffset = -off;
        off += len;
      });
      var monthly = p * s / 100;
      countTo(document.getElementById("f10"), fv(monthly, 10));
      countTo(document.getElementById("f20"), fv(monthly, 20));
      countTo(document.getElementById("f30"), fv(monthly, 30));
      drawGrowth(monthly);
      var v = document.getElementById("verdict");
      v.innerHTML = s >= 20 ? "🐣 <b>Ready to fly.</b> Saving " + s + "% hits the classic 50/30/20 target. Future you says thanks."
        : s >= 10 ? "🪺 <b>Building the nest.</b> " + s + "% is a solid start; nudging toward 20% speeds up your safety net."
        : "🥚 <b>Still in the shell.</b> Even 5–10% saved automatically on payday adds up faster than you'd think.";
      document.querySelectorAll(".preset").forEach(function (b) {
        b.classList.toggle("on", b.dataset.split === n + "/" + w + "/" + s);
      });
    };

    [pay, rN, rW, rS].forEach(function (el) { el.addEventListener("input", update); });
    document.querySelectorAll(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = b.dataset.split.split("/");
        rN.value = parts[0]; rW.value = parts[1]; rS.value = parts[2];
        update();
      });
    });
    update();
  }

  /* ---------- Chatbot: Pip ---------- */
  var mount = document.createElement("div");
  mount.innerHTML =
    '<button class="chat-launch" id="chat-launch" aria-controls="chat" aria-expanded="false"><span class="av">' + BIRD + '</span>Ask Pip <span class="dot"></span></button>' +
    '<div class="chat" id="chat" role="dialog" aria-label="Chat with Pip">' +
    '<div class="chat-head"><span class="av">' + BIRD + '</span><div><b>Pip</b><small>Fledge money coach · online</small></div><button id="chat-close" aria-label="Close chat">×</button></div>' +
    '<div class="chat-log" id="chat-log" aria-live="polite"></div>' +
    '<div class="chat-chips" id="chat-chips"></div>' +
    '<form class="chat-form" id="chat-form"><input id="chat-input" autocomplete="off" placeholder="Ask about budgets, 401(k)s, credit…" aria-label="Message Pip"><button aria-label="Send">➤</button></form></div>';
  document.body.appendChild(mount);

  var chat = document.getElementById("chat"), log = document.getElementById("chat-log"),
      chips = document.getElementById("chat-chips"), form = document.getElementById("chat-form"),
      input = document.getElementById("chat-input"), launch = document.getElementById("chat-launch");

  var store = {
    get: function () { try { return JSON.parse(sessionStorage.getItem("pip-log") || "[]"); } catch (e) { return []; } },
    set: function (v) { try { sessionStorage.setItem("pip-log", JSON.stringify(v.slice(-40))); } catch (e) {} }
  };
  var history = store.get();

  var add = function (who, html, save) {
    var d = document.createElement("div");
    d.className = "msg " + who;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    if (save !== false) { history.push([who, html]); store.set(history); }
  };
  var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  var DEFAULT_CHIPS = ["What is Fledge?", "Split a $3,500 paycheck", "Save $200/month?", "401(k) match", "Pricing"];
  var setChips = function (list) {
    chips.innerHTML = "";
    (list || DEFAULT_CHIPS).forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = t;
      b.onclick = function () { send(t); };
      chips.appendChild(b);
    });
  };

  // Pull the most likely dollar amount out of a message. Ignores percentages and
  // "401(k)"/"403(b)", prefers $-prefixed figures, otherwise takes the largest number.
  var num = function (text) {
    var s = text.replace(/,/g, "").replace(/40[13]\s*\(?[kb]\)?/gi, " ");
    var re = /(\$)?\s*(\d+(?:\.\d+)?)\s*(k\b)?(\s*%)?/gi, m, best = null;
    while ((m = re.exec(s))) {
      if (m[4]) continue;
      var v = parseFloat(m[2]) * (m[3] ? 1000 : 1);
      if (m[1]) return v;
      if (best === null || v > best) best = v;
    }
    return best;
  };
  var has = function (t, words) { return words.some(function (w) { return t.indexOf(w) > -1; }); };

  var GREETING = "Hey! I'm Pip 🐦, Fledge's money coach. Ask me about budgeting, saving, your first 401(k), credit, or student loans. I can also run quick numbers for you.";
  var ABOUT = "<b>Fledge</b> is a money app for people getting their first real paycheck. Bite-size lessons, a paycheck planner, and auto-save challenges turn \"I should really figure out my finances\" into a 10-minute weekly habit. <a href='learn.html'>See how it works →</a>";

  var reply = function (raw) {
    var t = raw.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/\s+/g, " ").trim();

    /* ---- small talk ---- */
    var greet = /^(hi|hey|hello|hiya|howdy|yo|sup|good (morning|afternoon|evening))\b[\s,!.]*(there|pip)?[\s,!.]*/;
    if (greet.test(t)) {
      var rest = t.replace(greet, "");
      if (!rest) return [GREETING];
      t = rest; // "hi, what is fledge?" -> answer the question
    }
    var n = num(t);
    if (has(t, ["thank", "thx", "appreciate"])) return ["Anytime! Small, steady moves are how fledglings learn to fly. 🪶"];
    if (/^(ok |okay )?(bye|goodbye|see ya|see you|later|cya|gtg)\b/.test(t)) return ["Bye for now. Your future self is cheering you on. 👋"];
    if (/^(ok|okay|k|kk|cool|nice|great|awesome|got it|sounds good|perfect|sweet|lol|haha|wow|interesting)[.! ]*$/.test(t))
      return ["👍 Anything else? I can split a paycheck, project how your savings grow, or explain 401(k)s, credit, and student loans.", DEFAULT_CHIPS];
    if (/^(test|testing)\b/.test(t))
      return ["Loud and clear! 🐦 I'm Pip, Fledge's money coach. Try one of the questions below, or ask me anything about budgeting, saving, credit, or your first 401(k).", DEFAULT_CHIPS];
    if (/\b(your name|who are (you|u)|who r u|what are you|are (you|u) (a |an )?(bot|ai|robot|human|real|person|chatbot))\b/.test(t))
      return ["I'm <b>Pip</b> 🐦, Fledge's built-in money coach. I'm a chatbot (not a human or a licensed advisor) that answers questions about budgeting, saving, credit, 401(k)s, and student loans, and I can run quick numbers like a 50/30/20 split or how $200/month grows.", DEFAULT_CHIPS];
    if (/\b(how are (you|u)|how's it going|how is it going|how (are )?you doing|what's up|whats up)\b/.test(t))
      return ["Doing great and fully fledged, thanks for asking! 🐦 How's your money doing? I can split a paycheck, project savings growth, or explain 401(k)s and credit.", DEFAULT_CHIPS];
    if (/\b(joke|funny|make me laugh)\b/.test(t))
      return ["Why did the bird open a high-yield savings account? It wanted to build a <b>nest egg</b>. 🥚 OK, back to business: want me to split a paycheck for you?", ["Split a $3,500 paycheck", "Save $200/month?"]];

    /* ---- waitlist email ---- */
    var email = raw.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
    if (email)
      return ["🎉 You're on the list, <b>" + esc(email[0]) + "</b>! We'll send an early-access invite as soon as a spot opens. (Class concept demo: no emails are actually sent.)"];

    /* ---- number crunching ---- */
    if (n && has(t, ["save", "saving", "invest", "grow", "put away", "/month", "a month", "per month", "monthly", "each month", "every month"]) && !has(t, ["paycheck", "take home", "take-home", "split", "budget", "salary", "income", "make", "earn"])) {
      return ["If you invest <b>" + money(n) + "/month</b> at a 7% average annual return:<ul><li>10 years → <b>" + money(fv(n, 10)) + "</b></li><li>20 years → <b>" + money(fv(n, 20)) + "</b></li><li>30 years → <b>" + money(fv(n, 30)) + "</b></li></ul>You'd contribute " + money(n * 360) + " over 30 years; compound growth does the rest. Try the <a href='index.html#planner'>Paycheck Planner</a> to play with it.", ["Roth vs traditional?", "Index funds?", "Emergency fund"]];
    }
    if (n && has(t, ["paycheck", "take home", "take-home", "split", "budget", "salary", "income", "make", "earn"])) {
      var monthly = n > 20000 ? n / 12 : n;
      var note = n > 20000 ? " (treating " + money(n) + " as a yearly figure → about " + money(monthly) + "/month; use take-home pay after taxes for the most accurate split)" : "";
      return ["Here's a 50/30/20 split of <b>" + money(monthly) + "</b>" + note + ":<ul><li>Needs (50%) → <b>" + money(monthly * 0.5) + "</b></li><li>Wants (30%) → <b>" + money(monthly * 0.3) + "</b></li><li>Savings & debt (20%) → <b>" + money(monthly * 0.2) + "</b></li></ul>That 20% invested monthly could reach about <b>" + money(fv(monthly * 0.2, 30)) + "</b> in 30 years at 7%.", ["Emergency fund", "Pay off debt first?", "401(k) match"]];
    }

    /* ---- Fledge plans by name ---- */
    if (has(t, ["flock", "for employers", "my company", "hr team"]))
      return ["<b>Flock</b> is Fledge for employers: every new hire gets the Flight plan, plus guided benefits-enrollment walkthroughs and anonymous, aggregate wellness reporting for HR. Pricing is per seat. <a href='learn.html#pricing'>See plans →</a>"];
    if (has(t, ["flight"]))
      return ["<b>Flight</b> is $6/month: everything in the free Nest plan plus auto-save challenges with streaks, goal and net-worth tracking, and a monthly 1:1 coach chat. Most members start free and upgrade once they've built the habit."];
    if (has(t, ["nest plan", "free plan"]))
      return ["<b>Nest</b> is free forever: all 8 core modules, the Paycheck Planner, and me, Pip. 🐦"];
    if (/\b(who (made|built|created|designed|runs|owns|founded|started)|founder|is (this|fledge|it) (a )?real|real company|legit|scam|class project|school project)\b/.test(t))
      return ["Fledge is a concept startup created as a class project, so the app itself isn't live yet. Everything on this site works, though: the <a href='index.html#planner'>Paycheck Planner</a> does real math, and I can answer money questions and add you to the demo waitlist.", ["What is Fledge?", "Pricing", "Split a $3,500 paycheck"]];

    /* ---- money topics (checked before generic pricing words like "plan" or "free") ---- */
    if (has(t, ["401", "403(b)", "403b", "match", "retirement", "pension"]))
      return ["Rule #1 of a new job: <b>get the full 401(k) match</b>. If your employer matches 50% up to 6% of salary, contributing 6% earns an instant 50% return on that money. Nothing else in personal finance beats that.", ["Roth vs traditional?", "Save $300/month?"]];
    if (has(t, ["roth", "ira", "traditional"]))
      return ["<b>Roth</b>: pay taxes now, withdraw tax-free in retirement. Great early in your career when your tax bracket is lower. <b>Traditional</b>: tax break now, pay taxes later. Many new grads do Roth first, then shift as income rises."];
    if (has(t, ["emergency", "rainy day", "safety net"]))
      return ["Aim for <b>3–6 months of essential expenses</b> in a high-yield savings account. Start with a $1,000 mini-fund, then build up. Automate a transfer on payday so you never \"see\" the money."];
    if (/\bapr\b/.test(t))
      return ["<b>APR</b> (annual percentage rate) is the yearly cost of borrowing. Credit cards often charge 20%+ APR, so a balance you carry grows fast. Pay the full statement balance each month and the APR never touches you."];
    if (has(t, ["credit score", "credit card", "credit", "fico"]))
      return ["Credit score basics: pay on time every time (35% of your score), keep utilization under 30%, ideally under 10%, and don't close your oldest card. Set autopay for at least the minimum so you never miss."];
    if (has(t, ["student loan", "loans", "sallie", "fafsa"]))
      return ["For student loans: know your rates, enroll in autopay (often a 0.25% discount), and look at income-driven plans if payments are tight. Extra payments go furthest on your <b>highest-rate</b> loan."];
    if (has(t, ["debt", "avalanche", "snowball", "pay off"]))
      return ["Two proven methods:<ul><li><b>Avalanche</b>: pay highest interest first (saves the most money)</li><li><b>Snowball</b>: pay smallest balance first (quick wins, more motivation)</li></ul>Pick the one you'll actually stick with. Always grab the 401(k) match first."];
    if (/compound|\binterest\b/.test(t))
      return ["<b>Compound interest</b> is interest earning interest. Invest $200/month at a 7% average return and after 30 years you've put in $72,000, but the account is worth about <b>" + money(fv(200, 30)) + "</b>. Time does most of the work, so starting early beats starting big.", ["Save $200/month?", "Index funds?"]];
    if (has(t, ["inflation", "cpi"]))
      return ["<b>Inflation</b> is prices rising over time, so each dollar buys a bit less every year. It's why cash under the mattress quietly loses value and why long-term money belongs in investments that historically outpace inflation, like broad index funds."];
    if (has(t, ["net worth"]))
      return ["<b>Net worth</b> = everything you own (cash, investments, retirement accounts) minus everything you owe (loans, card balances). It's normal for it to start negative with student loans; the goal is to watch it climb. Fledge's Flight plan tracks it for you."];
    if (/\brent\b|apartment|lease/.test(t))
      return ["A common guideline: keep rent around <b>30% of your gross income</b> or comfortably inside the 50% \"needs\" slice of a 50/30/20 budget. Tell me your monthly take-home pay (e.g. \"split $4,000\") and I'll show you the numbers."];
    if (/\b(house|home|mortgage|down payment)\b/.test(t))
      return ["Before buying a home: build your emergency fund first, save for a down payment (20% avoids PMI, though many first-time programs allow less), and aim for a total housing payment around 28% of gross income. Renting a bit longer while you save is a perfectly good plan."];
    if (/\b(car|cars|auto loan|car loan)\b/.test(t))
      return ["Car rule of thumb: put meaningful money down, keep the loan to 4 years or less, and keep total car costs under about 10% of your income. Saving a set amount each payday into a separate \"car fund\" makes it painless."];
    if (has(t, ["advice", "should i buy", "crypto", "bitcoin", "which stock", "what stock"]))
      return ["I keep it educational. Fledge isn't a financial advisor, so for personal investment decisions talk to a licensed professional. Happy to explain the concepts, though!"];
    if (has(t, ["index fund", "etf", "stock", "invest", "s&p", "market"]))
      return ["Simple starter recipe: a low-cost <b>broad-market index fund</b> or target-date fund, held for years. Keep fees low (under 0.2%), automate contributions, and ignore the daily noise."];
    if (has(t, ["tax", "w-4", "w4", "withholding", "refund"]))
      return ["Your W-4 tells your employer how much tax to withhold. A huge refund means you over-withheld (an interest-free loan to the IRS); owing a lot means you under-withheld. The IRS Tax Withholding Estimator helps you dial it in."];
    if (has(t, ["hysa", "high yield", "high-yield", "savings account", "bank"]))
      return ["A <b>high-yield savings account</b> (HYSA) pays far more interest than a typical big-bank savings account and is still FDIC-insured. It's the perfect home for your emergency fund."];

    /* ---- Fledge the product ---- */
    if (has(t, ["price", "pricing", "cost", "how much is", "how much does", "free", "subscription", "plan", "tier"]))
      return ["Three tiers:<ul><li><b>Nest</b>: free (lessons + planner)</li><li><b>Flight</b>: $6/mo (auto-save challenges, goal tracking, 1:1 chat)</li><li><b>Flock</b>: for employers, bundled as a benefit</li></ul>Details are on the <a href='learn.html#pricing'>How it works</a> page."];
    if (has(t, ["feature", "how does it work", "how it works", "how does fledge work", "app do", "lesson", "module", "course"]))
      return ["Fledge has four parts: <b>Connect</b> your paycheck, <b>Learn</b> with 8 five-minute modules, <b>Practice</b> with auto-save challenges, and <b>Grow</b> by tracking net worth milestones. <a href='learn.html'>Full walkthrough →</a>"];
    if (/what is this\??$|what's this\??$/.test(t) || /\b(this|the|your) (website|site|page|business|company|startup|product|app)\b/.test(t) ||
        has(t, ["what is fledge", "what's fledge", "whats fledge", "about fledge", "what does fledge", "fledge do", "what do you guys", "tell me about fledge", "tell me about this", "tell me about yourself"]))
      return [ABOUT, ["Pricing", "Features", "Split a $3,500 paycheck"]];
    if (t === "help" || /\b(what can (you|u|i)|what do you (do|know)|how can you help|can you help|help me|what should i ask|what (kind of )?questions|what are you for)\b/.test(t))
      return ["Here's what I can do:<ul><li>Split any paycheck with 50/30/20 (try \"split $4,000\")</li><li>Show how monthly savings grow (try \"save $250 a month\")</li><li>Explain 401(k)s, Roth vs traditional, credit scores, student loans, taxes, and emergency funds</li><li>Walk you through Fledge's features and pricing</li><li>Add you to the early-access waitlist</li></ul>", DEFAULT_CHIPS];
    if (/where (do|should) i (start|begin)|first (job|paycheck|real job)|new grad|just graduated|getting started|beginner|financial literacy|finances|manage (my )?money/.test(t))
      return ["The Fledge order of operations:<ol><li>Budget with 50/30/20</li><li>Build a $1,000 starter emergency fund</li><li>Grab the full 401(k) match</li><li>Pay off high-interest debt</li><li>Grow savings to 3–6 months of expenses</li><li>Invest more in low-cost index funds</li></ol>Want me to start with step 1? Tell me your monthly take-home pay.", ["Split a $3,500 paycheck", "Emergency fund", "401(k) match"]];
    if (has(t, ["budget", "50/30/20", "spending", "paycheck", "save", "saving", "money"]))
      return ["The <b>50/30/20 rule</b>: 50% needs, 30% wants, 20% savings & debt payoff. Tell me your monthly take-home pay (e.g. \"split $3,500\") and I'll do the math.", ["Split a $3,500 paycheck", "Save $200/month?"]];
    if (has(t, ["sign up", "signup", "join", "waitlist", "download", "get the app", "early access"]))
      return ["Fledge is in early access! Type your <b>email address</b> right here and I'll save your spot on the waitlist. ✉️"];
    if (has(t, ["contact", "human", "support", "email", "customer service", "talk to someone"]))
      return ["I can answer most money questions right here. For anything account-related, a human coach is available to Flight members inside the app."];

    /* ---- off-topic ---- */
    if (has(t, ["weather", "forecast", "rain"]))
      return ["I can't check the weather, but I can forecast your savings ☀️. Try \"save $250 a month\" and I'll show you 10-, 20-, and 30-year projections.", ["Save $200/month?"]];
    if (has(t, ["meaning of life"]))
      return ["Philosophers say 42. Economists say compound interest. 🐦 Want to see what $200 a month turns into?", ["Save $200/month?"]];

    return ["That one's outside my nest 🪺. I'm a money coach, so I stick to budgeting, saving, credit, 401(k)s, student loans, and running numbers (try \"save $250 a month\"). Here are some good places to start:", DEFAULT_CHIPS];
  };

  var send = function (text) {
    text = (text || "").trim();
    if (!text) return;
    add("me", esc(text));
    input.value = "";
    var typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    var r = reply(text);
    setTimeout(function () {
      typing.remove();
      add("bot", r[0]);
      setChips(r[1]);
    }, 450 + Math.min(900, r[0].length * 4));
  };

  var open = function (state) {
    chat.classList.toggle("open", state);
    launch.setAttribute("aria-expanded", state);
    if (state) setTimeout(function () { input.focus(); }, 200);
  };
  launch.onclick = function () { open(!chat.classList.contains("open")); };
  document.getElementById("chat-close").onclick = function () { open(false); };
  form.onsubmit = function (e) { e.preventDefault(); send(input.value); };
  document.querySelectorAll("[data-open-chat]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); open(true); if (b.dataset.openChat) send(b.dataset.openChat); });
  });

  if (history.length) history.forEach(function (h) { add(h[0], h[1], false); });
  else add("bot", "Hi, I'm <b>Pip</b> 🐦, your Fledge money coach. Ask me anything about budgeting, saving, credit, or your first 401(k).", true);
  setChips();

  window.FledgeReply = reply; // exposed for testing
})();

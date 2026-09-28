/* SopForge core logic — works in Node (for tests) and browsers.
 * Local-first "AI": heuristic parsing + template banks. No network required.
 */
(function (global) {
  'use strict';

  // ---------- sentence / step splitting ----------
  function splitSentences(text) {
    if (!text || !text.trim()) return [];
    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var steps = [];
    var numbered = /^(\d+)[\.\)\:]?\s+(.+)$/;
    var bulleted = /^[-*•–]\s+(.+)$/;
    lines.forEach(function (line) {
      var m = line.match(numbered) || line.match(bulleted);
      if (m) {
        steps.push(clean(m[m.length - 1]));
        return;
      }
      // Plain prose: split on sentence boundaries
      var parts = line.split(/(?<=[.!?])\s+(?=[A-Z0-9"])/);
      parts.forEach(function (p) {
        var t = clean(p);
        if (t && t.split(/\s+/).length >= 2) steps.push(t);
      });
    });
    // de-dupe (case-insensitive), keep order
    var seen = {};
    return steps.filter(function (s) {
      var k = s.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function clean(s) {
    return s.replace(/^["'“”]+|["'“”]+$/g, '').replace(/[.!?]+$/, '').trim();
  }

  // ---------- enrichment ----------
  var OWNER_RULES = [
    [/cash|register|till|money|payment|refund/i, 'Cashier'],
    [/manager|supervisor|approve|sign off/i, 'Manager'],
    [/greet|customer|client|guest|phone|call/i, 'Front staff'],
    [/cook|food|kitchen|hygiene|sanit/i, 'Kitchen team'],
    [/clean|mop|sweep|trash|bathroom/i, 'Cleaning crew'],
    [/lock|key|alarm|close|shut/i, 'Closer'],
    [/deliver|stock|shelf|inventory/i, 'Stock team'],
  ];

  function ownerFor(stepText) {
    for (var i = 0; i < OWNER_RULES.length; i++) {
      if (OWNER_RULES[i][0].test(stepText)) return OWNER_RULES[i][1];
    }
    return 'Team member';
  }

  function estimateTime(stepText) {
    var m = stepText.match(/(\d+)\s*(min|mins|minute|minutes|hr|hrs|hour|hours)/i);
    if (m) {
      var n = parseInt(m[1], 10);
      var unit = m[2].toLowerCase();
      return (unit[0] === 'h' ? n * 60 : n) + ' min';
    }
    if (/\b(wait|cool|dry|soak|rest|chill)\b/i.test(stepText)) return '15 min';
    if (/\b(inspect|check|review|count|verify)\b/i.test(stepText)) return '5 min';
    return '10 min';
  }

  var TIP_RULES = [
    [/cash|money|register|till|payment/i, 'Count twice — cash errors are the #1 end-of-day headache.'],
    [/customer|client|guest/i, 'Greet within 30 seconds; first impressions set the whole tone.'],
    [/food|hygiene|sanit|wash/i, 'Wash hands before and after — no exceptions, no shortcuts.'],
    [/key|lock|alarm|safe/i, 'Never leave keys or codes unattended, not even "for a second".'],
    [/phone|call/i, 'Answer by the third ring and always say the business name first.'],
    [/email|reply|message/i, 'Reply within one business day — silence reads as "we don\'t care".'],
    [/refund|return|complaint/i, 'Stay calm and listen fully before offering a fix; never argue.'],
    [/clean|mop|trash/i, 'If it looks clean but smells off, clean it again — customers notice.'],
    [/new|onboard|train/i, 'Have the new hire shadow each step once before doing it solo.'],
    [/sign|form|paperwork/i, 'Get the signature before the work starts, not after.'],
  ];
  var GENERIC_TIPS = [
    'If anything looks off, stop and ask a supervisor — guessing is expensive.',
    'Do it the same way every time; consistency is what makes it a system.',
    'Take a photo when done if proof matters later.',
    'Time yourself the first week — slow steps are where training should focus.',
  ];

  function tipFor(stepText, idx) {
    for (var i = 0; i < TIP_RULES.length; i++) {
      if (TIP_RULES[i][0].test(stepText)) return TIP_RULES[i][1];
    }
    return GENERIC_TIPS[idx % GENERIC_TIPS.length];
  }

  // ---------- main forge ----------
  function forgeSOP(name, role, description) {
    var raw = splitSentences(description);
    var steps = raw.map(function (text, i) {
      return {
        n: i + 1,
        text: text.charAt(0).toUpperCase() + text.slice(1),
        owner: ownerFor(text),
        time: estimateTime(text),
        tip: tipFor(text, i),
        done: false,
      };
    });
    var totalMin = steps.reduce(function (acc, s) {
      var m = parseInt(s.time, 10);
      return acc + (isNaN(m) ? 10 : m);
    }, 0);
    return {
      id: 'sop_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name: name || 'Untitled process',
      role: role || 'General',
      createdAt: new Date().toISOString(),
      steps: steps,
      totalTime: totalMin >= 60
        ? Math.floor(totalMin / 60) + 'h ' + (totalMin % 60) + 'm'
        : totalMin + ' min',
    };
  }

  // ---------- starter templates ----------
  var TEMPLATES = [
    {
      name: 'Opening the shop',
      role: 'Opener',
      description: '1. Unlock the front door and disarm the alarm.\n2. Turn on all lights and the open sign.\n3. Count the cash in the register and log the float.\n4. Start the coffee machine and wipe down the counter.\n5. Check voicemail and reply to any urgent messages.\n6. Unlock the restrooms and check supplies.'
    },
    {
      name: 'New employee onboarding',
      role: 'Manager',
      description: 'Greet the new hire and give them a tour of the whole space. Introduce them to every team member by name. Walk through the employee handbook and get the signature page signed. Set up their login, email, and any keys or badges. Have them shadow an experienced team member for the full first shift. End the day with a 10 minute check-in to answer questions.'
    },
    {
      name: 'Handling a customer return',
      role: 'Front staff',
      description: '1. Greet the customer and ask what went wrong, then listen fully.\n2. Ask for the receipt and check the item is within the 30 day return window.\n3. Inspect the item for damage or missing parts.\n4. Offer an exchange first, then a store credit, then a refund to the original payment method.\n5. Log the return in the register with the reason code.\n6. Thank the customer and invite them back.'
    },
    {
      name: 'Closing up for the night',
      role: 'Closer',
      description: 'Count the register and drop the cash in the safe. Turn off the open sign and lock the front door. Wipe down all counters and the card reader. Take out the trash and replace the bags. Set the alarm and lock up, then text the manager that close is done.'
    },
    {
      name: 'Deep-cleaning the restroom',
      role: 'Cleaning crew',
      description: '1. Put on gloves and post the wet floor sign.\n2. Empty trash and replace the liner.\n3. Spray and scrub the toilet, sink, and mirror.\n4. Mop the floor and let it dry for 15 minutes.\n5. Restock toilet paper, soap, and paper towels.\n6. Take a photo of the finished restroom for the log.'
    },
  ];

  var api = {
    splitSentences: splitSentences,
    ownerFor: ownerFor,
    estimateTime: estimateTime,
    tipFor: tipFor,
    forgeSOP: forgeSOP,
    TEMPLATES: TEMPLATES,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.SopForge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

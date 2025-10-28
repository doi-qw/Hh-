document.addEventListener('DOMContentLoaded', () => {
  const runBtn = document.getElementById('run');
  const pasteBtn = document.getElementById('paste-example');
  const codeEl = document.getElementById('code');
  const resultBox = document.getElementById('result');
  const logEl = document.getElementById('log');

  pasteBtn.addEventListener('click', () => {
    const example = `pragma solidity ^0.7.0;
contract C {
    mapping(address=>uint) public balance;
    function withdraw() public {
        (bool ok, ) = msg.sender.call{value: balance[msg.sender]}("");
        balance[msg.sender] = 0;
    }
    function safePay(IERC20 token, address to, uint256 val) public {
        token.transfer(to, val);
    }
}`;
    codeEl.value = example;
  });

  runBtn.addEventListener('click', async () => {
    const code = codeEl.value.trim();
    if (!code) {
      alert('Вставь код контракта перед проверкой.');
      return;
    }
    runBtn.disabled = true;
    runBtn.textContent = 'Сканирую...';
    logEl.innerHTML = '';
    resultBox.classList.remove('hidden');

    try {
      const resp = await fetch('/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (!resp.ok) {
        const err = await resp.json();
        logEl.innerHTML = `<div class="issue">Ошибка: ${err.error || resp.statusText}</div>`;
      } else {
        const data = await resp.json();
        renderResult(data);
      }
    } catch (e) {
      logEl.innerHTML = `<div class="issue">Network error: ${e.message}</div>`;
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Начать проверку';
    }
  });

  function renderResult(data) {
    logEl.innerHTML = '';
    if (data.pragmas) console.log('pragma', data.pragmas);
    // pragma
    const p = document.createElement('div');
    p.className = 'ok';
    p.innerHTML = `<strong>Detected pragma:</strong> ${escapeHtml(data.pragma || '—')}`;
    logEl.appendChild(p);

    if (data.functions && data.functions.length) {
      data.functions.forEach(fn => {
        const box = document.createElement('div');
        box.className = 'issue';
        let html = `<strong>Function:</strong> ${escapeHtml(fn.function)}<br>`;
        html += `<em>${escapeHtml(fn.signature)}</em><br>`;
        html += `<strong>Issues:</strong><ul>`;
        fn.issues.forEach(it => html += `<li>${escapeHtml(it)}</li>`);
        html += `</ul>`;
        html += `<div class="snippet">${escapeHtml(fn.snippet)}</div>`;
        box.innerHTML = html;
        logEl.appendChild(box);
      });
    } else {
      // global message
      (data.global_msgs || []).forEach(msg => {
        const okbox = document.createElement('div');
        okbox.className = 'ok';
        okbox.textContent = msg;
        logEl.appendChild(okbox);
      });
    }
  }

  function escapeHtml(s){
    return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  }
});


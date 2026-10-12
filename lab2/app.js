'use strict';
const $ = (id) => document.getElementById(id);
let revision = 0;
let lastResult = null;
const format = (n) => n === null ? '—' : new Intl.NumberFormat('ru', {maximumFractionDigits: 6}).format(n);
function invalidate(message = 'Код изменён. Выполните расчёт заново.') {
  revision += 1;
  lastResult = null;
  $('results').hidden = true;
  $('error').hidden = true;
  $('status').textContent = message;
  $('export').disabled = true;
  const count = $('source').value.replace(/\n$/, '').split('\n').length;
  $('line-count').textContent = `${count} строк`;
  $('gutter').textContent = Array.from({length: count}, (_, i) => i + 1).join('\n');
  $('gutter').scrollTop = $('source').scrollTop;
}
function showError(message) {
  $('results').hidden = true;
  $('error').hidden = false;
  $('error-message').textContent = message;
  $('status').textContent = 'Расчёт не выполнен';
  $('export').disabled = true;
  lastResult = null;
}
function jump(line) {
  const editor = $('source');
  const start = editor.value.split('\n').slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
  const end = editor.value.indexOf('\n', start);
  editor.focus();
  editor.setSelectionRange(start, end < 0 ? editor.value.length : end);
  editor.scrollTop = Math.max(0, (line - 5) * parseFloat(getComputedStyle(editor).lineHeight));
}
function rows(target, values, withDepth) {
  target.replaceChildren();
  for (const row of values) {
    const tr = document.createElement('tr');
    if (withDepth && row.depth === lastResult.CLI) tr.className = 'max-depth';
    const td = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'line-link';
    button.textContent = row.line;
    button.setAttribute('aria-label', `Перейти к строке ${row.line}`);
    button.onclick = () => jump(row.line);
    td.append(button); tr.append(td);
    for (const value of [row.kind, ...(withDepth ? [row.depth] : []), row.text]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      tr.append(cell);
    }
    target.append(tr);
  }
}
async function analyze() {
  invalidate('Выполняется разбор…');
  const sentRevision = revision;
  $('analyze').disabled = true;
  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const result = Gilb.analyze($('source').value);
    if (revision !== sentRevision) return;
    lastResult = result;
    for (const key of ['CL', 'cl', 'CLI', 'N']) $(key).textContent = key === 'cl' && result.cl !== null ? new Intl.NumberFormat('ru', {maximumFractionDigits:3}).format(result.cl) : format(result[key]);
    $('formula').textContent = result.N ? `${result.CL} / ${result.N} = ${format(result.cl)}` : 'При N = 0 относительная сложность не определена.';
    rows($('branches'), result.branches, true);
    rows($('statements'), result.statements, false);
    $('no-branches').hidden = result.CL !== 0;
    $('results').hidden = false;
    $('status').textContent = 'Расчёт готов';
    $('export').disabled = false;
  } catch (error) {
    if (revision === sentRevision) showError(error.message || 'Не удалось разобрать код.');
  } finally {
    $('analyze').disabled = false;
  }
}
async function example() {
  try {
    $('source').value = EXAMPLE_SOURCE;
    $('source').setSelectionRange(0, 0);
    $('source').scrollTop = 0;
    $('filename').textContent = 'example.ts';
    invalidate('Пример загружен.');
    await analyze();
  } catch (error) { showError(error.message); }
}
$('source').addEventListener('scroll', () => { $('gutter').scrollTop = $('source').scrollTop; });
$('source').addEventListener('input', () => invalidate());
$('source').addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault(); if (!$('analyze').disabled) analyze();}
});
$('analyze').onclick = analyze;
$('example').onclick = example;
$('file').onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 120000) {showError('Файл должен быть не больше 120 КБ.'); return;}
  try {
    $('source').value = await file.text();
    $('source').setSelectionRange(0, 0);
    $('source').scrollTop = 0;
    $('filename').textContent = file.name;
    invalidate('Файл загружен. Нажмите «Рассчитать».');
  } catch {showError('Не удалось прочитать файл.');}
  event.target.value = '';
};
$('export').onclick = () => {
  if (!lastResult) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(lastResult, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'gilb-result.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
example();

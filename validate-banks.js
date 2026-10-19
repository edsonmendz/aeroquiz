// Run with: node validate-banks.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

for (const [file, key, subject] of [
  ['regulamentacao.js', 'REGULAMENTACAO_BANK', 'mma'],
  ['corrosion.js', 'CORROSION_BANK', 'corrosion']
]) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  const bank = context.window[key];
  assert.ok(Array.isArray(bank), `${file}: banco ausente`);
  assert.equal(bank.length, 150, `${file}: número de questões`);
  const questions = new Set();
  bank.forEach((item, index) => {
    const at = `${file} #${index + 1}`;
    for (const field of ['topic', 'q', 'why']) {
      assert.ok(typeof item[field] === 'string' && item[field].trim(), `${at}: ${field}`);
    }
    assert.ok(!questions.has(item.q.trim().toLocaleLowerCase('pt-BR')), `${at}: pergunta repetida`);
    questions.add(item.q.trim().toLocaleLowerCase('pt-BR'));
    assert.equal(item.a.length, 4, `${at}: quatro alternativas`);
    assert.ok(item.a.every(answer => typeof answer === 'string' && answer.trim()), `${at}: alternativa vazia`);
    assert.equal(new Set(item.a.map(answer => answer.trim().toLocaleLowerCase('pt-BR'))).size, 4, `${at}: alternativas distintas`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, `${at}: índice correto`);
    assert.ok(item.source && typeof item.source.section === 'string' && item.source.section.trim(), `${at}: seção da fonte`);
    if (subject === 'mma') {
      assert.equal(item.source.agency, 'ANAC', `${at}: órgão oficial`);
      assert.match(item.source?.section || '', /^RBAC (?:65|43|145|39) (?:\d+\.\d+|Apêndice [A-E])/, `${at}: dispositivo`);
    } else {
      assert.ok(['FAA', 'OSHA'].includes(item.source.agency), `${at}: órgão técnico oficial`);
      assert.match(item.source.section, item.source.agency === 'FAA'
        ? /^(?:AC 43-4B §|AC 43\.13-1B ¶|FAA-H-8083-30B, Cap\. 8, p\. 8-)/
        : /^29 CFR §1910\.1200\([fg]\)$/, `${at}: seção técnica específica`);
    }
    const url = new URL(item.source.url);
    assert.equal(url.protocol, 'https:', `${at}: protocolo`);
    if (subject === 'mma') {
      assert.ok(url.hostname === 'anac.gov.br' || url.hostname.endsWith('.anac.gov.br') ||
        ((url.hostname === 'gov.br' || url.hostname === 'www.gov.br') && url.pathname.startsWith('/anac/')), `${at}: domínio oficial`);
      assert.ok(decodeURIComponent(url.pathname).toUpperCase().replace(/\s+/g, '').includes(`RBAC${item.source.section.match(/^RBAC (\d+)/)[1]}`), `${at}: norma e URL divergentes`);
    } else {
      const domain = { FAA: 'faa.gov', OSHA: 'osha.gov' }[item.source.agency];
      assert.ok(url.hostname === domain || url.hostname.endsWith(`.${domain}`), `${at}: domínio oficial`);
      if (item.source.agency === 'FAA') {
        const documentName = item.source.section.startsWith('AC 43-4B §') ? 'AC_43-4B.pdf'
          : item.source.section.startsWith('AC 43.13-1B ¶') ? 'AC_43.13-1B_w-chg1.pdf'
          : 'amtg_handbook.pdf';
        assert.ok(url.pathname.endsWith(documentName), `${at}: publicação e URL divergentes`);
      } else {
        assert.equal(url.pathname, '/laws-regs/regulations/standardnumber/1910/1910.1200', `${at}: norma OSHA e URL divergentes`);
      }
    }
    assert.match(item.source.reviewed, /^\d{4}-\d{2}-\d{2}$/, `${at}: data de consulta`);
  });
  console.log(`${file}: ${bank.length} questões válidas`);
}
const html = fs.readFileSync('index.html', 'utf8');
assert.doesNotMatch(html, /<style\b|\bstyle\s*=|\b(?:const|let)\s+BANK\b/i);
console.log('index.html: sem CSS ou banco inline');

let size = 5;
let session = [];
let position = 0;
let answers = [];
let selectedBank = null;
let selectedSubject = null;

const $ = id => document.getElementById(id);
const subjects = {
  mma: {
    button: 'subject-mma', file: './regulamentacao.js', key: 'REGULAMENTACAO_BANK',
    label: 'MMA · Regulamentação',
    intro: 'Treine as regras da profissão de mecânico de manutenção aeronáutica, licenças, registros de manutenção e segurança operacional em sessões rápidas. Sem cadastro e sem histórico.',
    notice: 'Material didático de revisão com referências oficiais por questão. Confira sempre a versão vigente dos RBACs antes de atuar; este simulado não substitui normas ou dados de manutenção aprovados. Nenhuma resposta é enviada ou armazenada.'
  },
  corrosion: {
    button: 'subject-corrosion', file: './corrosion.js', key: 'CORROSION_BANK',
    label: 'Controle de Corrosão',
    intro: 'Treine prevenção, materiais, inspeção e manutenção no controle de corrosão em materiais aeronáuticos. Sem cadastro e sem histórico.',
    notice: 'Fontes FAA e OSHA são citadas para estudo, não como autorização de serviço no Brasil. Siga as normas ANAC, os dados de manutenção e as regras de segurança locais aplicáveis. Nenhuma resposta é enviada ou armazenada.'
  }
};

function show(id) {
  for (const screen of ['subjects', 'home', 'quiz', 'result']) {
    $(screen).classList.toggle('hidden', screen !== id);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function validBank(bank, subject) {
  return Array.isArray(bank) && bank.length === 150 &&
    new Set(bank.map(item => typeof item?.q === 'string' ? item.q.trim().toLocaleLowerCase('pt-BR') : '')).size === 150 &&
    bank.every(item => {
      if (!item || !['topic', 'q', 'why'].every(key => typeof item[key] === 'string' && item[key].trim()) ||
          !Array.isArray(item.a) || item.a.length !== 4 ||
          !item.a.every(answer => typeof answer === 'string' && answer.trim()) ||
          new Set(item.a.map(answer => answer.trim())).size !== 4 ||
          !Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) return false;
      const source = item.source;
      if (!source || typeof source.section !== 'string' || !source.section.trim() ||
          !/^\d{4}-\d{2}-\d{2}$/.test(source.reviewed || '')) return false;
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:') return false;
        if (subject === 'mma') {
          return source.agency === 'ANAC' &&
            /^RBAC (65|43|145|39) (?:\d+\.\d+|Apêndice [A-E])/.test(source.section) &&
            (url.hostname === 'anac.gov.br' || url.hostname.endsWith('.anac.gov.br') ||
             ((url.hostname === 'gov.br' || url.hostname === 'www.gov.br') && url.pathname.startsWith('/anac/'))) &&
            decodeURIComponent(url.pathname).toUpperCase().replace(/\s+/g, '').includes(`RBAC${source.section.match(/^RBAC (\d+)/)[1]}`);
        }
        const domains = { FAA: 'faa.gov', OSHA: 'osha.gov' };
        const domain = domains[source.agency];
        const reference = source.agency === 'FAA'
          ? /^(?:AC 43-4B §|AC 43\.13-1B ¶|FAA-H-8083-30B, Cap\. 8, p\. 8-)/.test(source.section)
          : /^29 CFR §1910\.1200\([fg]\)$/.test(source.section);
        const documentName = source.section.startsWith('AC 43-4B §') ? 'AC_43-4B.pdf'
          : source.section.startsWith('AC 43.13-1B ¶') ? 'AC_43.13-1B_w-chg1.pdf'
          : source.section.startsWith('FAA-H-8083-30B,') ? 'amtg_handbook.pdf' : null;
        return subject === 'corrosion' && !!domain && reference &&
          (url.hostname === domain || url.hostname.endsWith(`.${domain}`)) &&
          (source.agency === 'FAA' ? documentName && url.pathname.endsWith(documentName)
            : url.pathname === '/laws-regs/regulations/standardnumber/1910/1910.1200');
      } catch { return false; }
    });
}

async function chooseSubject(config) {
  const status = $('subject-status');
  const buttons = Object.values(subjects).map(item => $(item.button));
  buttons.forEach(button => { button.disabled = true; });
  status.hidden = false;
  status.textContent = 'Carregando as questões...';
  try {
    if (!window[config.key]) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = config.file;
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          reject(new Error('Não foi possível carregar o banco de questões. Tente novamente.'));
        };
        document.head.append(script);
      });
    }
    if (!validBank(window[config.key], config === subjects.mma ? 'mma' : 'corrosion')) {
      delete window[config.key];
      document.querySelector(`script[src="${config.file}"]`)?.remove();
      throw new Error('O banco de questões está incompleto ou inválido. Tente novamente.');
    }
    selectedBank = window[config.key];
    selectedSubject = config === subjects.mma ? 'mma' : 'corrosion';
    $('subject-intro').textContent = config.intro;
    document.querySelector('.tag').textContent = config.label;
    document.querySelector('.notice').textContent = config.notice;
    document.title = `AeroQuiz · ${config.label}`;
    status.hidden = true;
    show('home');
  } catch (error) {
    status.textContent = error.message;
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}

$('subject-mma').onclick = () => chooseSubject(subjects.mma);
$('subject-corrosion').onclick = () => chooseSubject(subjects.corrosion);
$('change-subject').onclick = () => show('subjects');
function choose(n) {
  size = n;
  for (const [id, value] of [['five', 5], ['ten', 10]]) {
    $(id).classList.toggle('active', value === n);
    $(id).setAttribute('aria-pressed', String(value === n));
  }
}
$('five').onclick = () => choose(5);
$('ten').onclick = () => choose(10);
$('start').onclick = () => {
  if (!selectedBank || !validBank(selectedBank, selectedSubject)) {
    selectedBank = null;
    selectedSubject = null;
    $('subject-status').hidden = false;
    $('subject-status').textContent = 'O banco de questões está indisponível. Selecione a matéria novamente.';
    show('subjects');
    return;
  }
  session = shuffle(selectedBank).slice(0, size).map(item => ({
    ...item, opts: shuffle(item.a.map((label, index) => ({ label, right: index === item.correct })))
  }));
  answers = Array(size).fill(null);
  position = 0;
  show('quiz');
  render();
};

function render() {
  const item = session[position];
  $('count').textContent = `Questão ${position + 1} de ${size}`;
  $('answered').textContent = `${answers.filter(value => value !== null).length} respondidas`;
  $('bar').className = `fill progress-${Math.round((position + 1) / size * 10)}`;
  $('topic').textContent = item.topic.toUpperCase();
  $('question').textContent = item.q;
  const root = $('options');
  root.replaceChildren();
  item.opts.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'option' + (answers[position] === index ? ' selected' : '');
    button.setAttribute('aria-pressed', String(answers[position] === index));
    const letter = document.createElement('span');
    letter.className = 'letter';
    letter.textContent = 'ABCD'[index];
    const text = document.createElement('span');
    text.textContent = option.label;
    button.append(letter, text);
    button.onclick = () => { answers[position] = index; render(); };
    root.append(button);
  });
  $('back').disabled = position === 0;
  $('next').disabled = answers[position] === null;
  $('next').textContent = position === size - 1 ? 'Finalizar ✓' : 'Próxima →';
}

$('back').onclick = () => { if (position > 0) { position--; render(); } };
$('next').onclick = () => {
  if (answers[position] === null) return;
  if (position < size - 1) { position++; render(); } else finish();
};

function finish() {
  const correct = session.reduce((sum, item, index) => sum + Number(item.opts[answers[index]].right), 0);
  const pct = Math.round(correct / size * 100);
  $('headline').textContent = pct === 100 ? 'Excelente trabalho!' : pct >= 70 ? 'Muito bem!' : 'Continue praticando!';
  $('score').textContent = pct + '%';
  $('summary').textContent = `Você acertou ${correct} de ${size} questões. Confira as explicações e tente outra rodada.`;
  const root = $('review');
  root.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'Revisão das respostas';
  root.append(heading);
  session.forEach((item, index) => {
    const ok = item.opts[answers[index]].right;
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.className = ok ? 'good' : 'bad';
    summary.textContent = `${ok ? '✓' : '✕'} ${index + 1}. ${item.q}`;
    const answer = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Resposta correta: ' + item.opts.find(option => option.right).label;
    answer.append(strong);
    const explanation = document.createElement('p');
    explanation.textContent = item.why;
    details.append(summary, answer, explanation);
    if (item.source) {
      const reference = document.createElement('p');
      const link = document.createElement('a');
      link.href = item.source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `${item.source.agency} · ${item.source.section} (consultado em ${item.source.reviewed})`;
      reference.append(link);
      details.append(reference);
    }
    root.append(details);
  });
  show('result');
}
$('again').onclick = () => show('home');
show('subjects');

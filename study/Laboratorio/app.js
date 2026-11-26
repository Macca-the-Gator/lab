const assuntos = [
  {titulo:'1. Portas lógicas e tabelas-verdade',html:`<p>Uma porta combinacional depende das entradas atuais. <code>AND = A·B</code> exige dois 1; <code>OR = A+B</code> precisa de ao menos um 1; <code>NOT = A'</code> inverte. NAND e NOR são os complementos de AND e OR; XOR detecta diferença, XNOR detecta igualdade.</p><p>Para duas entradas existem quatro combinações: 00, 01, 10 e 11. Para três entradas existem oito. Confirme cada linha na bancada com chaves e LED.</p><h4>Prática confirmada</h4><p>Relatório 1 Digital: AND 0001; OR 0111; NAND 1110; NOR 1000; XOR 0110; XNOR 1001, na ordem 00,01,10,11.</p>`},
  {titulo:'2. Álgebra de Boole e De Morgan',html:`<p>Na lógica booleana, <code>+</code> significa OR, <code>·</code> significa AND e o apóstrofo significa NOT. Identidades: <code>A+0=A</code>, <code>A+1=1</code>, <code>A·0=0</code>, <code>A·1=A</code>, <code>A+A'=1</code>, <code>A·A'=0</code>, <code>A+A=A</code>, <code>A·A=A</code>.</p><p>De Morgan: <code>(A·B)'=A'+B'</code> e <code>(A+B)'=A'·B'</code>. Para provar equivalência, produza a mesma saída em todas as entradas possíveis.</p><h4>Resultados do relatório 2</h4><p>Simplificações obtidas: <code>S=A'</code>, <code>S=A'+B'</code>, <code>S=A+B</code>, <code>S=C'+A'B'</code>, <code>S=A'+B+C'</code>. O circuito do item 3 é equivalente a <code>A·B</code>.</p>`},
  {titulo:'3. NAND, NOR e equivalência de circuitos',html:`<p>NAND e NOR são portas universais. É possível construir as demais portas combinando apenas um desses tipos. NOT com NAND: <code>A NAND A=A'</code>; AND com NAND: <code>(A NAND B) NAND (A NAND B)=A·B</code>; OR com NAND: <code>(A NAND A) NAND (B NAND B)=A+B</code>.</p><p>No relatório 3 Digital, as três montagens mantiveram exatamente as tabelas-verdade do inversor, AND e OR. O objetivo é verificar equivalência funcional, não apenas aparência do circuito.</p>`},
  {titulo:'4. Somadores e subtratores',html:`<p>Meio somador: <code>S=A⊕B</code>, <code>C=A·B</code>. Somador completo: <code>S=A⊕B⊕Cin</code>, <code>Cout=A·B+Cin·(A⊕B)</code>. Há carry quando ao menos duas das três entradas são 1.</p><p>Meio-subtrator: <code>D=A⊕B</code>, <code>Bout=A'·B</code>. Subtrator completo: <code>D=A⊕B⊕Bin</code>, <code>Bout=A'B + Bin·(A⊕B)'</code>.</p><p>O relatório de Circuitos Aritméticos confirmou que dois meios somadores, com OR entre os carries, formam um somador completo.</p>`},
  {titulo:'5. Flip-flops e contadores',html:`<p>O latch RS feito com NOR mantém quando <code>S=R=0</code>, faz set com S=1 e reset com R=1; <code>S=R=1</code> é a condição proibida do latch NOR simples. O flip-flop D copia D para Q na borda ativa do clock e mantém o estado entre bordas.</p><p>O JK mantém com 00, reseta com 01, seta com 10 e alterna com 11. Controles assíncronos SET e RESET podem agir sem esperar o clock, conforme o CI. Se <code>D=Q'</code>, o D alterna a cada borda.</p><p>Contador BCD 8421 conta de 0 a 9 e retorna a 0, usando 4 bits. Contador módulo 6 conta de 0 a 5, reiniciando em 6.</p>`},
  {titulo:'6. Diodos, retificadores e ceifadores',html:`<p>O diodo conduz principalmente na polarização direta e bloqueia na reversa, dentro dos limites do componente. Retificador de meia onda aproveita um semiciclo; retificador de onda completa produz pulsos nos dois semiciclos e ondulação de frequência <code>2f</code>.</p><p>Um capacitor de filtro reduz a ondulação ao carregar perto do pico e descarregar na carga. Ceifadores limitam parte da onda; dobradores e triplicadores usam diodos e capacitores para combinar tensões de pico.</p>`},
  {titulo:'7. Transistor TBJ e estabilidade térmica',html:`<p>Em região ativa: <code>β=Ic/Ib</code> e <code>Ic≈β·Ib</code>. Para pequenos sinais, <code>gm≈Ic/VT</code> com <code>VT≈26mV</code> próximo da temperatura ambiente; <code>Av≈−gm·Rc</code> para emissor comum idealizado, sem degeneração e desprezando ro.</p><p>A resistência de emissor estabiliza a polarização: se Ic cresce, a queda em Re aumenta, Vbe efetiva diminui e o circuito contraria a elevação de corrente.</p><h4>Resultados do relatório TBJ</h4><p>Sem Re, a tensão do coletor caiu de ~5,00 V para ~2,48 V ao aquecer. Com Re=1 kΩ, Ic variou de ~0,500 mA a ~0,512 mA. Ganhos: teórico ~−193 V/V e prático ~−185 V/V.</p>`},
  {titulo:'8. MOSFET de crescimento',html:`<p>O MOSFET de canal N de crescimento começa a conduzir de forma significativa acima da tensão limiar <code>Vth</code>. No modelo quadrático simplificado em saturação, <code>Id≈k(Vgs−Vth)²</code>; a definição de k depende da convenção adotada para o parâmetro.</p><p>O terminal de porta tem impedância de entrada muito alta em regime estacionário. Para medir Id, use a queda de tensão no resistor conhecido e a Lei de Ohm. A região de operação depende de Vgs, Vds e Vth.</p>`},
  {titulo:'9. Amplificadores operacionais',html:`<p>Com realimentação negativa e saída não saturada, o AO ideal tem corrente desprezível nas entradas e tensão praticamente igual nos dois terminais de entrada.</p><p>Inversor: <code>Av=−R2/R1</code>, saída 180° defasada. Não inversor: <code>Av=1+R2/R1</code>, saída em fase. Resistores em paralelo: <code>Req=R1·R2/(R1+R2)</code>. O ganho não ultrapassa livremente a tensão de alimentação: pode haver saturação.</p><h4>Resultados do relatório</h4><p>Inversor −10, −5 e −20; não inversor +11, +6, +21 e +1. Amplificador genérico: <code>Vc=−10Va+10Vd+Vf</code>.</p>`},
  {titulo:'10. Filtros ativos e frequência',html:`<p>Filtro RC de primeira ordem: <code>fc=1/(2πRC)</code>. No corte, a magnitude típica é <code>1/√2≈0,707</code> da banda de passagem, equivalendo a −3,01 dB. Filtro passa-baixa atenua altas frequências; passa-alta atenua baixas. Filtro passa-faixa seleciona um intervalo.</p><p>Ganho em decibéis: <code>GdB=20·log10(|Vout/Vin|)</code>. A ordem do filtro influencia a inclinação assintótica: primeira ordem ≈20 dB/década por polo.</p>`},
  {titulo:'11. Multiplexadores, conversores e memórias',html:`<p>MUX seleciona uma entre várias entradas; DEMUX distribui uma entrada à saída selecionada. No 4051, as três seleções definem até 8 canais, respeitando a habilitação do circuito.</p><p>Conversor D/A gera tensão proporcional a um código digital; conversor A/D aproxima uma tensão por um código, com resolução de n bits. Quantização ideal de uma faixa FSR em <code>2ⁿ</code> níveis tem passo aproximado <code>FSR/2ⁿ</code>, conforme a convenção.</p><p>SRAM perde o conteúdo sem alimentação; EEPROM preserva os bits sem energia. Não confunda memória volátil com velocidade ou capacidade.</p>`}
];

const trabalhos = [
  {titulo:'Funções lógicas básicas',area:'Sistemas Digitais',fonte:'relatorios/01-funcoes-logicas.md',destaques:['AND: 00→0, 01→0, 10→0, 11→1.','XOR: 00→0, 01→1, 10→1, 11→0. XNOR faz o complemento.','Duas portas NOT em série reproduzem a entrada.'],material:'../Laboratorio-de-Eletronica-Digital/'},
  {titulo:'Álgebra de Boole e De Morgan',area:'Sistemas Digitais',fonte:'relatorios/02-boole-de-morgan.md',destaques:['(A·B)\u2032 = A\u2032+B\u2032 e (A+B)\u2032 = A\u2032·B\u2032.','Item 2: S=C\u2032+A\u2032B\u2032. Item 3: S=A·B.','Circuitos equivalentes foram conferidos por tabela-verdade.'],material:'../Laboratorio-de-Eletronica-Digital/'},
  {titulo:'Equivalência de blocos NAND',area:'Sistemas Digitais',fonte:'relatorios/03-equivalencia-nand.md',destaques:['NOT, AND e OR foram implementados apenas com NAND.','OR por NAND exige inverter A e B antes da última NAND.','As saídas observadas coincidiram com as portas originais.'],material:'../Laboratorio-de-Eletronica-Digital/'},
  {titulo:'Circuitos aritméticos',area:'Sistemas Digitais',fonte:'relatorios/04-circuitos-aritmeticos.md',destaques:['Half-adder: soma A⊕B; carry A·B.','Full-adder: soma A⊕B⊕Cin e carry da maioria de três entradas.','Meio-subtrator: diferença A⊕B; empréstimo A\u2032·B.'],material:'../Laboratorio-de-Eletronica-Digital/'},
  {titulo:'Flip-flops RS, D e JK',area:'Sistemas Digitais',fonte:'relatorios/05-flip-flops.md',destaques:['JK com J=K=1 alterna em cada borda ativa.','D copia a entrada na borda; D=Q\u0305 faz alternar.','Contador BCD conta 0–9 e módulo 6 conta 0–5.'],material:'../Laboratorio-de-Eletronica-Digital/'},
  {titulo:'Transistor bipolar de junção',area:'Projetos Eletrônicos',fonte:'relatorios/06-tbj.md',destaques:['Sem Re: Vc caiu de aproximadamente 5,00 V para 2,48 V com aquecimento.','Com Re=1 kΩ: Ic mudou de aproximadamente 0,500 mA para 0,512 mA.','Amplificador: Av teórico ~−193 e prático ~−185 V/V.'],material:'../Laboratorio-de-Projetos-Eletronicos/'},
  {titulo:'Amplificadores operacionais',area:'Projetos Eletrônicos',fonte:'relatorios/07-amplificadores-operacionais.md',destaques:['Ganho inversor: −10, −5 e −20 conforme os resistores.','Ganho não inversor: +11, +6, +21 e +1.','Saída genérica: Vc=−10Va+10Vd+Vf.'],material:'../Laboratorio-de-Projetos-Eletronicos/'}
];

const perguntas = window.laboratorioQuestoes;
if (!Array.isArray(perguntas) || perguntas.length !== 100 || new Set(perguntas.map(x => x.id)).size !== 100) throw new Error('Banco de questões incompleto');
const banco = Object.fromEntries(perguntas.map(q => [q.id,q]));
const chave = 'macca-laboratorio-progresso-v1';
let progresso = {};
try { progresso = JSON.parse(localStorage.getItem(chave) || '{}') || {}; } catch { progresso = {}; }
let visiveis = [];
let pos = 0;
const $ = s => document.querySelector(s);
const letras = ['A','B','C','D'];
function salvar(){try{localStorage.setItem(chave,JSON.stringify(progresso));}catch{}}
function abrir(tab){document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===tab));history.replaceState(null,'','#'+tab);window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.tab)));
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.open)));
if(['visao','teoria','trabalhos','simulados','simuladores'].includes(location.hash.slice(1))) abrir(location.hash.slice(1));
$('#topics').innerHTML = assuntos.map((t,i)=>`<details class="topic" ${i===0?'open':''}><summary>${t.titulo}</summary><div class="body">${t.html}</div></details>`).join('');
$('#reports').innerHTML = trabalhos.map((t,i)=>`<details class="report"><summary><div><h3>${t.titulo}</h3><small>${t.area}</small></div><span class="number">Trabalho ${i+1}</span></summary><div class="body"><ul>${t.destaques.map(s=>`<li>${s}</li>`).join('')}</ul><a href="${t.fonte}">Ler resultados e cálculos</a><a href="${t.material}">Guia da matéria</a></div></details>`).join('');
const areas = [...new Set(perguntas.map(q=>q.area))];
$('#filter-area').innerHTML += areas.map(a=>`<option value="${a}">${a}</option>`).join('');
function atualizar(){
  const area=$('#filter-area').value, nivel=$('#filter-level').value, status=$('#filter-status').value;
  const anterior=visiveis[pos]?.id;
  visiveis=perguntas.filter(q=>(area==='todas'||q.area===area)&&(nivel==='todos'||q.nivel===nivel)&&(status==='todas'||(status==='pendentes'&&!progresso[q.id])||(status==='erradas'&&progresso[q.id]?.escolha!==q.correta)||(status==='corretas'&&progresso[q.id]?.escolha===q.correta)));
  pos=Math.max(0,visiveis.findIndex(q=>q.id===anterior));
  desenhar();
}
function desenhar(){
  const respondidas=perguntas.filter(q=>progresso[q.id]);
  const acertos=respondidas.filter(q=>progresso[q.id].escolha===q.correta).length;
  $('#count').textContent=`${respondidas.length}/100 respondidas`;
  $('#score').textContent=`${acertos} acertos`;
  $('#bar').style.width=`${respondidas.length}%`;
  $('#position').textContent=visiveis.length?`${pos+1} de ${visiveis.length}`:'0 questões';
  $('#prev').disabled=pos===0||!visiveis.length;
  $('#next').disabled=pos>=visiveis.length-1;
  if(!visiveis.length){$('#quiz').innerHTML='<p class="empty">Nenhuma questão corresponde aos filtros escolhidos.</p>';return;}
  const q=visiveis[pos],r=progresso[q.id];
  $('#quiz').innerHTML=`<div class="question-head"><span>Questão ${q.id} · ${q.area}</span><span class="level">${q.nivel}</span></div><h3>${q.pergunta}</h3><div class="answers">${q.opcoes.map((o,i)=>`<button type="button" data-answer="${i}" ${r?'disabled':''} class="${r&&(i===q.correta?'correct':i===r.escolha?'wrong':'')}"><b>${letras[i]}</b><span>${o.texto}</span></button>`).join('')}</div>${r?`<div class="explain"><p class="result ${r.escolha===q.correta?'good':'bad'}">${r.escolha===q.correta?'Você acertou!':'Você errou. A resposta correta é '+letras[q.correta]+'.'}</p><h4>Entenda cada alternativa</h4><ul>${q.opcoes.map((o,i)=>`<li class="${i===q.correta?'good':i===r.escolha?'bad-selected':''}"><strong>${letras[i]} · ${i===q.correta?'Correta':'Incorreta'}</strong><p>${o.motivo}</p></li>`).join('')}</ul><button class="secondary" type="button" id="retry">Tentar esta questão novamente</button></div>`:''}`;
  document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{progresso[q.id]={escolha:Number(b.dataset.answer)};salvar();desenhar();}));
  if(r)$('#retry').addEventListener('click',()=>{delete progresso[q.id];salvar();desenhar();});
}
$('#filter-area').addEventListener('change',atualizar);
$('#filter-level').addEventListener('change',atualizar);
$('#filter-status').addEventListener('change',atualizar);
$('#prev').addEventListener('click',()=>{pos--;desenhar();});
$('#next').addEventListener('click',()=>{pos++;desenhar();});
$('#reset').addEventListener('click',()=>{if(confirm('Apagar todas as suas respostas salvas neste navegador?')){progresso={};salvar();atualizar();}});
atualizar();

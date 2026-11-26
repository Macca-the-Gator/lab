const questoes = [];
function add(area,nivel,pergunta,textos,correta,motivos){
  if(textos.length!==4||motivos.length!==4)throw Error('Alternativas incompletas');
  questoes.push({id:questoes.length+1,area,nivel,pergunta,correta,opcoes:textos.map((texto,i)=>({texto,motivo:motivos[i]}))});
}
function escolha(area,nivel,pergunta,textos,correta,regra,justificativas){
  add(area,nivel,pergunta,textos,correta,textos.map((t,i)=>i===correta?regra:justificativas?.[i]||`A alternativa “${t}” não atende à situação. ${regra}`));
}
const portas = [
  ['AND',(a,b)=>a&b,'A·B','exige A e B iguais a 1'],
  ['OR',(a,b)=>a|b,'A+B','vale 1 se pelo menos uma entrada for 1'],
  ['NAND',(a,b)=>1-(a&b),"(A·B)'",'é a inversão da AND'],
  ['NOR',(a,b)=>1-(a|b),"(A+B)'",'é a inversão da OR'],
  ['XOR',(a,b)=>a^b,'A⊕B','vale 1 se A e B forem diferentes'],
  ['XNOR',(a,b)=>1-(a^b),"(A⊕B)'",'vale 1 se A e B forem iguais']
];
for(const [nome,fn,formula,descricao] of portas){
  for(const [a,b] of [[0,0],[0,1],[1,1]]){
    const saida=fn(a,b),regra=`${formula}: com A=${a} e B=${b}, a saída é ${saida}; a porta ${nome} ${descricao}.`;
    escolha('Portas lógicas','Básico',`Na porta ${nome}, com A=${a} e B=${b}, qual é a saída lógica?`,['0','1','Depende do clock','Indeterminada'],saida,regra,[`A saída é ${saida} pela expressão ${formula}, não 0.`,`A saída é ${saida} pela expressão ${formula}, não 1.`, 'Portas combinacionais respondem às entradas; não precisam de clock.','Com as duas entradas definidas, essa porta tem saída determinada.']);
  }
}
for(const a of [0,1]){
  const s=1-a;
  escolha('Portas lógicas','Básico',`Uma porta NOT recebe A=${a}. Qual a saída?`,['0','1','Depende de B','Sempre 1'],s,`NOT inverte o único bit: ${a} torna-se ${s}.`,[`NOT de ${a} é ${s}, não 0.`,`NOT de ${a} é ${s}, não 1.`,'NOT possui apenas a entrada A.','NOT só produz 1 quando a entrada é 0.']);
}
const boole = [
  ['Quanto vale A+0?',['A','0','1',"A'"],0,'OR com zero preserva A.'],
  ['Quanto vale A+1?',['A','0','1',"A'"],2,'OR com 1 é sempre 1.'],
  ['Quanto vale A·0?',['A','0','1',"A'"],1,'AND com zero é sempre zero.'],
  ['Quanto vale A·1?',['A','0','1',"A'"],0,'AND com 1 preserva A.'],
  ["Quanto vale A+A'?",['A','0','1',"A'"],2,'A ou seu complemento cobre ambos os casos, portanto é 1.'],
  ["Quanto vale A·A'?",['A','0','1',"A'"],1,'A e seu complemento nunca valem 1 ao mesmo tempo.'],
  ["Pelo teorema de De Morgan, (A·B)' equivale a quê?",["A'·B'","A'+B'","A+B","A·B"],1,'Negar AND equivale a fazer OR dos complementos.'],
  ["Pelo teorema de De Morgan, (A+B)' equivale a quê?",["A'+B'","A'·B'","A+B","A·B"],1,'Negar OR equivale a fazer AND dos complementos.'],
  ["Quanto vale (A')'?",['0','1','A',"A'"],2,'A dupla negação devolve a variável original.'],
  ['Quanto vale A+A?',['A','0','1','2A'],0,'A lei idempotente diz que OR de A com ele próprio é A.'],
  ['Pela absorção, A+A·B equivale a quê?',['B','A','A+B','A·B'],1,'Se A é 1 a saída já é 1; se A é 0 ambos os termos são 0.'],
  ['Pela distributiva, A·(B+C) equivale a quê?',['A·B+A·C','A+B·C','A·B·C','A+B+C'],0,'A AND se distribui sobre os dois termos da soma booleana.']
];
for(let i=0;i<boole.length;i++){
  const [pergunta,textos,certa,regra]=boole[i];
  escolha('Álgebra de Boole',i<6?'Básico':'Intermediário',pergunta,textos,certa,regra);
}
const equivalencias = [
  ['Como fazer um NOT usando uma única NAND?',['Ligar A às duas entradas','Usar uma entrada solta','Aplicar A e zero','Aplicar A e um'],0,"(A·A)'=A'."],
  ['Para construir AND apenas com NAND, qual sequência funciona?',['Uma única NAND','NAND(A,B) seguida de NAND com entradas unidas','Duas NOR em cascata','NAND(A,A) sozinha'],1,"A primeira NAND gera (AB)' e a segunda inverte, produzindo AB."],
  ['Para construir OR apenas com NAND, o que se aplica à última NAND?',['A e B sem inversão',"A' e B'",'A e zero','B e um'],1,"Por De Morgan, (A'·B')'=A+B."],
  ['Uma NAND com entradas A=1 e B=1 apresenta qual saída?',['1','0','A','Alta impedância'],1,"NAND é NOT(1·1)=0."],
  ['Por que NAND é chamada porta universal?',['Tem apenas uma entrada','Mede corrente','Permite implementar qualquer função booleana','Necessita de clock'],2,'NOT, AND e OR podem ser construídos com NAND; daí derivam as demais funções.'],
  ['Qual montagem forma NOT usando NOR?',['NOR(A,A)','NOR(A,0)','NOR(A,1)','NOR(A,B)'],0,"NOR(A,A)=(A+A)'=A'."],
  ['Para formar OR apenas com NOR, qual sequência é adequada?',['Uma NOR','NOR(A,B) seguida de inversão NOR','Uma XOR','Duas NAND sem inversão'],1,"A NOR produz (A+B)' e uma NOR usada como NOT devolve A+B."],
  ['Se duas montagens têm tabelas-verdade idênticas para todas as entradas, são:',['Fisicamente idênticas','Logicamente equivalentes','Obrigatoriamente mesma quantidade de portas','Obrigatoriamente mesma velocidade'],1,'A equivalência funcional compara saídas; componentes, quantidade e atrasos podem variar.']
];
for(let i=0;i<equivalencias.length;i++){
  const [p,o,c,r]=equivalencias[i];
  escolha('Equivalência de circuitos',i<4?'Intermediário':'Avançado',p,o,c,r);
}
for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]]){
  const s=a^b,c=a&b,indice=s*2+c;
  const labels=['S=0, C=0','S=0, C=1','S=1, C=0','S=1, C=1'];
  escolha('Circuitos aritméticos','Básico',`No meio somador, A=${a} e B=${b}. Quanto valem soma S e carry C?`,labels,indice,`S=A⊕B=${s}; C=A·B=${c}.`,labels.map((_,i)=>`Essa combinação daria S=${Math.floor(i/2)} e C=${i%2}, mas XOR de ${a} com ${b} é ${s} e AND é ${c}.`));
}
for(const [a,b,cin] of [[0,0,0],[0,0,1],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1],[0,1,0]]){
  const total=a+b+cin,s=total%2,c=Math.floor(total/2),indice=s*2+c;
  const labels=['S=0, Cout=0','S=0, Cout=1','S=1, Cout=0','S=1, Cout=1'];
  escolha('Circuitos aritméticos',total>1?'Avançado':'Intermediário',`No somador completo, A=${a}, B=${b} e Cin=${cin}. Qual par (S, Cout)?`,labels,indice,`A soma dos três bits é ${total}; S é o bit menos significativo (${s}) e Cout=${c}.`,labels.map((_,i)=>`O par proposto é (${Math.floor(i/2)},${i%2}), mas a soma ${a}+${b}+${cin}=${total} resulta em (S,Cout)=(${s},${c}).`));
}
function conceito(area,nivel,pergunta,certa,porque,erros){
  const op=[{texto:certa,motivo:porque},...erros.map(([texto,motivo])=>({texto,motivo}))];
  const correta=(questoes.length*3)%4;
  const vencedora=op.shift();
  op.splice(correta,0,vencedora);
  add(area,nivel,pergunta,op.map(x=>x.texto),correta,op.map(x=>x.motivo));
}
const seq='Flip-flops e contadores';
conceito(seq,'Básico','No latch RS construído com NOR, o que ocorre com S=0 e R=0?','Mantém o estado anterior','Sem comando de set ou reset, a realimentação conserva Q.',[['Q vira 1','Set exige S=1.'],['Q vira 0','Reset exige R=1.'],['Q alterna','Alternância automática não é o comportamento do latch RS.']]);
conceito(seq,'Básico','No latch RS com NOR, S=1 e R=0 provocam:','Set: Q=1','A entrada S ativa o estado set.',[['Reset: Q=0','Reset requer R=1.'],['Memória','Memória ocorre com S=R=0.'],['Alternância a cada clock','Esse latch não precisa de clock para o comando set.']]);
conceito(seq,'Básico','No latch RS com NOR, S=0 e R=1 provocam:','Reset: Q=0','A entrada R apaga o estado armazenado.',[['Set: Q=1','Set requer S=1.'],['Memória','A entrada R ativa altera o estado.'],['Divisão de frequência','O latch RS não é um divisor neste caso.']]);
conceito(seq,'Intermediário','No latch RS simples feito com NOR, qual é a combinação proibida?','S=1, R=1','Ambas as saídas podem ser forçadas a 0, contrariando a complementaridade esperada de Q e Q̅.',[['S=0, R=0','Essa combinação representa retenção.'],['S=1, R=0','Essa combinação produz set.'],['S=0, R=1','Essa combinação produz reset.']]);
conceito(seq,'Básico','Em que instante o flip-flop D captura a entrada D?','Na borda ativa do clock','No D acionado por borda, Q passa a registrar D quando ocorre a borda especificada.',[['A todo instante','Isso descreve um latch transparente, não um D disparado por borda.'],['Apenas quando D=0','O D registra tanto 0 quanto 1.'],['Somente ao desligar a fonte','A perda de alimentação não é uma operação de captura.']]);
conceito(seq,'Intermediário','Um flip-flop D recebe D=1, mas não ocorre borda ativa. O que acontece com Q?','Mantém o valor anterior','Sem a borda ativa, o estado armazenado não é atualizado.',[['Passa imediatamente a 1','Uma atualização imediata violaria o acionamento por borda.'],['Passa a 0','Não existe evento para forçar zero.'],['Fica indefinido','A ausência de borda preserva um estado válido conhecido.']]);
conceito(seq,'Intermediário','No flip-flop JK, com J=0 e K=0, na borda ativa ocorre:','Memória','A combinação 00 preserva Q.',[['Set','Para set é necessário J=1,K=0.'],['Reset','Para reset é necessário J=0,K=1.'],['Alternância','Para alternar é necessário J=K=1.']]);
conceito(seq,'Intermediário','No flip-flop JK, J=0 e K=1 significa:','Reset','O JK zera Q na borda ativa.',[['Set','Set exige J=1,K=0.'],['Memória','00 é a combinação de memória.'],['Alternância','11 é a combinação de alternância.']]);
conceito(seq,'Intermediário','No flip-flop JK, J=1 e K=0 significa:','Set','O JK coloca Q em 1 na borda ativa.',[['Reset','Reset exige J=0,K=1.'],['Memória','00 é memória.'],['Alternância','11 é alternância.']]);
conceito(seq,'Intermediário','No flip-flop JK, J=1 e K=1 significa:','Alternância de Q','A cada borda ativa Q passa para seu complemento.',[['Estado proibido','O JK foi projetado para resolver essa limitação do RS.'],['Memória','Memória é J=K=0.'],['Reset permanente','A saída não fica sempre em zero: ela alterna.']]);
conceito(seq,'Avançado','Qual característica de SET/PRESET e RESET/CLEAR assíncronos?','Podem agir sem esperar o clock','Controles assíncronos têm precedência funcional conforme o CI, independentemente da borda.',[['Só agem na borda de subida','Isso seria uma ação síncrona.'],['Só agem quando J=K=1','Eles são independentes de J e K.'],['Aumentam diretamente a frequência','O propósito é forçar o estado, não acelerar o clock.']]);
conceito(seq,'Intermediário','Qual sequência representa um contador BCD 8421 antes do retorno ao zero?','0 a 9','BCD possui dez estados válidos, de 0000 a 1001.',[['0 a 15','Essa é a contagem binária completa de quatro bits, não BCD de um dígito decimal.'],['0 a 5','Essa sequência corresponde a módulo 6.'],['1 a 16','BCD começa em zero e não usa 16 como estado de um dígito.']]);
conceito(seq,'Intermediário','Um contador módulo 6 percorre quais estados?','0, 1, 2, 3, 4 e 5','São seis estados distintos; quando chega a 6, reinicia em 0.',[['0 a 6','Incluir o 6 resultaria em sete estados.'],['0 a 9','Isso é a sequência de um contador BCD decimal.'],['0 a 15','Essa é a faixa de quatro bits sem truncamento.']]);
conceito(seq,'Avançado','Se D é conectado à saída complementar Q̅ do próprio flip-flop D, o que acontece em cada borda ativa?','Q alterna entre 0 e 1','A próxima entrada passa a ser o complemento do estado anterior.',[['Q fica sempre em 1','Depois de armazenar 1, D passa a 0.'],['Q fica sempre em 0','Depois de armazenar 0, D passa a 1.'],['Q perde a alimentação','A realimentação lógica não desliga o circuito.']]);

const ana='Diodos e transistores';
conceito(ana,'Básico','Quando um diodo de silício comum está diretamente polarizado, a tendência é:','Conduzir corrente ao superar sua região de condução','O ânodo positivo em relação ao cátodo favorece a condução.',[['Bloquear obrigatoriamente','Bloqueio típico ocorre sob polarização reversa, antes da ruptura.'],['Gerar energia','Diodo não é fonte de energia.'],['Inverter a frequência','Condução e frequência são conceitos diferentes.']]);
conceito(ana,'Básico','Na polarização reversa normal de um diodo, ele tende a:','Bloquear a corrente, exceto pequenas fugas','Antes da ruptura, a corrente reversa costuma ser pequena.',[['Conduzir como curto ideal','Isso corresponderia à condução direta idealizada.'],['Amplificar tensão','Diodo isolado não é amplificador.'],['Oscilar por clock','Não há clock em uma junção PN passiva.']]);
conceito(ana,'Básico','O retificador de meia onda aproveita quantos semiciclos de cada período da entrada senoidal?','Um','Ele bloqueia predominantemente um dos semiciclos.',[['Dois','Dois semiciclos são aproveitados pelo retificador de onda completa.'],['Nenhum','Com o diodo conduzindo existe saída pulsante.'],['Quatro','Uma senoide tem dois semiciclos por período.']]);
conceito(ana,'Intermediário','Um retificador de onda completa recebe 60 Hz. Qual é a frequência principal da ondulação sem filtro?','120 Hz','Há um pulso por semiciclo, portanto 2×60=120 Hz.',[['30 Hz','Dividir por dois representa o oposto do efeito de onda completa.'],['60 Hz','Essa seria a frequência do pulso de meia onda.'],['240 Hz','Quatro pulsos por período não correspondem à retificação completa simples.']]);
conceito(ana,'Intermediário','Qual é o papel do capacitor de filtragem após um retificador?','Reduzir a ondulação da tensão na carga','Ele armazena carga perto dos picos e a libera entre os picos.',[['Gerar corrente alternada nova','O capacitor não sintetiza uma fonte AC independente.'],['Eliminar qualquer queda nos diodos','Queda direta depende dos diodos e da corrente.'],['Dobrar obrigatoriamente a frequência','Filtrar não é multiplicar a frequência.']]);
conceito(ana,'Intermediário','Em um circuito ceifador com diodo, qual é a função principal?','Limitar trechos da forma de onda','A condução do diodo recorta amplitudes acima ou abaixo do limiar de polarização.',[['Aumentar o ganho de corrente de TBJ','Ceifador não determina β de transistor.'],['Somar dois bits','Somadores binários são circuitos digitais diferentes.'],['Armazenar um bit','Memória exige elementos bistáveis.']]);
conceito(ana,'Intermediário','No relatório de TBJ, Ic=0,500 mA e Ib=2,50 µA. Quanto vale β?','200','β=Ic/Ib=500 µA/2,50 µA=200.',[['2','Isso ignora a diferença entre mA e µA.'],['20','Isso subestima a razão por um fator 10.'],['2000','Isso superestima a razão por um fator 10.']]);
conceito(ana,'Intermediário','No TBJ sem resistor de emissor, o relatório registrou qual efeito após aquecer?','Vc caiu de cerca de 5,00 V para 2,48 V','O aquecimento aumentou Ic e a queda no resistor de coletor.',[['Vc ficou exatamente em 5,00 V','Essa estabilidade não foi observada sem Re.'],['Ic caiu para zero','O relatório mostrou aumento, não corte da corrente.'],['β tornou-se necessariamente constante','O ganho de corrente variou com a temperatura.']]);
conceito(ana,'Avançado','Por que Re=1 kΩ estabilizou o TBJ aquecido no relatório?','Introduz realimentação negativa no emissor','O aumento de Ic eleva Ve e reduz Vbe efetiva, contrariando o crescimento da corrente.',[['Eleva indefinidamente Vbe','A realimentação atua para reduzir Vbe efetiva.'],['Remove toda a corrente de base','A corrente continua existindo no ponto de operação.'],['Transforma o TBJ em diodo','A estrutura do transistor permanece a mesma.']]);
conceito(ana,'Avançado','Qual foi o ganho de tensão aproximado medido no amplificador TBJ do relatório?','−185 V/V','O valor prático foi ~−185 V/V, próximo do teórico ~−193 V/V.',[['+185 V/V','O sinal negativo representa inversão de fase do emissor comum.'],['−1 V/V','Isso não representa o ganho elevado observado.'],['+193 V/V','−193 V/V foi o valor teórico, com polaridade invertida.']]);
conceito(ana,'Intermediário','Em um MOSFET de crescimento de canal N, a condução significativa inicia quando:','Vgs supera a tensão de limiar Vth','A tensão porta-fonte precisa favorecer a formação do canal.',[['Vgs é sempre zero','Vgs nula normalmente não forma canal no tipo de crescimento.'],['Vds é sempre zero','Vds nula não sustenta corrente de dreno significativa.'],['O clock muda','O MOSFET discreto não depende de clock por definição.']]);
conceito(ana,'Avançado','Qual propriedade da porta de um MOSFET ideal explica corrente DC de entrada muito pequena?','Alta impedância de entrada','O óxido isolante separa eletricamente a porta do canal em condições normais.',[['Porta é um curto para o dreno','A porta isolada não constitui curto DC.'],['Porta tem resistência zero','Resistência zero causaria grande corrente, não pequena.'],['Não existe capacitância de porta','A capacitância existe e afeta chaveamento.']]);

const op='Amplificadores operacionais';
for(const [tipo,r1,r2,ganho,nivel] of [
  ['inversor',1,10,-10,'Básico'],['inversor',1,5,-5,'Intermediário'],['inversor',0.5,10,-20,'Intermediário'],
  ['não inversor',1,10,11,'Básico'],['não inversor',1,5,6,'Intermediário'],['não inversor',0.5,10,21,'Avançado']
]){
  const fator=tipo==='inversor'?'−R2/R1':'1+R2/R1';
  const respostas=[ganho,ganho>0?-ganho:Math.abs(ganho),ganho+1,ganho===0?2:ganho*2];
  conceito(op,nivel,`Um amplificador ${tipo} ideal usa R1=${r1} kΩ e R2=${r2} kΩ, com realimentação negativa. Qual é o ganho de tensão?`,`${ganho} V/V`,`Av=${fator}=${ganho} V/V.`,[[`${respostas[1]} V/V`,'Essa resposta troca o sinal: o inversor inverte a fase e o não inversor conserva.'],[`${respostas[2]} V/V`,'Somar uma unidade só é apropriado na fórmula do não inversor, e já está incorporado quando necessário.'],[`${respostas[3]} V/V`,'Dobrar o ganho não é consequência dos valores de R1 e R2 informados.']]);
}
conceito(op,'Básico','Qual é a diferença de fase ideal entre entrada e saída de um amplificador inversor, dentro da região linear?','180°','O sinal de ganho negativo representa inversão da senoide.',[['0°','Entrada e saída em fase caracteriza o não inversor.'],['90°','A inversão resistiva ideal não produz deslocamento de um quarto de ciclo.'],['360° adicionais','360° equivale a 0°, sem inversão.']]);
conceito(op,'Intermediário','No seguidor de tensão não inversor, qual é o ganho ideal de malha fechada?','+1 V/V','A saída acompanha a tensão de entrada.',[['0 V/V','Ganho zero apagaria o sinal.'],['−1 V/V','O seguidor não inverte a fase.'],['+10 V/V','O seguidor não multiplica a amplitude por dez.']]);
conceito(op,'Avançado','No circuito genérico do relatório, Vc=−10Va+10Vd+Vf. Se Va=0,2 V, Vd=0,1 V e Vf=0, quanto vale Vc?','−1,0 V','Vc=−10×0,2+10×0,1+0=−2+1=−1 V.',[['+1,0 V','Isso troca o sinal da contribuição de Va.'],['−3,0 V','O termo +10Vd deve ser somado, não subtraído.'],['+3,0 V','Esse resultado ignora os sinais dos ganhos.']]);
conceito(op,'Intermediário','Dois resistores de 10 kΩ em paralelo equivalem a qual resistência?','5 kΩ','Req=10×10/(10+10)=5 kΩ.',[['20 kΩ','Somar valores vale para associação em série, não paralelo.'],['10 kΩ','A associação em paralelo de resistores iguais reduz a resistência pela metade.'],['1 kΩ','O paralelo de dois 10 kΩ não reduz a resistência por um fator dez.']]);

const avancado='Filtros, memórias e conversores';
conceito(avancado,'Avançado','Em um filtro RC simples, R=1 kΩ e C=1 µF. Qual é aproximadamente a frequência de corte?','159 Hz','fc=1/(2πRC)=1/(2π×0,001)≈159 Hz.',[['1 Hz','O produto RC é 0,001 s, não cerca de 0,16 s.'],['1000 Hz','A fórmula contém o fator 2π.'],['159 kHz','A unidade do produto RC aqui resulta em frequência de centenas de hertz.']]);
conceito(avancado,'Intermediário','No ponto de −3 dB de um filtro de primeira ordem com ganho unitário na banda, qual é |Vout/Vin|?','Aproximadamente 0,707','−3,01 dB corresponde a 1/√2 da amplitude de referência.',[['0','Não é atenuação completa.'],['0,5','Meia amplitude corresponde a aproximadamente −6 dB.'],['2','Amplitude dobrada equivale a ganho positivo, cerca de +6 dB.']]);
conceito(avancado,'Avançado','Qual ganho em dB corresponde aproximadamente a |Vout/Vin|=0,707?','−3 dB','20log10(0,707)≈−3,01 dB.',[['+3 dB','Esse sinal indicaria amplificação em vez de atenuação.'],['−20 dB','−20 dB equivale a 0,1 da amplitude.'],['0 dB','0 dB exige relação de amplitudes 1.']]);
conceito(avancado,'Avançado','Em frequências bem acima do corte, qual inclinação assintótica tem um passa-baixa de primeira ordem?','Aproximadamente −20 dB por década','Um polo de primeira ordem reduz a magnitude em cerca de 20 dB a cada multiplicação da frequência por dez.',[['+20 dB por década','Isso indicaria aumento do ganho.'],['−3 dB por década','−3 dB é a atenuação aproximada no ponto de corte, não a inclinação.'],['0 dB por década','A banda de rejeição não permanece plana em um polo simples.']]);
conceito(avancado,'Básico','Qual faixa de frequência um filtro passa-alta deixa passar preferencialmente?','Frequências acima da região de corte','Ele atenua frequências baixas e deixa passar as mais altas.',[['Somente 0 Hz','0 Hz é corrente contínua e costuma ser bloqueada pelo passa-alta.'],['Somente baixas frequências','Isso descreve um passa-baixa.'],['Nenhuma frequência','Um filtro passa-alta possui banda passante.']]);
conceito(avancado,'Intermediário','Qual é a finalidade de um filtro passa-faixa?','Selecionar uma banda de frequências','Ele atenua sinais abaixo e acima da região de passagem.',[['Passar apenas corrente contínua','Isso não descreve uma banda intermediária.'],['Deixar passar todas as frequências igualmente','Assim não haveria filtragem seletiva.'],['Inverter bits','Filtros tratam componentes de frequência, não operações booleanas.']]);
conceito(avancado,'Intermediário','Um conversor A/D ideal com 8 bits pode representar quantos códigos binários diferentes?','256','Oito bits produzem 2⁸=256 códigos.',[['8','Oito é a quantidade de bits, não de combinações.'],['128','128 corresponde a 2⁷.'],['1024','1024 corresponde a 2¹⁰.']]);
conceito(avancado,'Básico','Qual das memórias abaixo normalmente perde o conteúdo quando falta alimentação?','SRAM','SRAM é uma memória volátil.',[['EEPROM','EEPROM conserva informação sem alimentação.'],['Flash','Flash é não volátil.'],['ROM','Memória somente de leitura é não volátil.']]);
conceito(avancado,'Básico','Qual propriedade distingue a EEPROM da SRAM?','A EEPROM mantém os dados sem energia','A EEPROM é não volátil, enquanto SRAM é volátil.',[['A EEPROM exige clock para armazenar qualquer bit','EEPROM não é definida por sincronismo com clock.'],['A SRAM não permite leitura','SRAM permite leitura e escrita.'],['As duas são sempre não voláteis','A SRAM perde conteúdo sem alimentação.']]);
conceito(avancado,'Intermediário','Um multiplexador 4051 usa três linhas de seleção. Quantos canais podem ser endereçados?','8 canais','Três bits representam 2³=8 possibilidades.',[['3 canais','Três é o número de bits de seleção, não de canais.'],['6 canais','A quantidade de canais cresce em potência de dois.'],['16 canais','16 canais exigiriam quatro bits de seleção.']]);
conceito(avancado,'Avançado','Em soma sem sinal de 4 bits, 1001₂ + 0111₂ produz qual valor armazenado, descartando o carry?','0000₂','9+7=16=10000₂; os quatro bits menos significativos são 0000.',[['10000₂','Esse resultado requer cinco bits e não cabe no registrador de quatro.'],['1111₂','1111₂ representa 15, mas a soma é 16.'],['0001₂','O descarte do quinto bit não deixa 1 nos quatro bits inferiores.']]);
conceito(avancado,'Avançado','No subtrator completo, A=0, B=1 e Bin=1. Quais são diferença e empréstimo?','D=0 e Bout=1','0−1−1=−2; em binário de um bit, D=0 e sai empréstimo 1.',[['D=1 e Bout=0','A diferença de −2 exige empréstimo; 1 não representa o bit menos significativo.'],['D=1 e Bout=1','A diferença de −2 é par; o bit de diferença é 0.'],['D=0 e Bout=0','Sem empréstimo não seria possível representar a subtração 0−1−1.']]);
window.laboratorioQuestoes=questoes;

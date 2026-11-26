Título: PRÁTICA Nº 7 – FLIP-FLOPS
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2010

Disciplina: Laboratório de Sistemas Digitais

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/10/2026



Objetivos da Atividade
Verificar o funcionamento dos flip-flops RS, D e JK, incluindo memória, clock, SET/RESET e contadores BCD e
módulo 6.

Materiais e Ferramentas
Manual de Sistemas Digitais; unidade Minipa SD-1202 e módulo M-1113A; circuitos 4001, 4013 e 4027; fonte,
chaves, LEDs, cabos e osciloscópio Minipa MO-2061; Logisim Evolution.

Procedimentos e desenvolvimento dos exercícios
Foram examinadas as combinações de RS e JK e o acionamento do RS com clock na bancada. Os circuitos D,
os controles assíncronos e os contadores foram testados no Logisim Evolution.

Exercícios e resultados
Nas tabelas, Qₐ representa o estado anterior e Q̅, a saída complementar. Nos circuitos 4013 e 4027, SET e
RESET são ativos em nível alto; durante a operação normal, permanecem em 0.

A. Flip-Flop RS básico — manual, p. 24 a 26
Item 1 — Circuito equivalente e tabela-verdade. A realimentação entre duas portas NOR mantém o último
estado de Q quando S = R = 0. S = 1 ativa Set; R = 1 ativa Reset. As fotos mostram os comandos S e R do
CD4027.




                                  Relatório de Aula Prática — Prática nº 7 | Página 1
Figura 1 — Circuito lógico do latch RS com duas portas NOR e realimentação cruzada.




Figura 2 — Comandos S = 1 e R = 1 no CD4027 (ativação simultânea dos controles).




                Relatório de Aula Prática — Prática nº 7 | Página 2
Figura 3 — Comandos S = 0 e R = 1 no CD4027 (reset; Q = 0 esperado).




Figura 4 — Comandos S = 1 e R = 0 no CD4027 (set; Q = 1 esperado).




         Relatório de Aula Prática — Prática nº 7 | Página 3
    Figura 5 — Comandos S = 0 e R = 0 no CD4027, com SET e RESET inativos. Mantém-se o funcionamento pelas entradas J, K e clock.
S                           R                         Qf                         Qf̅                      Condição
0                           0                         Qₐ                         Q̅ₐ                      Memória
0                           1                         0                          1                        Reset
1                           0                         1                          0                        Set
1                           1                         X                          X                        Não permitida

Item 2 — Condições de memória e estado não permitido. Com S = R = 0, o latch NOR conserva Qₐ. Com S
= R = 1, as duas saídas são forçadas a 0; ao liberar as entradas, o estado final é indeterminado.

A.1. RS com entrada C (clock) — registro no osciloscópio (manual, p. 20)
No RS habilitado por nível, C = 0 mantém o estado anterior; C = 1 permite que S e R alterem Q. O osciloscópio
registra a comutação do sinal.




                                          Relatório de Aula Prática — Prática nº 7 | Página 4
Figura 6 — Montagem do RS com entrada C e osciloscópio conectado (foto da aula).




               Relatório de Aula Prática — Prática nº 7 | Página 5
                                   Figura 7 — Ligações do módulo M-1113A (foto da aula).




                Figura 8 — Osciloscópio MO-2061: sinal ciano com transições e sinal amarelo quase constante.
O sinal ciano alterna entre dois níveis, enquanto o amarelo permanece aproximadamente constante. O RS
muda de estado com C = 1 e mantém o valor armazenado com C = 0.




                                    Relatório de Aula Prática — Prática nº 7 | Página 6
B. Flip-Flop tipo D — manual, p. 26 a 30
Item 1 — Entrada D sem clock. Sem nova borda ativa do clock, Q mantém o último valor, mesmo quando D
muda.
D                                     Qf                                            Qf̅
0                                     Qₐ                                            Q̅ₐ
1                                     Qₐ                                            Q̅ₐ




                         Figura 9 — Simulação do D sem nova borda de clock (Logisim Evolution).
Item 2 — Entrada D com clock. Na borda ativa do clock, Q recebe o valor de D e Q̅ assume o valor
complementar.
D                                     Qf                                            Qf̅
0                                     0                                             1
1                                     1                                             0




                           Figura 10 — Esquema e princípio de armazenamento do flip-flop D.




                                   Relatório de Aula Prática — Prática nº 7 | Página 7
                              Figura 11 — Simulação do D com clock (Logisim Evolution).
Item 3 — Realimentação de Q̅ para D. Quando D recebe Q̅, cada borda ativa do clock inverte Q: 0 → 1 → 0 →
1.




                               Figura 12 — Ligação ilustrativa da realimentação Q̅ → D.
Evento                              Qf                                            Qf̅
Estado inicial                      0                                             1
1º pulso                            1                                             0
2º pulso                            0                                             1
3º pulso                            1                                             0
4º pulso                            0                                             1




                                 Relatório de Aula Prática — Prática nº 7 | Página 8
Figura 13 — Circuito simulado com realimentação da saída complementar Q̅ para a entrada D. Fonte: simulação no Logisim Evolution 5.0.0.




     Figura 14 — Resultado da realimentação Q̅ → D após pulsos sucessivos de clock. Fonte: simulação no Logisim Evolution 5.0.0.
Item 4 — Teste de Set e Reset. SET = 1 força Q = 1; RESET = 1 força Q = 0, independentemente do clock,
desde que o outro controle esteja em 0. Com ambos em 0, D volta a depender do clock.
Item 5 — Preset e Clear. Preset e Clear mudam Q sem pulso de clock. No 4013, SET = 1 produz Q = 1 e
RESET = 1 produz Q = 0. Não se usam os dois controles ativos ao mesmo tempo.




                                          Relatório de Aula Prática — Prática nº 7 | Página 9
                                  Figura 15 — Ação assíncrona de SET e RESET nos flip-flops CMOS.
SET                               RESET                              Qf                                Descrição
0                                 0                                  Conforme D e CLK                  Operação normal
1                                 0                                  1                                 Preset
0                                 1                                  0                                 Clear
1                                 1                                  Evitar                            Controles simultâneos




Figura 16 — Simulação dos controles assíncronos SET (preset) e RESET (clear) do flip-flop D. Fonte: simulação no Logisim Evolution 5.0.0.

C. Flip-Flop JK — manual, p. 30 a 32
Item 1 — Tabela-verdade do JK. Com SET = RESET = 0, J e K definem memória, reset, set ou alternância em
cada borda ativa do clock.




                                          Relatório de Aula Prática — Prática nº 7 | Página 10
                                    Figura 17 — Bloco funcional do JK e suas condições lógicas.




Figura 18 — Montagem em bancada do flip-flop JK com J = 0 e K = 0 (condição de memória). Fonte: registro fotográfico da aula prática.




                                        Relatório de Aula Prática — Prática nº 7 | Página 11
 Figura 19 — Montagem do JK com J = 1 e K = 0 (operação Set; Q = 1 após a borda ativa, como previsto na tabela).




Figura 20 — Montagem do JK com J = 0 e K = 1 (operação Reset; Q = 0 após a borda ativa, como previsto na tabela).




                              Relatório de Aula Prática — Prática nº 7 | Página 12
        Figura 21 — Montagem do JK com J = K = 1. Nessa configuração, Q alterna a cada borda ativa de clock (modo toggle).
J                               K                                Qf                                Operação
0                               0                                Qₐ                                Mantém o último estado
0                               1                                0                                 Reset
1                               0                                1                                 Set
1                               1                                Q̅ₐ                               Toggle

Item 2 — J = K = 1 (toggle). Com J = K = 1, Q muda de 0 para 1 ou de 1 para 0 a cada pulso ativo. Esse modo
pode ser usado em contadores.




                                       Relatório de Aula Prática — Prática nº 7 | Página 13
                               Figura 22 — Cronograma do JK em modo toggle (Logisim Evolution).
Item 3 — Preset e Clear no JK. SET = 1 força Q = 1; RESET = 1 força Q = 0, sem depender de J, K ou do
clock. Na operação normal, ambos permanecem em 0.




      Figura 23 — Simulação do JK com acionamento assíncrono de SET e RESET. Fonte: simulação no Logisim Evolution 5.0.0.




                                      Relatório de Aula Prática — Prática nº 7 | Página 14
Item 4 — Contador BCD 8421 com quatro JK. Quatro JK em toggle representam os bits de pesos 1, 2, 4 e 8.
Como o CD4027 é acionado pela borda de subida, Q̅ pode fornecer o clock do estágio seguinte na contagem
crescente. Ao atingir 1010 (decimal 10), o RESET retorna o contador a 0000.




              Figura 24 — Projeto conceitual de contador BCD 8421 com quatro JK e reinicialização no decimal 10.
Decimal               Q3 (8)                      Q2 (4)                     Q1 (2)                     Q0 (1)
0                     0                           0                          0                          0
1                     0                           0                          0                          1
2                     0                           0                          1                          0
3                     0                           0                          1                          1
4                     0                           1                          0                          0
5                     0                           1                          0                          1
6                     0                           1                          1                          0
7                     0                           1                          1                          1
8                     1                           0                          0                          0
9                     1                           0                          0                          1




                                     Relatório de Aula Prática — Prática nº 7 | Página 15
   Figura 25 — Circuito simulado do contador BCD 8421 utilizando quatro flip-flops JK. Fonte: simulação no Logisim Evolution 5.0.0.




                        Figura 26 — Contagem BCD de 0000 a 1001, com retorno a 0000 (Logisim Evolution).
Item 5 — Clock de 1 Hz. Com clock de 1 Hz, a contagem avança a cada segundo: 0000 → 0001 → … → 1001
→ 0000. Q0 alterna a cada pulso; os demais bits acompanham a sequência BCD.




                                        Relatório de Aula Prática — Prática nº 7 | Página 16
                   Figura 27 — Sequência prevista das saídas Q0 a Q3 em função dos pulsos de 1 Hz.




                          Figura 28 — Contagem BCD com clock de 1 Hz (Logisim Evolution).
Item 6 — Contador de 0 a 5. Três JK em toggle geram 000 → 001 → 010 → 011 → 100 → 101. Quando Q2 =
Q1 = 1 (110), o RESET retorna a contagem para 000.




                                 Relatório de Aula Prática — Prática nº 7 | Página 17
             Figura 29 — Diagrama conceitual de contador módulo 6 com reset em 110.
Decimal         Q2 (4)                             Q1 (2)                          Q0 (1)
0               0                                  0                               0
1               0                                  0                               1
2               0                                  1                               0
3               0                                  1                               1
4               1                                  0                               0
5               1                                  0                               1
Próximo         0                                  0                               0




          Figura 30 — Contador módulo 6 de 000 a 101 e retorno a 000 (Logisim Evolution).




                         Relatório de Aula Prática — Prática nº 7 | Página 18
Resultados Obtidos
No RS, S e R controlam memória, set e reset. O D armazena o dado na borda de clock; com D = Q̅, alterna
entre 0 e 1. O JK também alterna quando J = K = 1. O contador BCD vai de 0 a 9, e o módulo 6, de 0 a 5.

Respostas das Questões
RS: S = R = 0 mantém Q; S = 1 ativa Set; R = 1 ativa Reset. D: Q registra D na borda de clock. JK: J = K = 1
alterna Q. SET/RESET atuam sem clock. Os contadores reiniciam em 1010 (BCD) e 110 (módulo 6).

Dificuldades e Soluções
Os controles assíncronos SET/RESET foram separados das entradas dependentes de clock. Nos contadores, a
lógica de RESET limita a sequência aos estados de 0 a 9 ou de 0 a 5.

Conclusão
O RS conserva um bit por realimentação; o D registra o valor de entrada na borda de clock; e o JK permite
memória, set, reset e alternância. Essas funções foram aplicadas aos contadores BCD e módulo 6.




                                  Relatório de Aula Prática — Prática nº 7 | Página 19

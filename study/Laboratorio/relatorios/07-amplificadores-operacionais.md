Título: Amplificadores Operacionais
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2009

Disciplina: Laboratório de Projetos Eletrônicos

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/10/2026


Objetivos da Atividade
Analisar as configurações inversora, não inversora e genérica da placa 1107A. Determinar
tensões nos nós, ganhos de malha fechada, efeito da alteração de resistências e
comportamento de sinais contínuos e senoidais, conforme as páginas 24 a 28 do Manual de
Sistemas Analógicos.


Materiais e Ferramentas
Manual de Sistemas Analógicos; referencial teórico de amplificadores operacionais;
esquemas da placa 1107A; LTspice com modelo UniversalOpamp2; fonte simétrica de ±12 V;
resistores de 100 kΩ, 10 kΩ e 1 kΩ; gerador senoidal de 1 kHz.


Procedimentos Realizados
No amplificador inversor, foram calculadas as tensões nos nós e os ganhos a partir do
divisor resistivo de entrada e da realimentação negativa, com alimentação de ±12 V. Nas
configurações não inversora e genérica, foram realizadas simulações no LTspice com o
modelo UniversalOpamp2. As formas de onda e os resultados foram analisados conforme as
resistências indicadas no manual.
Evidências (Desenhos e Cálculos)
Parte 1 — Amplificador inversor (manual, p. 24–26)
1.1 — Tensão contínua e ganho




           Figura 1 — Circuito inversor e atenuador com nós A, B, C e D (Manual de Sistemas Analógicos, p. 24).

Valores: Ra = 100 kΩ; Rb = 1 kΩ; R1 = 1 kΩ; R2 = 10 kΩ; Vcc = ±12 V. Pelo divisor de tensão de
entrada, calcula-se Vb; no amplificador inversor ideal, o nó C permanece em terra virtual (Vc ≈ 0 V).
Vb = Va × Rb/(Ra + Rb) = Va × 1.000/(100.000 + 1.000) ≈ 0,00990Va; Av = Vd/Vb = −R2/R1 = −10; Vd
= −10Vb.
Nó A                   B (V)                     C (V)                    D (V)                     Ganho teórico
0V                     0                         0                        0                         — (0/0)
+12 V                  +0,1188                   ≈0                       −1,1881                   −10
−12 V                  −0,1188                   ≈0                       +1,1881                   −10




                                 Figura 2 — Tensões contínuas calculadas para Va = +12 V.

Interpretação: para Va = +12 V, Vb ≈ +0,1188 V e Vd ≈ −1,1881 V. Para Va = −12 V, Vb ≈ −0,1188 V e Vd
≈ +1,1881 V. A saída possui polaridade oposta à entrada do estágio inversor, com ganho −10.
                      Figura 3 — Tensões calculadas nos nós B, C e D para Va = +12 V.




                      Figura 4 — Tensões calculadas nos nós B, C e D para Va = −12 V.

1.2 — Mudança de ganho
Para Va = +12 V, o divisor de entrada fornece Vb ≈ +0,1188 V. A alteração de R2 ou R1 modifica o
ganho do estágio inversor: R2 || 10 kΩ resulta em R2 = 5 kΩ e Av = −5; R1 || 1 kΩ resulta em R1 = 500
Ω e Av = −20.
Modificação          B (V)                 C (V)                 D (V)                  Av
R2 || 10 kΩ          +0,1188               ≈0                    −0,5941                −5
R1 || 1 kΩ           +0,1188               ≈0                    −2,3762                −20
                 Figura 5 — Ganhos teóricos para a configuração original e as alterações de resistores.

A redução de R2 diminui o módulo do ganho; a redução de R1 aumenta o ganho de tensão em
módulo.




                  Figura 6 — Tensões calculadas com R1 equivalente a 500 Ω e ganho −20.

1.3 — Ganho em corrente alternada
Para Ra = 10 kΩ, Rb = 1 kΩ, Va = 2 V de pico e frequência de 1 kHz, obtém-se Vb = Va × 1/(10 + 1),
com amplitude de 0,1818 Vp. Com ganho −10, a saída D apresenta amplitude de 1,8182 Vp e
defasagem de 180° em relação à entrada A.
B (Vp)                      C (Vp)                           D (Vp)                          Fase A/D
0,1818                      ≈0                               1,8182                          180°
Figura 7 — Formas de onda calculadas em A e B: atenuação antes do estágio inversor.




    Figura 8 — Formas de onda calculadas em A e D: saída com oposição de fase.




    Figura 9 — Formas de onda teóricas do inversor em 0–5 ms, com B e D em oposição de fase.
Parte 2 — Amplificador não inversor (manual, p. 26–27)
2.1 — Tensão contínua e ganho




                  Figura 10 — Circuito não inversor do manual com atenuador de entrada (p. 26).

Ra = 100 kΩ; Rb = 1 kΩ; R1 = 1 kΩ; R2 = 10 kΩ. Como a entrada não inversora apresenta elevada
impedância, Vb = Va × 1.000/(100.000+1.000) = Va/101; Vc ≈ Vb. O ganho é Av = 1 + R2/R1 = +11.
Nó A                B (V)                   C (V)                     D (V)                     Ganho teórico
0V                  0                       0                         0                         — (0/0)
+12 V               +0,1188                 +0,1188                   +1,3069                   +11
−12 V               −0,1188                 −0,1188                   −1,3069                   +11




                    Figura 11 — Tensões contínuas calculadas para Va = +12 V no não inversor.

Interpretação: a saída D mantém o mesmo sinal de B, e os nós B e C apresentam tensões
aproximadamente iguais.
              Figura 12 — Tensões B, C e D simuladas; B e C confirmam o curto virtual.
2.2 — Mudança de ganho
Modificação            B (V)              C (V)               D (V)                  Av
R2 || 10 kΩ            +0,1188            +0,1188             +0,7129                +6
R1 || 1 kΩ             +0,1188            +0,1188             +2,4950                +21
R2 em curto            +0,1188            +0,1188             +0,1188                +1




              Figura 13 — Ganho não inversor original e após mudanças de resistores.
Ao curto-circuitar R2, obtém-se o seguidor de tensão, cujo ganho ideal é unitário.
                    Figura 14 — Seguidor de tensão com R2 em curto e ganho unitário.

2.3 — Ganho em corrente alternada
Com Va = 2 V de pico a 1 kHz, foram obtidas amplitudes aproximadas de Vb = Vc = 0,0198 Vp e Vd =
0,2178 Vp. As formas de onda em A e D permanecem em fase.
B (Vp)                   C (Vp)                     D (Vp)                     Fase A/D
0,0198                   0,0198                     0,2178                     0°




            Figura 15 — Formas de onda calculadas em A, B/C e D, todas em fase.
            Figura 16 — Resposta simulada não inversora, com entrada e saída em fase.

Parte 3 — Amplificador genérico (manual, p. 27–28)
3.1 — Entradas individuais e ganhos




              Figura 17 — Circuito genérico com as entradas A, D e F e saída C (manual, p. 28).
          Figura 18 — Simulação do circuito genérico com entradas aterradas e alimentação ±12 V.
R1 = R3 = 1 kΩ e R2 = R4 = 10 kΩ. A realimentação negativa impõe Vb ≈ Ve. No ramo não inversor, Ve
= (10Vd + Vf)/11; no ramo inversor, Vc = 11Ve − 10Va.
Equação geral: Vc = −10Va + 10Vd + Vf. Nas condições individuais, apenas uma entrada recebe 0,5 V,
com as outras duas aterradas.




                         Figura 19 — Contribuição simulada da entrada Vd = 0,5 V.
                    Figura 20 — Contribuição simulada da entrada Vf = 0,5 V.

Entrada 0,5 V   B (V)                    C (V)                   E (V)                    Ganho
A               0                        −5,000                  0                        −10
D               +0,4545                  +5,000                  +0,4545                  +10
F               +0,0455                  +0,500                  +0,0455                  +1




                        Figura 21 — Ganhos calculados para A, D e F isoladamente.




                Figura 22 — Saídas calculadas com 0,5 V aplicada a uma entrada por vez.
3.2 — Sinais simultâneos
Com F = 0 e senoides Va = Vd = 2 sen(2π × 1.000t) V, a simulação apresentou saída C com
resíduo de aproximadamente 1,9 µVp e nó E com amplitude de 1,818 Vp. O resíduo na saída
é compatível com o cancelamento das contribuições no circuito.




           Figura 23 — Formas de onda simuladas no circuito genérico com Va e Vd simultâneos.

Condição               B (Vp)                   C (Vp)                    E (Vp)                   Vc/Va
Va = Vd, 2 Vp, 1
                       1,818                    ≈0                        1,818                    ≈0
kHz; F = 0




           Figura 24 — Formas de onda calculadas nos nós A, C e E, com as entradas A e D em fase e F aterrado.
                Figura 25 — Relação teórica de transferência do circuito genérico com F aterrado.

A saída do circuito genérico corresponde ao nó C. Com sinais de mesma amplitude e fase nas
entradas A e D, as contribuições −10Va e +10Vd se cancelam. O nó E apresenta a tensão
resultante do divisor resistivo da entrada não inversora.

Resultados Obtidos
No amplificador inversor, o ganho é −10, passando a −5 com R2 equivalente a 5 kΩ e a −20
com R1 equivalente a 500 Ω. No não inversor, os ganhos calculados são +11, +6, +21 e +1,
conforme a configuração. No circuito genérico, a saída obedece à expressão Vc = −10Va +
10Vd + Vf, compatível com os valores das tabelas e as formas de onda.

Respostas das Questões
Parte 1: o resistor R2 realiza a realimentação do inversor; o nó C permanece próximo de
zero e o sinal em D é invertido em 180°. Parte 2: o não inversor mantém B e C em tensões
próximas, produz saída em fase e ganho 1 + R2/R1. Parte 3: A contribui com ganho −10, D
com +10 e F com +1, sendo o circuito um somador ponderado.

Dificuldades e Soluções
No amplificador inversor, o divisor Ra/Rb determina a tensão no nó B, enquanto a razão
R2/R1 determina o ganho e a inversão de fase. A realimentação negativa mantém C próximo
de zero na região linear. No circuito genérico, a superposição permite avaliar separadamente
as contribuições das entradas A, D e F.

Conclusão
O ganho depende da realimentação e dos valores dos resistores. O amplificador inversor
altera a fase em 180°, o não inversor mantém a fase e o genérico combina três sinais com
ganhos diferentes.

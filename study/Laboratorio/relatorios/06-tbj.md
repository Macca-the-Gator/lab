Título: TBJ
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2009

Disciplina: Laboratório de Projetos Eletrônicos

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/09/2026


Objetivos da Atividade
Analisar o funcionamento de um transistor bipolar de junção (TBJ) na região ativa, verificar
a influência do ganho de corrente β e da resistência de emissor sobre a estabilidade do
ponto de operação e estudar o TBJ operando como amplificador de pequenos sinais.


Materiais e Ferramentas
Transistor BC548C; resistores de 100 Ω, 1 kΩ, 10 kΩ e 100 kΩ; fontes CC; gerador de sinais;
multímetro; osciloscópio; ferro de solda para aquecimento controlado do transistor; cabos
de conexão e bancada de Sistemas Analógicos.


Procedimentos Realizados
Na Parte 1 foi montado inicialmente o circuito sem resistência de emissor, ajustando a fonte
V1 até obter aproximadamente Vc = 5 V em temperatura ambiente. Foram considerados os
valores de VA, VB e VC e, a partir deles, calculadas as correntes de base e coletor e o ganho β.
O procedimento foi repetido com o transistor aquecido. Depois foi analisada a mesma
polarização com Re = 1 kΩ, permitindo comparar a estabilidade térmica. Na Parte 2 foi
analisado o transistor como amplificador: foi obtido o modelo de pequenos sinais, ajustado
o ponto de operação para VCE ≈ 5 V e aplicado um sinal senoidal de 1 kHz até obter
aproximadamente 1 V de pico no coletor. Foram registradas as formas de onda solicitadas e
calculados Av0, Gv0 e gm.
Evidências (Desenhos e Cálculos)
Os valores apresentados abaixo foram obtidos experimentalmente durante a prática de
bancada, a partir das medições realizadas no circuito com o transistor BC548C.

Parte 1 – Influência de β e da resistência de emissor
a) Circuito sem resistência de emissor




                          Figura 1 – Circuito da Parte 1(a), conforme o manual.

Para a temperatura ambiente, V1 foi ajustada até Vc ≈ 5,00 V. Mantendo o ajuste e
aquecendo o transistor, observou-se aumento da corrente de coletor e redução de Vc,
evidenciando a sensibilidade térmica do circuito sem realimentação de emissor.

 Temperatur                                                   IB=(VA−VB)/     IC=(V2−VC)/
                  VA              VB               VC                                       β=IC/IB
     a                                                             RB              RC
  Ambiente      0,705 V         0,680 V          5,00 V          2,50 µA        0,500 mA     200
  Aquecido      0,704 V         0,670 V          2,48 V          3,40 µA        0,752 mA     221



Cálculo a partir dos valores medidos (ambiente): IB = (0,705 − 0,680)/10 kΩ = 2,50 µA; IC =
(10 − 5,00)/10 kΩ = 0,500 mA; β ≈ 0,500 mA / 2,50 µA = 200.

Cálculo a partir dos valores medidos (aquecido): IB ≈ (0,704 − 0,670)/10 kΩ = 3,40 µA; IC ≈
(10 − 2,48)/10 kΩ = 0,752 mA; β ≈ 221.

b) Circuito com resistência de emissor Re = 1 kΩ
                  Figura 2 – Circuito da Parte 1(b), com resistência de emissor de 1 kΩ.

 Temperatur                                                   IB=(VA−VB)/      IC=(V2−VC)/
                  VA              VB               VC                                        β=IC/IB
     a                                                             RB               RC
  Ambiente      1,208 V         1,183 V          5,00 V          2,50 µA         0,500 mA     200
  Aquecido      1,208 V         1,185 V          4,88 V          2,30 µA         0,512 mA     223



Com Re = 1 kΩ, o aquecimento provoca uma variação muito menor na corrente de coletor:
aproximadamente 0,500 mA para 0,512 mA. A queda de tensão no emissor aumenta quando
a corrente tende a subir, reduzindo VBE efetivo e criando realimentação negativa. Assim, o
ponto de operação fica menos dependente de β e da temperatura.

c) Discussão dos resultados dos itens “a” e “b”
No circuito sem Re, o aquecimento alterou significativamente o ponto de operação: Vc caiu
de aproximadamente 5,00 V para 2,48 V, resultado do aumento da corrente de coletor. Já
com Re = 1 kΩ, Vc permaneceu próxima de 5 V (aprox. 4,88 V). Portanto, a resistência de
emissor melhora consideravelmente a estabilidade térmica e reduz a influência das
variações de β.

Parte 2 – Transistor como amplificador
                   Figura 3 – Circuito amplificador a TBJ apresentado no manual.

a) Modelo de pequenos sinais e equações




            Figura 4 – Modelo de pequenos sinais utilizado para a análise, desprezando ro.
No ponto de operação medido, VCE ≈ 5 V e IC ≈ 0,500 mA. Considerando VT ≈ 25,9 mV e β ≈
200:

gm = IC/VT ≈ 0,500 mA / 25,9 mV ≈ 19,3 mS

rπ = β/gm ≈ 200 / 0,0193 ≈ 10,4 kΩ

Desprezando ro, o ganho da base para o coletor é aproximadamente: Av0 = vo/vi ≈ −gm·RC
≈ −0,0193·10 kΩ ≈ −193 V/V.

Para o ganho global Gv0 = vo/vsig, foi considerada a atenuação produzida por R1 = 1 kΩ, R2
= 100 Ω, Rsig = 10 kΩ, Rb = 100 kΩ e pela resistência de entrada rπ. O valor teórico obtido
foi aproximadamente Gv0 ≈ −8,46 V/V.

b) Medições e formas de onda
O gerador de sinais foi ajustado para 1 kHz. A amplitude foi ajustada para obter
aproximadamente 1,00 V de pico no ponto C. Os valores medidos foram: Vsig ≈ 0,120 Vp, VA
≈ 8,32 mVp, VB ≈ 5,4 mVp e VC ≈ 1,00 Vp em acoplamento AC. A saída apresenta inversão de
fase de aproximadamente 180°.

Formas de onda medidas nos pontos A e C com acoplamento AC.




Formas de onda Ponto B e Ponto C (AC)
Tensão no ponto B com acoplamento DC: nível CC próximo de 0,616 V com pequena
componente senoidal.




Tensão no ponto C com acoplamento DC: nível CC próximo de 5 V e sinal amplificado
invertido.
          Parâmetro                       Calculado                    Prático medido
              gm                           19,3 mS                         18,5 mS
          Av0 = vo/vi                     −193 V/V                        −185 V/V
         Gv0 = vo/vsig                    −8,46 V/V                       −8,33 V/V
    Defasagem saída/entrada                 180°                            ≈ 180°



Os valores práticos medidos permaneceram próximos dos valores calculados. As diferenças
são compatíveis com a dispersão de β do transistor, tolerância dos resistores, resistência de
saída do gerador, efeito de ro e demais não idealidades do TBJ.


Resultados Obtidos
Na Parte 1, o circuito sem resistência de emissor apresentou forte alteração do ponto de
operação com o aquecimento: a corrente de coletor aumentou e a tensão no coletor caiu de
aproximadamente 5,00 V para 2,48 V. Com Re = 1 kΩ, a variação foi muito menor, mantendo
Vc próxima de 5 V. Isso confirma o efeito estabilizador da realimentação de emissor. Na
Parte 2, o circuito apresentou comportamento de amplificador emissor comum, com saída
amplificada e invertida em aproximadamente 180°. O ganho prático medido Av0 ≈ −185 V/V
ficou próximo do valor teórico de aproximadamente −193 V/V.


Respostas das Questões
Parte 1(a): em temperatura ambiente foram obtidos aproximadamente IB = 2,50 µA, IC =
0,500 mA e β = 200. Com o transistor aquecido, os valores medidos foram IB ≈ 3,40 µA, IC ≈
0,752 mA e β ≈ 221.
Parte 1(b): com Re = 1 kΩ, a corrente de coletor variou apenas de aproximadamente 0,500
mA para 0,512 mA após o aquecimento, evidenciando maior estabilidade térmica.

Parte 1(c): a resistência de emissor introduz realimentação negativa. Se a corrente aumenta,
a tensão no emissor também aumenta, reduzindo VBE e contrariando o aumento inicial da
corrente.

Parte 2(a): gm ≈ 19,3 mS, rπ ≈ 10,4 kΩ, Av0 ≈ −193 V/V e Gv0 ≈ −8,46 V/V.

Parte 2(b): para VC ≈ 1,00 V de pico em 1 kHz, foram medidos Vsig ≈ 0,120 Vp, vi no ponto B
≈ 5,4 mVp, Av0 prático ≈ −185 V/V, Gv0 prático ≈ −8,33 V/V e gm prático ≈ 18,5 mS.


Dificuldades e Soluções
Durante a prática, foi necessário realizar com atenção o ajuste do ponto de operação do
transistor, principalmente para manter a tensão no coletor próxima de 5 V. No ensaio com
aquecimento, as medições foram realizadas novamente após a alteração da temperatura do
transistor, permitindo observar a variação do ponto de operação. Na etapa de amplificação,
o gerador foi ajustado para 1 kHz e sua amplitude foi regulada até que a tensão de pico no
coletor atingisse aproximadamente 1 V. As formas de onda foram observadas no
osciloscópio utilizando os acoplamentos AC e DC solicitados no manual. Os valores medidos
foram utilizados nos cálculos de IB, IC, β, gm, Av0 e Gv0.


Conclusão
A prática mostrou dois aspectos fundamentais do TBJ. Primeiro, o ganho β e a temperatura
afetam diretamente o ponto de operação, podendo causar grandes variações de corrente
quando o emissor está diretamente aterrado. A inserção de uma resistência de emissor cria
realimentação negativa e torna a polarização mais estável. Segundo, na operação de
pequenos sinais, o TBJ em emissor comum fornece ganho elevado de tensão e inversão de
fase. Os valores calculados e os resultados medidos apresentaram boa concordância,
confirmando o comportamento previsto pelo modelo de pequenos sinais.

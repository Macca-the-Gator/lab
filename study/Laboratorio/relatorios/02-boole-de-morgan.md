Título: ALGEBRA DE BOOLE E DE
MORGAN
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2010

Disciplina: Laboratório de Sistemas Digitais

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/09/2026​
​
__________________________________________________


Objetivos da Atividade
Aprender como simplificar expressões lógicas utilizando os postulados da Álgebra de Boole
e os teoremas de De Morgan, verificando as identidades por tabelas-verdade e relacionando
as expressões aos respectivos circuitos lógicos.​
​
__________________________________________________


Materiais e Ferramentas
Placa 1111A ou os CI's 7408, 7432 e 7404; fonte de 5 V; kit digital/protoboard; chaves
lógicas; LED; resistor limitador; cabos/jumpers e Manual de Sistemas Digitais.​
​
__________________________________________________


Procedimentos Realizados
Foram analisados os postulados da adição e da multiplicação da Álgebra de Boole. Em
seguida, foram montadas as tabelas-verdade dos dois teoremas de De Morgan. Depois,
foram simplificadas as expressões propostas na prática e analisados os circuitos dos itens 2
e 3, determinando suas equações, tabelas-verdade e formas simplificadas.​
​
__________________________________________________
Evidências (Desenhos e Cálculos)
Foram preenchidas as tabelas-verdade e desenvolvidos os cálculos algébricos solicitados
nas páginas correspondentes à PRÁTICA Nº 2 do manual.

Observação: os rótulos impressos no manual apresentam inconsistências em alguns
postulados. As tabelas abaixo registram os resultados obtidos pela tabela-verdade dos
próprios circuitos.
Postulados da Adição
         A                 A+0                  A+1                   A+A      A + A'
         0                  0                    1                     0         1
         1                  1                    1                     1         1
Identidades verificadas: A + 0 = A; A + 1 = 1; A + A = A; A + A' = 1.




                                     Figura 1 - Ligação: A + 0 = A.




                                     Figura 2 - Ligação: A + 1 = 1.
                                    Figura 3 - Ligação: A + A = A.




                                    Figura 4 - Ligação: A + A' = 1.

Postulados da Multiplicação
         A                 A·0                   A·1                  A·A   A · A'
         0                  0                     0                    0      0
         1                  0                     1                    1      0
Identidades verificadas: A·0 = 0; A·1 = A; A·A = A; A·A' = 0.




                                     Figura 5 - Ligação: A · 0 = 0.
                        Figura 6 - Ligação: A · 1 = A.




                        Figura 7 - Ligação: A · A = A.




                        Figura 8 - Ligação: A · A' = 0.

Teoremas de De Morgan
     A          B        (A·B)'               A' + B'     (A+B)'   A'·B'
     0          0          1                     1          1        1
     0          1          1                     1          0        0
     1          0          1                     1          0        0
        1                1                  0                   0              0        0
As colunas equivalentes confirmam: (A·B)' = A' + B' e (A+B)' = A'·B'.




                                  Figura 9 - De Morgan 1: (A·B)' = A' + B'.




                                  Figura 10 - De Morgan 2: (A + B)' = A'·B'.

Simplificação das Expressões
a) S = A'B' + A'B = A'(B' + B) = A'.
b) S = A'B' + A'B + AB' = A' + AB' = A' + B'.
c) S = AB' + AB + A'B = A + A'B = A + B.
d) S = A'B'C' + A'B'C + AB'C' + ABC' + A'BC' = C' + A'B'.
e) S = A'B'C' + A'B'C + A'BC + A'BC' + AB'C' + ABC' + ABC = A' + B + C'.
Item 2 - Circuito Correspondente à Equação Booleana
Equação proposta: S = A'B'C' + A'B'C + AB'C' + ABC' + A'BC'.
Simplificação: S = C' + A'B'.
Circuito simplificado: inverter C; inverter A e B e aplicar A' e B' a uma porta AND; por fim,
aplicar C' e A'B' a uma porta OR.
                   Figura 11 - Ligação correspondente ao circuito simplificado do item 2.

Item 3 - Equação, Tabela-Verdade e Simplificação




                       Figura 12 - Circuito apresentado no item 3 da PRÁTICA Nº 2.

Equação: S = [A'B' + (AB)']'.
Aplicando De Morgan: (AB)' = A' + B'. Assim, S = [A'B' + A' + B']' = (A' + B')' = A·B.
            Chave A                              Chave B                                LED (S)
               0                                    0                                     0
               0                                    1                                     0
               1                                    0                                     0
               1                                    1                                     1
Portanto, o circuito do item 3 é equivalente a uma porta AND.
                      Figura 13 - Ligação equivalente ao resultado simplificado do item 3.

__________________________________________________


Resultados Obtidos
As tabelas-verdade confirmaram as identidades fundamentais da Álgebra de Boole e os dois
teoremas de De Morgan. As expressões extensas foram reduzidas a formas equivalentes
mais simples, mostrando como a simplificação diminui a quantidade de portas necessárias.
No item 3, o circuito apresentado mostrou comportamento equivalente ao de uma porta
AND.​
​
__________________________________________________


Respostas das Questões
1. Postulados da adição: A + 0 = A; A + 1 = 1; A + A = A; A + A' = 1.​
​
2. Postulados da multiplicação: A·0 = 0; A·1 = A; A·A = A; A·A' = 0.​
​
3. De Morgan: (A·B)' = A' + B' e (A + B)' = A'·B'.​
​
4. Simplificações: a) S = A'; b) S = A' + B'; c) S = A + B; d) S = C' + A'B'; e) S = A' + B + C'.​
​
5. Item 2: S = C' + A'B'.​
​
6. Item 3: S = A·B.​
​
__________________________________________________
Dificuldades e Soluções
A principal dificuldade foi interpretar os termos complementados e aplicar corretamente as
identidades booleanas durante as simplificações. A solução foi organizar cada expressão em
etapas, fatorando termos comuns e conferindo os resultados pelas tabelas-verdade.​
​
__________________________________________________


Conclusão
A prática permitiu verificar os principais postulados da Álgebra de Boole e os teoremas de
De Morgan, além de demonstrar como expressões lógicas podem ser simplificadas sem
alterar o comportamento da saída. A análise das tabelas-verdade e dos circuitos mostrou a
relação direta entre expressão booleana, implementação com portas lógicas e simplificação
do circuito.​
​
__________________________________________________

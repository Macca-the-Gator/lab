                    Relatório de Aula Prática


Título: PRATICA Nº 5 – CIRCUITOS
ARITMÉTICOS
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2010

Disciplina: Laboratório de Sistemas Digitais

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/09/2026


Objetivos da Atividade
Projetar e analisar circuitos aritméticos somadores e subtratores, incluindo meio somador,
somador completo, meio-subtrator, somador completo construído a partir de meios
somadores e subtrator completo.


Materiais e Ferramentas
Manual de Sistemas Digitais; kit/placa de lógica digital; fonte de 5 V; chaves lógicas A, B e C;
LEDs e resistores; portas XOR, AND, OR e NOT; cabos e jumpers para as ligações.


Procedimentos Realizados
Primeiramente foi analisado o meio somador (Half-adder) apresentado no manual,
preenchendo sua tabela-verdade e identificando as equações das duas saídas. Em seguida,
foi analisado o somador completo (Full-adder), também com tabela-verdade e equações.
Depois, foram elaborados os projetos solicitados no manual para o meio-subtrator, o full-
adder a partir de dois half-adders e o subtrator completo. Para cada circuito, foram
organizadas as tabelas-verdade e analisados todos os estados possíveis de entrada.


Evidências (Desenhos e Cálculos)
A seguir são apresentadas as tabelas-verdade, equações e imagens das ligações. Nos dois
primeiros itens, os circuitos seguem diretamente os diagramas do manual. Nos itens de
                   Relatório de Aula Prática

projeto da página seguinte, os circuitos apresentados são soluções elaboradas para atender
às solicitações do próprio manual.

a), b) e c) Meio somador (Half-adder)

O circuito apresentado no manual utiliza XOR para a saída Led 1 e AND para a saída Led 2.




                     Figura 1 – Circuito de meio somador apresentado no manual.

       Chave A                  Chave B                       Led 1                   Led 2
          0                        0                            0                       0
          0                        1                            1                       0
          1                        0                            1                       0
          1                        1                            0                       1


Equações booleanas: Led 1 = A ⊕ B; Led 2 = A · B.




                    Figura 2 – Estados do Half-adder, com as duas saídas indicadas.

d) e e) Somador completo (Full-adder)
                   Relatório de Aula Prática

O segundo circuito do manual recebe três entradas A, B e C. A saída Led 1 representa a soma
e Led 2 representa o transporte (carry).




                      Figura 3 – Circuito de Full-adder apresentado no manual.

        A                 B                      C                   Led 1       Led 2
        0                 0                      0                     0           0
        0                 0                      1                     1           0
        0                 1                      0                     1           0
        0                 1                      1                     0           1
        1                 0                      0                     1           0
        1                 0                      1                     0           1
        1                 1                      0                     0           1
        1                 1                      1                     1           1


Equações booleanas: Led 1 = A ⊕ B ⊕ C; Led 2 = A·B + A·C + B·C.
                  Relatório de Aula Prática




                               Figura 4 – Estados do Full-adder.

3) Meio-subtrator de dois números binários de um bit

Projeto elaborado para atender ao item 3 do manual. Foram consideradas duas saídas:
Diferença e Empréstimo. A diferença é obtida por XOR e o empréstimo por A'·B.

          A                     B                      Diferença       Empréstimo
          0                     0                          0               0
          0                     1                          1               1
          1                     0                          1               0
          1                     1                          0               0


Equações: Diferença = A ⊕ B; Empréstimo = A' · B.
                  Relatório de Aula Prática

                    Figura 5 – Estados do meio-subtrator projetado para o item 3.

4) Full-adder a partir de circuitos Half-adder

Projeto elaborado para atender ao primeiro item 4 do manual. O primeiro Half-adder soma
A e B; o segundo soma o resultado com Cin. Os dois sinais de carry são combinados por uma
porta OR.

        A                 B                     Cin                  Soma           Cout
        0                 0                      0                     0             0
        0                 0                      1                     1             0
        0                 1                      0                     1             0
        0                 1                      1                     0             1
        1                 0                      0                     1             0
        1                 0                      1                     0             1
        1                 1                      0                     0             1
        1                 1                      1                     1             1


Equações: Soma = (A ⊕ B) ⊕ Cin; Cout = A·B + Cin·(A ⊕ B).
                   Relatório de Aula Prática




                 Figura 6 – Estados do Full-adder construído a partir de dois Half-adders.

4) Subtrator completo (segunda ocorrência do item 4 no manual)

Projeto elaborado para atender ao último item da prática. Foram consideradas as entradas
A, B e Bin (empréstimo de entrada), com as saídas Diferença e Bout (empréstimo de saída).

        A                    B                     Bin                Diferença              Bout
        0                    0                      0                     0                   0
        0                    0                      1                     1                   1
        0                    1                      0                     1                   1
        0                    1                      1                     0                   1
        1                    0                      0                     1                   0
        1                    0                      1                     0                   0
        1                    1                      0                     0                   0
        1                    1                      1                     1                   1


Equações: Diferença = A ⊕ B ⊕ Bin; Bout = A'·B + A'·Bin + B·Bin.
                   Relatório de Aula Prática




                         Figura 7 – Estados do subtrator completo projetado.



Resultados Obtidos
As tabelas-verdade confirmaram o funcionamento dos circuitos aritméticos analisados. No
Half-adder, Led 1 representa a soma e Led 2 o carry. No Full-adder, a soma considera as três
entradas e o carry é ativado quando pelo menos duas entradas estão em nível lógico 1. O
meio-subtrator forneceu a diferença e o empréstimo correspondentes às combinações de A
e B. O Full-adder montado a partir de dois Half-adders apresentou a mesma tabela-verdade
do somador completo. Por fim, o subtrator completo incorporou corretamente o
empréstimo de entrada Bin.
                   Relatório de Aula Prática

Respostas das Questões
b) Tabela-verdade do Half-adder: 00→00; 01→10; 10→10; 11→01, considerando a ordem
Led 1 / Led 2.

c) Led 1 = A ⊕ B; Led 2 = A·B.

d) Tabela-verdade do Full-adder preenchida para as oito combinações de A, B e C conforme
apresentada em Evidências.

e) Led 1 = A ⊕ B ⊕ C; Led 2 = A·B + A·C + B·C.

3) Meio-subtrator: Diferença = A ⊕ B e Empréstimo = A'·B.

4) Full-adder a partir de Half-adders: dois meios somadores em cascata e uma porta OR
para combinar os carries; Soma = (A ⊕ B) ⊕ Cin e Cout = A·B + Cin·(A ⊕ B).

4) Subtrator completo: Diferença = A ⊕ B ⊕ Bin; Bout = A'·B + A'·Bin + B·Bin.


Dificuldades e Soluções
A principal dificuldade foi organizar circuitos com várias entradas e saídas, principalmente
o Full-adder e o subtrator completo. A solução foi separar cada circuito em blocos menores:
primeiro calcular a soma ou diferença com XOR, depois calcular carry ou empréstimo com
AND/NOT e, por fim, combinar os termos com OR. As tabelas-verdade foram usadas para
conferir cada projeto.


Conclusão
A prática permitiu relacionar operações aritméticas binárias com portas lógicas. O Half-
adder e o Full-adder mostraram como soma e carry são obtidos a partir de XOR, AND e OR.
Os projetos de meio-subtrator e subtrator completo aplicaram a mesma lógica à subtração,
utilizando também inversão para determinar os empréstimos. A montagem de um Full-
adder a partir de dois Half-adders mostrou ainda como blocos combinacionais simples
podem ser reutilizados para formar circuitos mais completos.

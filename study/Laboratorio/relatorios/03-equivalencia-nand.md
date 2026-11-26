Título: PRATICA Nº 3 – EQUIVALÊNCIA DE
BLOCOS LÓGICOS
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2010

Disciplina: Laboratório de Sistemas Digitais

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/09/2026


Objetivos da Atividade
Estudar a equivalência dos blocos lógicos AND, OR, NAND e NOR, demonstrando como
portas NAND podem ser utilizadas para implementar um circuito inversor, um circuito AND
e um circuito OR.


Materiais e Ferramentas
Placa 1111A ou equivalente; CI 7400 (NAND); fonte de 5 V; LED; chaves lógicas para as
entradas A e B; jumpers e cabos de ligação.


Procedimentos Realizados
Inicialmente foi analisada a prática nº 3 do manual. Em seguida, foram estudadas as três
montagens propostas: (a) circuito inversor a partir de portas NAND, (b) circuito AND a
partir de portas NAND e (c) circuito OR a partir de portas NAND. Para cada montagem, foi
considerada a expressão booleana equivalente, preenchida a tabela-verdade e analisado o
comportamento do LED para todos os estados de entrada.


Evidências (Desenhos e Cálculos)
A seguir são apresentadas as tabelas-verdade preenchidas e as ligações correspondentes,
inseridas no ponto em que cada circuito é analisado.

a) Circuito Inversor: a partir de Portas NAND
Equivalência booleana: LED = (A·A)' = A'. Portanto, a saída é o complemento da entrada A.

                     Chave A                                                LED
                        0                                                    1
                        1                                                    0




               Figura 1 – Circuito inversor implementado com porta NAND, para A=0 e A=1.

b) Circuito AND: a partir de Portas NAND

Equivalência booleana: LED = [(A·B)' · (A·B)']' = A·B. A primeira NAND produz a negação de
A·B e a segunda NAND, com entradas unidas, atua como inversor.

           Chave A                            Chave B                                LED
              0                                  0                                    0
              0                                  1                                    0
              1                                  0                                    0
              1                                  1                                    1
                                                                                 ​




     Figura 2 – Circuito AND construído apenas com portas NAND, para as quatro combinações de entrada.

c) Circuito OR: a partir de Portas NAND

Equivalência booleana: LED = (A'·B')' = A + B. Duas NAND com entradas unidas geram A' e B',
e uma terceira NAND aplica o teorema de De Morgan para obter a função OR.
Chave A   Chave B       LED
   0         0           0
   0         1           1
   1         0           1
   1         1           1




                    ​
   Figura 3 – Circuito OR implementado somente com portas NAND, para as quatro combinações de entrada.



Resultados Obtidos
Os resultados mostraram que é possível implementar funções lógicas diferentes utilizando
apenas portas NAND. No circuito inversor, o LED apresentou o complemento da entrada A.
No circuito AND, a saída permaneceu em nível 1 apenas quando A=1 e B=1. No circuito OR, o
LED permaneceu apagado apenas quando A=0 e B=0. As tabelas-verdade preenchidas
confirmam a equivalência funcional entre as montagens propostas e os blocos lógicos
originais.


Respostas das Questões
Circuito inversor com NAND: tabela-verdade preenchida com LED = A'.

Circuito AND com NAND: tabela-verdade preenchida com LED = A·B.

Circuito OR com NAND: tabela-verdade preenchida com LED = A + B.

Conclusão algébrica das equivalências: NOT por NAND ⇒ (A·A)' = A'; AND por NAND ⇒
[(A·B)'·(A·B)']' = A·B; OR por NAND ⇒ (A'·B')' = A + B.


Dificuldades e Soluções
A principal dificuldade foi representar de maneira organizada as ligações equivalentes
usando apenas portas NAND, especialmente no circuito OR, que exige a inversão prévia das
entradas. Isso foi resolvido decompondo a montagem em etapas: primeiro identificar os
inversores, depois a porta NAND final e, por fim, conferir a função obtida pela
tabela-verdade e pela expressão booleana.


Conclusão
A prática evidenciou que a porta NAND é universal, pois pode ser utilizada para
implementar outras funções lógicas básicas. Com as montagens analisadas, verificou-se a
equivalência entre os blocos NOT, AND e OR obtidos a partir de redes de portas NAND. Dessa
forma, a atividade reforçou tanto o entendimento algébrico das expressões booleanas
quanto a interpretação prática das ligações e das tabelas-verdade.

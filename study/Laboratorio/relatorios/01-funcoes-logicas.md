Título: FUNCOES LOGICAS BASICAS
Identificação
Nome: Patrick Lorran Araujo


Turma: GNP2010

Disciplina: Laboratório de Sistemas Digitais

Professor: Ruy Barbosa Figueiredo Junior

Data: 30/09/2026​
​
__________________________________________________


Objetivos da Atividade
Estudar as portas lógicas AND, OR, NOT, NAND e NOR e completar as montagens e
tabelas-verdade propostas no manual. Também foram analisados os circuitos XOR e XNOR
dos itens 6 e 7, observando o estado do LED para cada combinação das entradas A e B.​
​
__________________________________________________


Materiais e Ferramentas
• Kit/placa digital e fonte de 5 V.​
• CI 7408 (AND), CI 7432 (OR), CI 7404 (NOT), CI 7400 (NAND), CI 7402 (NOR) e CI 7486
(XOR).​
• Chaves lógicas A e B, LED, resistor limitador e cabos de ligação.​
​
__________________________________________________


Procedimentos Realizados
Foram consideradas exclusivamente as montagens da Prática nº 1, apresentadas nas páginas
5 a 8 do manual. Para cada porta/circuito, foram avaliadas todas as combinações possíveis
das chaves de entrada e preenchida a respectiva tabela-verdade. No item 3 foram analisados
os dois circuitos com o CI 7404: uma porta NOT e duas portas NOT em série. Nos itens 6 e 7
foram analisados, respectivamente, XOR e XNOR (XOR seguido de inversão). As imagens
abaixo representam individualmente cada estado lógico.
Evidências (Desenhos e Cálculos)
Tabelas-verdade e estados lógicos de cada circuito:​
​
__________________________________________________


Prática nº 1 - Funções Lógicas Básicas

1. Porta AND - CI 7408
            Chave A                        Chave B                   LED
               0                              0                       0
               0                              1                       0
               1                              0                       0
               1                              1                       1




                A=0, B=0 → LED=0                       A=0, B=1 → LED=0




                A=1, B=0 → LED=0                       A=1, B=1 → LED=1
2. Porta OR - CI 7432
          Chave A                Chave B                 LED
             0                      0                     0
             0                      1                     1
             1                      0                     1
             1                      1                     1




              A=0, B=0 → LED=0             A=0, B=1 → LED=1




              A=1, B=0 → LED=1             A=1, B=1 → LED=1
3. Porta NOT - CI 7404 (circuito 1)
                    Chave A                                         LED
                       0                                             1
                       1                                             0




                  A=0 → LED=1                                    A=1 → LED=0



3. Porta NOT - duas inversões (circuito 2)
O segundo circuito do manual utiliza duas portas NOT em série; por isso, a saída final é igual
à entrada.
                    Chave A                                         LED
                       0                                             0
                       1                                             1




                  A=0 → LED=0                                    A=1 → LED=1
4. Porta NAND - CI 7400
          Chave A                Chave B                 LED
             0                      0                     1
             0                      1                     1
             1                      0                     1
             1                      1                     0




              A=0, B=0 → LED=1             A=0, B=1 → LED=1




              A=1, B=0 → LED=1             A=1, B=1 → LED=0
5. Porta NOR - CI 7402
          Chave A                Chave B                 LED
             0                      0                     1
             0                      1                     0
             1                      0                     0
             1                      1                     0




              A=0, B=0 → LED=1             A=0, B=1 → LED=0




              A=1, B=0 → LED=0             A=1, B=1 → LED=0
6. Porta XOR - CI 7486
          Chave A                Chave B                 LED
             0                      0                     0
             0                      1                     1
             1                      0                     1
             1                      1                     0




              A=0, B=0 → LED=0             A=0, B=1 → LED=1




              A=1, B=0 → LED=1             A=1, B=1 → LED=0
7. Circuito XNOR - CI 7486 + CI 7404
Conforme o desenho do manual, o XNOR foi representado como uma porta XOR seguida de
uma porta NOT.
             Chave A                             Chave B                 LED
                0                                   0                     1
                0                                   1                     0
                1                                   0                     0
                1                                   1                     1




                  A=0, B=0 → LED=1                         A=0, B=1 → LED=0




                  A=1, B=0 → LED=0                         A=1, B=1 → LED=1




Resultados Obtidos
Os resultados coincidem com as tabelas-verdade esperadas. A AND fornece 1 somente para
A=B=1; a OR fornece 1 quando pelo menos uma entrada é 1; a NOT inverte a entrada; duas
NOT em série reproduzem o valor original; a NAND e a NOR são as inversões de AND e OR; a
XOR fornece 1 quando as entradas são diferentes; e a XNOR fornece 1 quando as entradas
são iguais.

__________________________________________________
Respostas das Questões
1. AND: 00→0, 01→0, 10→0, 11→1.​
2. OR: 00→0, 01→1, 10→1, 11→1.​
3. NOT - circuito 1: 0→1 e 1→0. Circuito 2: 0→0 e 1→1.​
4. NAND: 00→1, 01→1, 10→1, 11→0.​
5. NOR: 00→1, 01→0, 10→0, 11→0.​
6. XOR: 00→0, 01→1, 10→1, 11→0.​
7. XNOR: 00→1, 01→0, 10→0, 11→1.

__________________________________________________


Dificuldades e Soluções
A principal dificuldade foi organizar e verificar todos os estados possíveis das entradas. A
solução foi conferir sistematicamente cada combinação por meio das tabelas-verdade e
comparar os resultados obtidos com o comportamento esperado de cada porta lógica.

__________________________________________________


Conclusão
A prática permitiu verificar o comportamento das principais portas lógicas e compreender
como diferentes combinações de entrada determinam a saída. A comparação entre
AND/NAND, OR/NOR e XOR/XNOR também evidenciou o efeito da inversão lógica e
confirmou as respectivas tabelas-verdade.

__________________________________________________

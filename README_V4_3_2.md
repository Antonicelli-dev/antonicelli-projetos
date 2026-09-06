# Antonicelli V4.3.2

Ajuste incremental sobre a V4.3.1.

- Corrige o botão **Crescente / Decrescente** da lista de trabalhos. O problema era um conflito entre o nome da variável de estado e o elemento do botão.
- Adiciona filtro por **Cliente** na lista de Trabalhos em Andamento.
- O filtro oferece **Todos os clientes**, cada cliente disponível e **Sem cliente** quando aplicável.
- Ordenação e filtro são preservados durante a sessão pelo `sessionStorage`.
- Mantém o padrão de ordenação por data de criação, mais recentes primeiro.
- Nenhuma alteração de schema ou banco de dados.

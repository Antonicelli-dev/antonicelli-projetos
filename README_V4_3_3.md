# Antonicelli — V4.3.3

Atualização incremental da V4.3.2, pronta para GitHub/Render.

## Markdown

- As **Anotações das tarefas** agora são editadas em Markdown.
- As **Informações adicionais do trabalho** agora são editadas em Markdown.
- Os dois editores possuem barra de ferramentas para **negrito**, *itálico*, título, lista e link.
- Há pré-visualização renderizada abaixo do editor.
- Links `http://`, `https://` e `mailto:` são clicáveis e abrem com proteção `noopener noreferrer`.
- HTML digitado pelo usuário não é executado; o conteúdo é escapado e a saída ainda passa pelo DOMPurify.
- O tooltip das anotações das tarefas renderiza o Markdown em formato compacto.

## Compatibilidade

O banco não precisa de migração. As anotações de tarefas já eram armazenadas como texto. Para Informações adicionais, a V4.3 já mantinha uma versão em texto simples no campo `additional_info`; a V4.3.3 passa a tratar esse campo como Markdown. Textos antigos continuam legíveis normalmente.

## Sintaxe suportada

```md
# Título
## Subtítulo

**negrito** e *itálico*

- item 1
- item 2

1. item numerado
2. outro item

[Link](https://exemplo.com)
```

## Deploy

Substitua os arquivos do repositório pelos desta versão e faça o redeploy normal no Render. O `.env` e os segredos continuam fora do pacote.

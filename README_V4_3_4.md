# Antonicelli V4.3.4

## Editor visual único

- Anotações das tarefas e Informações adicionais agora usam um editor WYSIWYG único.
- A formatação aparece diretamente durante a edição, sem área separada de Markdown/preview.
- Barra: negrito, itálico, título, lista e link.
- Links aceitos: http, https e mailto; conteúdo é sanitizado no navegador e novamente no servidor.
- Conteúdo Markdown/texto legado continua sendo convertido para visualização ao abrir o editor.
- Informações adicionais usam a coluna `additional_info_html` já existente; nenhuma migração de banco nova é necessária.
- Notas novas são armazenadas como HTML sanitizado no campo de notas existente.

# Instalação no novo computador

1. Instale o Node.js.
2. Extraia esta pasta.
3. Abra PowerShell dentro dela.
4. Execute: npm install
5. Copie .env.example para um arquivo chamado .env
6. Use a MESMA DATABASE_URL do Supabase usada no outro computador, se quiser acessar os mesmos dados.
7. Execute: npm start
8. Abra: http://localhost:3000

IMPORTANTE: public/index.html já está incluído nesta versão.

Correção V2.2:
- botão Criar evento refeito com addEventListener;
- envio usa IDs explícitos, sem variáveis globais do navegador;
- erros da API aparecem dentro da janela;
- o botão mostra "Criando..." durante o envio.

# Caixa — controle de empréstimos

Site simples para acompanhar o dinheiro em mãos, lançar empréstimos e ver quanto cada um rende. A cor muda conforme o vencimento se aproxima.

## Como rodar

Na pasta do projeto:

```bash
npm run install:all
npm run dev
```

Abra http://localhost:5173

O servidor fica em http://localhost:4000. Se não houver um MongoDB na máquina, o próprio projeto sobe um banco e guarda os dados em `data/mongo`. Na primeira vez o binário do MongoDB é baixado.

Para usar um MongoDB que você já tenha, ou para testar o login, crie um arquivo `.env` na raiz:

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/controle-emprestimos
AUTH_EMAIL=colega@email.com
AUTH_PASSWORD=senha-que-ele-mandou
SESSION_SECRET=uma-frase-longa-e-aleatoria
```

Sem `AUTH_EMAIL` e `AUTH_PASSWORD`, o painel local abre sem login. No Render essas duas variáveis são obrigatórias.

## Publicar no Render

1. Suba o projeto no GitHub.
2. Crie um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). Em Network Access, libere `0.0.0.0/0`. Copie a connection string (`mongodb+srv://...`).
3. No Render, crie um **Web Service** apontando para o repositório. Se aparecer o `render.yaml`, aceite. Senão use:
   - **Build command:** `npm run install:all && npm run build`
   - **Start command:** `npm start`
4. Em **Environment**, coloque só isto (não grave senha no código):

| Variável | O que colocar |
|---|---|
| `MONGODB_URI` | URI do Atlas |
| `AUTH_EMAIL` | e-mail do seu colega |
| `AUTH_PASSWORD` | senha que ele mandou |
| `SESSION_SECRET` | qualquer frase longa e aleatória |
| `NODE_ENV` | `production` |

5. Depois do deploy, mande para ele o endereço `https://....onrender.com`. Ele entra com o e-mail e a senha. Mais ninguém tem conta.

## O que o painel mostra

- **Valor total**: caixa mais o que ainda vai entrar dos empréstimos em aberto.
- **Em mãos**: dinheiro disponível agora.
- **Na rua**: soma emprestada que ainda não voltou.
- **Lucro previsto**: juros dos empréstimos em aberto.
- **Por empréstimo**: quanto vai ganhar e quanto vai receber.

Ao lançar um empréstimo, o valor sai do caixa. Ao marcar como recebido, voltam o valor emprestado e os juros. Dá para desmarcar essa saída se o lançamento for só um registro antigo.

## Juros

- **Ao mês**: valor × taxa × meses. Cada mês tem 30 dias, e o mês que passar disso conta inteiro.
- **Fixo**: valor × taxa, uma vez só.

A taxa dos Ajustes vale para o próximo empréstimo. Os já lançados ficam com a taxa daquele dia.

## Cores

Por padrão:

- **Verde**: falta mais de 7 dias.
- **Amarelo**: falta de 3 a 7 dias.
- **Vermelho**: vence em até 2 dias, hoje, ou já atrasou.

Os prazos se ajustam em Ajustes.

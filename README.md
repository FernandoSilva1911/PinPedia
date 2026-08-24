# PinPedia

Plataforma web colaborativa para registros históricos geolocalizados.

Usuários cadastram eventos históricos como marcadores (PINs) em um mapa
interativo, cada um com data, coordenadas e um artigo autoral. O acervo pode ser
navegado pelo mapa e filtrado por período, e cada autor tem uma página pública
com apenas os seus registros.

Trabalho Final de Curso em Engenharia de Software na Universidade de Rio Verde
(UniRV). Autor: Fernando Silva Cruvinel. Orientador: Prof. Esp. Julio César
Gomes Rodrigues.

No ar em <https://pinpedia.vercel.app>

## Tecnologias

| Camada | Escolha |
|---|---|
| Back-end | Node.js com Express, em MVC simplificado |
| Banco | PostgreSQL (Supabase) |
| Autenticação | JWT e bcryptjs |
| Front-end | HTML5, CSS3 e JavaScript puro |
| Mapa | Leaflet.js com OpenStreetMap |
| Hospedagem | Vercel, como função serverless |

Todas as ferramentas são de código aberto e sem custo de licença.

## Como rodar

Requisitos: Node.js 18 ou superior e um banco PostgreSQL.

```bash
npm install
```

Crie o arquivo `.env` a partir do `.env.example` e preencha `DATABASE_URL` e
`JWT_SECRET`. Aplique o `schema.sql` no banco. Depois:

```bash
npm start
```

A aplicação sobe em <http://localhost:3000>. A rota `/teste-db` confirma se a
conexão com o banco está funcionando.

## Estrutura

```
public/index.html   interface (mapa, editor, telas de login e cadastro)
routes/usuarios.js  cadastro e autenticação
routes/pins.js      operações sobre os registros históricos
middleware/auth.js  validação do token JWT
db.js               conexão com o PostgreSQL
server.js           montagem do Express e das rotas
api/index.js        ponto de entrada na Vercel
schema.sql          criação das tabelas
```

## Funcionalidades

Cadastro e login. Mapa interativo com navegação e zoom. Criação, edição e
exclusão de PINs restritas ao autor. Artigos com imagens, áudios e vídeos
embutidos por marcação no texto. Filtro por intervalo de datas. Página pública
por autor em `/<id>`, em modo somente leitura.

## Documentação

O arquivo `DEPLOY.md` descreve como o ambiente de produção foi montado e como
republicar. O `NOTAS-DO-PROJETO.md` reúne as decisões técnicas, o estado atual e
as pendências. O documento de requisitos está em
`FernandoSilva_relatorio_DERS2.docx`.

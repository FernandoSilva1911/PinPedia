# PinPedia

Plataforma web consultiva para registros históricos geolocalizados.

Cada registro é um marcador (PIN) no mapa, com título, data, coordenadas e um
artigo autoral. A página inicial reúne os registros de todos os autores, cada
autor tem um mapa próprio em que só ele cria e edita, e a coleção
[/brasil](https://pinpedia.vercel.app/brasil) apresenta a história do Brasil a
partir de 22/04/1500.

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
| Mapa | Leaflet.js 1.9.4 com OpenStreetMap |
| Hospedagem | Vercel, como função serverless |
| Testes | node:test, supertest e pg-mem |

## Como rodar

Requisitos: Node.js 18 ou superior e um banco PostgreSQL.

```bash
npm install
```

Crie o `.env` a partir do `.env.example`, preencha `DATABASE_URL` e
`JWT_SECRET` e aplique o `schema.sql` no banco. Depois:

```bash
npm start
```

A aplicação sobe em <http://localhost:3000>. A rota `/teste-db` confirma a
conexão com o banco.

Para rodar os testes da API (usam um banco em memória, sem precisar do `.env`):

```bash
npm test
```

## Estrutura

```
public/index.html   interface (mapa, editor, login e cadastro)
routes/usuarios.js  cadastro e login
routes/pins.js      registros históricos e coleções
middleware/auth.js  validação do token JWT
validacao.js        validação dos dados recebidos pela API
colecoes.js         coleções temáticas, como /brasil
slug.js             endereço público de cada usuário
db.js               conexão com o PostgreSQL
server.js           montagem do Express
api/index.js        entrada na Vercel
schema.sql          criação das tabelas
test/               testes automatizados da API
```

## Rotas da API

| Método | Rota | Acesso | Requisito |
|---|---|---|---|
| POST | `/usuarios` | público | RF001 |
| POST | `/login` | público | RF001 |
| GET | `/pins` | público | RF002, RF004 |
| GET | `/pins/:id` | público | RF003 |
| POST | `/pins` | autenticado | RF005 |
| PUT | `/pins/:id` | autor do pin | RF006 |
| DELETE | `/pins/:id` | autor do pin | RF007 |
| GET | `/usuarios/:endereco/pins` | público | RF008 |
| GET | `/colecoes/:slug/pins` | público | RF009 |
| POST | `/colecoes/:slug/upload` | dono da coleção | RF009 |

As rotas de consulta aceitam `dataInicial` e `dataFinal` no formato
`AAAA-MM-DD`.

## Documentação

`DEPLOY.md` descreve o ambiente de produção e como publicar. `NOTAS-DO-PROJETO.md`
reúne as decisões técnicas e as pendências.

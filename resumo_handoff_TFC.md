# Resumo do Projeto — TFC de Fernando (PinPedia)

Cole este texto no início da nova conversa para retomar o contexto.

---

## O que é o projeto

TFC em Engenharia de Software na UniRV. Nome do site: **PinPedia**. Plataforma web colaborativa onde usuários cadastram eventos históricos como PINs num mapa interativo (Leaflet.js + OpenStreetMap), com filtro por data e artigos com texto + mídia embutida. Baseado num DERS completo (RF001–RF009, RNF01–RNF05), já entregue e aprovado como documento.

## Stack e arquitetura

- **Backend:** Node.js + Express, arquitetura MVC simplificada
- **Banco:** PostgreSQL no **Supabase** (era Neon). Em produção a conexão precisa ser a do **Transaction pooler (porta 6543)**, não a direta — serverless abre muitas conexões e a direta estoura o limite.
- **Hospedagem:** **Vercel**, como função serverless. Por isso `server.js` exporta o `app` e só chama `listen()` quando roda direto (`npm start`); quem serve em produção é `api/index.js` + `vercel.json`.
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs`, sessão persistida no **localStorage** do navegador (sobrevive a reload)
- **Frontend:** HTML5 + CSS3 + JS puro + Leaflet.js, `index.html`, agora **servido pelo próprio Express** a partir de `backend/public/index.html` — não é mais aberto direto no navegador
- **CORS:** habilitado no backend

## Estrutura de pastas atual

A raiz do projeto é a pasta `akuma/` — ela **é** o backend (não existe mais uma
pasta `Aplicação/backend/` por fora).

```
akuma/
  node_modules/
  public/
    index.html      -> frontend (servido como estático pelo Express)
  routes/
    usuarios.js     -> POST /usuarios (cadastro), POST /login
    pins.js         -> GET /pins, GET /pins/:id, GET /usuarios/:id/pins,
                       POST /pins, PUT /pins/:id, DELETE /pins/:id
  middleware/
    auth.js         -> exigirAutenticacao (valida JWT no header Authorization)
  db.js             -> conexão com Postgres (usa DATABASE_URL do Neon)
  server.js         -> monta Express, cors, arquivos estáticos, rota /:id (RF009), rotas.
                       Exporta o app; só chama listen() se rodado direto.
  api/
    index.js        -> ponto de entrada da Vercel (entrega o app como função serverless)
  vercel.json       -> manda tudo para api/index.js e inclui public/ no pacote
  DEPLOY.md         -> passo a passo de Supabase + Vercel
  schema.sql        -> CREATE TABLE usuarios, pins + índices
  package.json
  .gitignore
  .env.example      -> modelo das variáveis; copiar para ".env" e preencher
  .env              -> DATABASE_URL, JWT_SECRET, PORT=3000 (NÃO compartilhar/commitar)
```

**Como rodar:** `npm install`, criar o `.env` a partir do `.env.example` com os
dados reais do Neon, e `npm start`. Abrir http://localhost:3000.

## Decisões de design tomadas (não reabrir)

1. **URL pública do usuário (RF009)** = `PinPedia/<id>` (ex: `PinPedia/5`), caminho real via rota Express `app.get(/^\/\d+$/, ...)` que devolve `index.html` — o frontend lê `window.location.pathname` pra saber que está em modo leitura. Não usa mais query string.
2. **Mídia no artigo** = marcação embutida no texto (`[img]url[/img]`, `[video]url[/video]`, `[audio]url[/audio]`), parseada via regex no frontend. Sem colunas de mídia no banco.
3. **Sessão JWT** persistida em `localStorage` (chaves `token` e `usuarioAtual`). Expira em 7 dias; se o backend devolver 401, a sessão é limpa automaticamente e o usuário é avisado.
4. **Checagem de propriedade** em `PUT /pins/:id` e `DELETE /pins/:id`: só o autor (`autor_id === usuário do token`) pode editar/excluir.
5. **Mensagens de erro/sucesso (RNF04):** sistema de toast não-bloqueante (canto superior direito, ~3,5s), substituiu todos os `alert()`. Toda ação de escrita (login, logout, criar/editar/excluir pin, cadastro) tem feedback de sucesso. A confirmação de exclusão usa um pop-up próprio (`pedirConfirmacao()`), não o `confirm()` nativo do navegador.
6. **Tratamento de falha no mapa (RF003, alt. A1):** se o Leaflet não carrega ou o `L.map()` falha, tela de erro cheia com botão "Tentar novamente". Se só alguns tiles falham (internet instável), banner amarelo temporário, sem travar o uso.
7. **Conteúdo de usuário nunca vai direto pro `innerHTML`.** Título, texto, nome de autor e URL de mídia passam por `escaparHtml()` / `urlSegura()`. Ao adicionar qualquer campo novo que apareça na tela, aplicar o mesmo — senão a falha de XSS volta.
8. **Datas trafegam sempre como texto `"AAAA-MM-DD"`**, nunca como objeto `Date`. Quem garante isso é o `setTypeParser` do `db.js`. Não remover.
9. **Feature futura, só depois da revisão da banca (não implementar agora):** rota especial `PinPedia/Brasil`, separada das rotas por ID. O filtro de data dessa página não pode ir mais pra trás do que a data do descobrimento do Brasil — restrição exclusiva dessa página.

## Status atual — tudo abaixo testado e funcionando

- [x] RF001–RF008 (cadastro, login, mapa, ver artigo, criar/editar/excluir pin, filtro de data)
- [x] RF009 — visualização de terceiros via `PinPedia/<id>`, somente leitura, sem menu de criar/editar
- [x] Persistência de login entre reloads (localStorage)
- [x] Tratamento de erro de carregamento do mapa (RF003 alt. A1)
- [x] RNF04 — revisão de mensagens de erro/sucesso (sistema de toast)
- [x] RF007 — botão "Editar" dentro do artigo aberto, visível só para o autor (era só via botão direito)
- [x] RF008 — pop-up de confirmação próprio, com a mensagem e os botões do Quadro 18
- [x] RF009 — filtro de data e botão de login continuam na tela em modo leitura (Quadro 19), e o filtro funciona nessa página
- [x] **Datas** — o `pg` devolvia coluna `DATE` como objeto `Date`, e o `res.json()` virava texto ISO completo. A data aparecia como `22T03:06:28.000Z/04/1500` e o campo de data do editor ficava **vazio** (quebrando o RF007 na prática). Resolvido com `types.setTypeParser(1082, ...)` no `db.js`: a API volta a devolver `"AAAA-MM-DD"`.
- [x] **XSS armazenado** — título, texto do artigo, URL de mídia e nome do autor iam direto pro `innerHTML`. Qualquer cadastrado conseguia salvar `<img src=x onerror=...>` e executar código no navegador de todos os leitores (inclusive ler o token do `localStorage`). Resolvido com `escaparHtml()` + `urlSegura()` (só aceita `http`/`https`) em `public/index.html`.
- [x] **Autoria visível** — o artigo agora mostra "registrado por <nome>" (`JOIN` com `usuarios` no `GET /pins/:id`). Antes o leitor não tinha como saber de quem era a narrativa, o que contradizia a própria justificativa do projeto.
- [x] **Atalho "Meu mapa"** — link na barra de cima, só para usuário logado, apontando para o próprio `/<id>`. Antes só se chegava no RF009 digitando o número na URL.
- [x] **`JWT_SECRET` conferido na subida** — sem ele o servidor parava de vez em quando com erro 500 obscuro só no login. Agora, rodando local, o processo para na hora com instrução do que fazer; em produção o erro fica no log sem derrubar o mapa.
- [x] **`/teste-db` não vaza mais detalhe do erro** — a rota é pública e a mensagem do driver traz host e usuário do banco. O detalhe agora só vai para o log do servidor.
- [x] **Mobile** — faltava a tag `<meta name="viewport">`, e criar PIN só existia via clique com botão direito, que não existe em tela de toque (o RF006 era **impossível** no celular). Agora tem viewport, layout que não estoura em 375px e **toque longo (~600ms)** no mapa como equivalente do botão direito, com o mesmo controle de autoria. Arrastar o dedo cancela o toque longo.

## Divergências entre o código e o DERS ainda em aberto

Levantadas numa conferência requisito a requisito. Cada uma precisa de uma
decisão: **ou muda o código, ou corrige o documento.**

1. **RF003 passo 8 + RF004 (Quadro 14)** — o DERS diz que clicar num PIN abre a página
   do artigo **em uma nova aba**, e que imagens/áudios/vídeos aparecem como **links
   clicáveis separados**. O código abre um overlay na mesma aba e embute a mídia no
   texto (`[img]url[/img]`). Isso foi decisão de projeto (item 2 acima); o caminho
   mais barato é **atualizar o texto e o Quadro 14 do DERS**, não mexer no código.
2. **RF005 (Quadro 15)** — o DERS marca "Data Inicial" e "Data Final" como
   obrigatórias, com padrão "Data Atual". No código elas são opcionais e começam em
   branco — o que é o comportamento certo (com o padrão do documento, nenhum registro
   histórico apareceria ao abrir o site). Corrigir o quadro para "Não" obrigatório.
3. **RF001 (Quadro 10)** — o quadro lista só E-mail/Senha/Confirmar Senha, mas o
   sistema também pede **Nome** (usado para identificar o autor no RF009). Falta a
   linha "Nome" no quadro.
4. **RF006 (Quadro 16)** — erro de digitação no documento: a linha "Longitude" está
   escrita como "Latitude", aparecendo duas vezes.

## O que falta

1. **RNF02** — testar em outros navegadores (Chrome, Firefox, Edge) e, se possível, mobile. É teste manual, não precisa de código. O toque longo foi validado em emulação de celular, mas vale confirmar num aparelho real.
2. **Deploy/hospedagem** — mudou de Neon+Render para **Supabase + Vercel**. O código já está adaptado (ver abaixo); o passo a passo com os cliques que exigem login está em **`DEPLOY.md`**. Falta só executar.
3. **Pós-banca (não fazer agora):** implementar a rota `PinPedia/Brasil` com a restrição de data do descobrimento.

### Melhorias sugeridas, ainda não feitas

- **Testes automatizados.** A seção 4.1 do DERS promete verificação e validação, mas não existe nenhum teste no projeto. Foi deixado de fora de propósito: é a maior quantidade de código novo para explicar na banca, e o tempo rendia mais garantindo o deploy. Se sobrar tempo, é o próximo da fila.
- **Estado vazio e indicador de carregamento** ("nenhum registro nesse período").
- **README no repositório.**

### Perguntas prováveis da banca — ter resposta pronta

- **"Dá para registrar um evento antes de Cristo?"** Não. O `<input type="date">` do HTML não aceita data AC, então a plataforma hoje cobre da era cristã em diante. É limitação conhecida de escopo, não esquecimento.
- **"Como vocês impedem que um usuário injete código no artigo de outro?"** Todo conteúdo escrito por usuário passa por `escaparHtml()` antes de ir para a tela, e URL de mídia só é aceita se começar com `http`/`https` (`urlSegura()`).
- **"Por que Vercel e não um servidor tradicional?"** Custo zero, deploy automático a cada push e, ao contrário do plano free do Render, não desliga por inatividade. O custo é que a aplicação roda como função serverless — daí o `api/index.js` e o uso do pooler do banco.

## Coisas que a IA da próxima conversa deve saber sobre como Fernando trabalha

- Prefere respostas diretas, sem gastar tempo com perguntas evitáveis
- Prefere receber arquivos completos prontos pra usar em vez de trechos pra editar manualmente
- É iniciante em backend/banco de dados, mas já superou a curva inicial (setup, CORS, JWT, deploy local, static serving); ainda é bom confirmar passo a passo em coisas novas (ex: primeiro deploy em produção)
- Está seguindo o cronograma do TFC2 (agosto–novembro de 2026), com prazos apertados

## Arquivos para levar para a nova conversa

`server.js`, `db.js`, `schema.sql`, `routes/usuarios.js`, `routes/pins.js`, `middleware/auth.js`, `public/index.html`. O `.env` **não** deve ser compartilhado.

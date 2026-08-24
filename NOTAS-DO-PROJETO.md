# Notas do projeto

Registro das decisões técnicas, do estado atual e das pendências do PinPedia.
Complementa o DERS, que é o documento formal de requisitos.

## O que é o projeto

Plataforma web colaborativa em que usuários cadastram eventos históricos como
PINs num mapa interativo (Leaflet.js com OpenStreetMap), com filtro por data e
artigos de texto com mídia embutida. Baseado no DERS (RF001 a RF009, RNF01 a
RNF05), já entregue e aprovado como documento.

## Arquitetura

**Back-end:** Node.js com Express, em MVC simplificado.

**Banco:** PostgreSQL no Supabase. Em produção a conexão precisa ser a do
Transaction pooler, na porta 6543, e não a direta. Ambiente serverless abre
muitas conexões e a direta estoura o limite.

**Hospedagem:** Vercel, como função serverless. Por isso `server.js` exporta o
`app` e só chama `listen()` quando roda direto, no `npm start`. Quem serve em
produção é `api/index.js` junto com o `vercel.json`.

**Autenticação:** JWT com `jsonwebtoken` e `bcryptjs`. A sessão fica no
`localStorage` do navegador, então sobrevive a recarregar a página.

**Front-end:** HTML5, CSS3 e JavaScript puro com Leaflet.js. O `index.html` é
servido pelo próprio Express, a partir de `public/`, e não é mais aberto direto
no navegador.

**CORS:** habilitado no back-end.

## Estrutura de pastas

```
public/
  index.html      frontend, servido como estático pelo Express
routes/
  usuarios.js     POST /usuarios (cadastro), POST /login
  pins.js         GET /pins, GET /pins/:id, GET /usuarios/:id/pins,
                  POST /pins, PUT /pins/:id, DELETE /pins/:id
middleware/
  auth.js         exigirAutenticacao, valida o JWT no header Authorization
api/
  index.js        ponto de entrada da Vercel
colecoes.js       coleções temáticas e seus pisos de data (ex: /brasil)
db.js             conexão com o Postgres, usando DATABASE_URL
server.js         monta o Express, cors, estáticos e a rota /:id do RF009.
                  Exporta o app e só chama listen() se rodado direto.
vercel.json       manda tudo para api/index.js e inclui public/ no pacote
schema.sql        criação das tabelas usuarios e pins, com os índices
package.json
.env.example      modelo das variáveis, copiar para .env e preencher
.env              DATABASE_URL e JWT_SECRET. Não compartilhar nem commitar.
```

Para rodar: `npm install`, criar o `.env` a partir do `.env.example` com os
dados reais do Supabase, e `npm start`. A aplicação sobe em
<http://localhost:3000>.

## Decisões de projeto

1. **URL pública do autor (RF009)** é `/<id>`, por exemplo `/5`. É um caminho
   real, atendido pela rota Express `app.get(/^\/\d+$/, ...)`, que devolve o
   `index.html`. O front lê `window.location.pathname` para saber que está em
   modo leitura. Não usa mais query string.

2. **Mídia no artigo** é marcação embutida no texto: `[img]url[/img]`,
   `[video]url[/video]` e `[audio]url[/audio]`, interpretadas por regex no
   front. Não há colunas de mídia no banco.

3. **Sessão JWT** guardada no `localStorage`, nas chaves `token` e
   `usuarioAtual`. Expira em 7 dias. Se o back devolver 401, a sessão é limpa
   automaticamente e o usuário é avisado.

4. **Checagem de propriedade** em `PUT /pins/:id` e `DELETE /pins/:id`. Só o
   autor, comparando `autor_id` com o usuário do token, pode editar ou excluir.

5. **Mensagens de erro e sucesso (RNF04)** usam um sistema de toast não
   bloqueante, no canto superior direito, por cerca de 3,5 segundos. Substituiu
   todos os `alert()`. Toda ação de escrita tem retorno visual. A confirmação de
   exclusão usa um pop-up próprio, em `pedirConfirmacao()`, e não o `confirm()`
   nativo do navegador.

6. **Falha no carregamento do mapa (RF003, fluxo A1)**: se o Leaflet não carrega
   ou o `L.map()` falha, aparece uma tela de erro cheia com botão "Tentar
   novamente". Se apenas alguns tiles falham, por internet instável, aparece um
   banner amarelo temporário, sem travar o uso.

7. **Conteúdo escrito por usuário nunca vai direto para o `innerHTML`.** Título,
   texto, nome do autor e URL de mídia passam por `escaparHtml()` e
   `urlSegura()`. Ao acrescentar qualquer campo novo que apareça na tela, aplicar
   o mesmo, senão a falha de XSS volta.

8. **Datas trafegam sempre como texto no formato `AAAA-MM-DD`**, nunca como
   objeto `Date`. Quem garante isso é o `setTypeParser` do `db.js`. Não remover.

9. **Coleções temáticas.** Um pin pode pertencer a uma coleção, identificada
   na coluna `colecao` da tabela `pins`. Cada coleção ganha uma página no
   formato `/<slug>`, que mostra apenas os seus pins, em modo somente
   leitura. É o mesmo mecanismo do RF009, recortando por tema em vez de por
   autor. As coleções são declaradas em `colecoes.js`, e cada uma pode ter um
   piso de data próprio: a de história do Brasil não aceita filtro anterior a
   22 de abril de 1500. O mapa geral em `/` mostra apenas os pins avulsos: quem
   pertence a uma coleção aparece só na página dela.

   Para criar uma coleção nova basta acrescentar uma entrada em `colecoes.js`
   e marcar os pins com o slug correspondente. Não existe ainda interface para
   fazer essa marcação: hoje é feita direto no banco.

## Verificação em produção

Rodado contra o Supabase e depois contra <https://pinpedia.vercel.app>: RF001 a
RF009, incluindo cadastro, login com hash real, criação de PIN com data
histórica (ano 1500), filtro por período, edição, exclusão, mapa de terceiros e
os fluxos alternativos de e-mail duplicado, senha errada, usuário inexistente e
escrita sem token. Foram 21 verificações locais e 20 em produção, todas
passando. Os usuários de teste foram removidos ao final.

## Estado atual

Tudo abaixo testado e funcionando.

- RF001 a RF008: cadastro, login, mapa, ver artigo, criar, editar e excluir pin,
  filtro de data
- RF009: visualização de terceiros em `/<id>`, somente leitura, sem menu de
  criar ou editar
- Persistência de login entre recarregamentos, via `localStorage`
- Tratamento de erro de carregamento do mapa (RF003, fluxo A1)
- RNF04: revisão das mensagens de erro e sucesso, com o sistema de toast
- RF007: botão "Editar" dentro do artigo aberto, visível só para o autor. Antes
  só existia pelo clique com o botão direito.
- RF008: pop-up de confirmação próprio, com a mensagem e os botões do Quadro 18
- RF009: filtro de data e botão de login continuam na tela em modo leitura,
  como prevê o Quadro 19, e o filtro funciona nessa página
- Datas: o `pg` devolvia a coluna `DATE` como objeto `Date` e o `res.json()` a
  convertia em texto ISO completo. A data aparecia como
  `22T03:06:28.000Z/04/1500` e o campo de data do editor ficava vazio, o que
  quebrava o RF007 na prática. Resolvido com `types.setTypeParser(1082, ...)`
  no `db.js`.
- XSS armazenado: título, texto do artigo, URL de mídia e nome do autor iam
  direto para o `innerHTML`. Qualquer cadastrado conseguia salvar
  `<img src=x onerror=...>` e executar código no navegador de todos os leitores,
  inclusive para ler o token do `localStorage`. Resolvido com `escaparHtml()` e
  `urlSegura()`, que só aceita `http` e `https`.
- Autoria visível: o artigo mostra "registrado por" e o nome, com `JOIN` em
  `usuarios` no `GET /pins/:id`. Antes o leitor não tinha como saber de quem era
  a narrativa, o que contrariava a justificativa do projeto.
- Atalho "Meu mapa" na barra superior, só para usuário logado, apontando para o
  próprio `/<id>`
- `JWT_SECRET` conferido na subida do servidor. Sem ele, antes, o servidor subia
  normalmente e só o login quebrava, com um 500 obscuro.
- `/teste-db` não expõe mais o detalhe do erro, que trazia host e usuário do
  banco. O detalhe agora só vai para o log do servidor.
- Mobile: faltava a tag `<meta name="viewport">`, e criar PIN só existia pelo
  clique com o botão direito, que não existe em tela de toque, o que tornava o
  RF006 impossível no celular. Agora há viewport, layout que não estoura em
  375px e toque longo de cerca de 600ms como equivalente do botão direito, com o
  mesmo controle de autoria. Arrastar o dedo cancela o toque longo.
- Botão "Criar pin" fixo no canto inferior direito. Antes a criação só
  existia pelo clique com o botão direito, que quase ninguém descobre sozinho
  e que não existe em tela de toque. O botão liga um modo de posicionamento e
  o clique seguinte no mapa define a coordenada. O clique direito continua
  funcionando.
- Tela de login: os controles do mapa vazavam por cima dela, por conflito de
  camadas, e não havia como voltar ao mapa. Corrigido com `z-index` acima do
  Leaflet, botão "Voltar ao mapa" e tecla Esc.

## Acervo de conteúdo

A coleção `brasil`, publicada em <https://pinpedia.vercel.app/brasil>, reúne
33 registros que vão da chegada de Cabral, em 1500, à morte de D. Pedro II no
exílio, em 1891. Serve de conteúdo de demonstração e de teste de carga leve da
interface, já que exercita o filtro por período, o enquadramento automático do
mapa e a leitura de artigos longos.

Os textos priorizam pontos pouco tratados no ensino básico e que têm lastro na
historiografia acadêmica, entre eles a elevação do Brasil a Reino Unido em
1815, a natureza de golpe militar da Proclamação de 1889, a participação de
Estados africanos no tráfico atlântico, a construção republicana da figura de
Tiradentes depois de 1889 e a organização estatal de Palmares. Onde há disputa
entre historiadores, o texto diz que há.

## Divergências entre o código e o DERS

Levantadas numa conferência requisito a requisito. Cada uma precisa de uma
decisão: mudar o código ou corrigir o documento.

1. **RF003 passo 8 e RF004, Quadro 14.** O DERS diz que clicar num PIN abre a
   página do artigo em uma nova aba, e que imagens, áudios e vídeos aparecem
   como links clicáveis separados. O código abre um overlay na mesma aba e
   embute a mídia no texto. Isso foi decisão de projeto, registrada no item 2
   acima. O caminho mais barato é atualizar o texto e o Quadro 14 do DERS, não
   mexer no código.

2. **RF005, Quadro 15.** O DERS marca "Data Inicial" e "Data Final" como
   obrigatórias, com padrão na data atual. No código elas são opcionais e
   começam em branco, que é o comportamento certo: com o padrão do documento,
   nenhum registro histórico apareceria ao abrir o site. Corrigir o quadro para
   não obrigatório.

3. **RF001, Quadro 10.** O quadro lista apenas E-mail, Senha e Confirmar Senha,
   mas o sistema também pede Nome, usado para identificar o autor no RF009.
   Falta a linha "Nome" no quadro.

4. **RF006, Quadro 16.** Erro de digitação no documento: a linha "Longitude"
   está escrita como "Latitude", aparecendo duas vezes.

5. **RF002, Quadro 11.** A tela de login ganhou um botão "Voltar ao mapa", que o
   quadro não lista. Foi necessário: sem ele, quem abrisse o login por engano
   ficava preso, já que só havia "Entrar" e "Criar conta". Segue o mesmo espírito
   do fluxo A4 do RF001, de cancelar o cadastro, e atende ao RNF04. A tecla Esc
   faz o mesmo. Acrescentar a linha ao Quadro 11.

6. **RF006, fluxo básico.** O DERS descreve a criação de PIN apenas pelo
   clique com o botão direito, que abre um menu de contexto. Foi acrescentado
   um botão fixo "Criar pin" no canto inferior direito, que liga um modo de
   posicionamento: o clique seguinte no mapa define a coordenada. O clique
   direito continua funcionando, então nada do documento deixou de valer.
   Motivo da mudança: menu de contexto é pouco descoberto por quem usa pela
   primeira vez e não existe em tela de toque, o que prejudicava o RNF04 e a
   restrição de acesso por celular. Acrescentar o botão ao fluxo do RF006.

## O que falta

**RNF02.** Testar em outros navegadores (Chrome, Firefox e Edge) e, se possível,
em celular. É teste manual, não precisa de código. O toque longo foi validado em
emulação de celular, mas vale confirmar num aparelho real.

**Depois da banca.** Implementar a rota `/Brasil` com a restrição de data do
descobrimento.

## Melhorias sugeridas, ainda não feitas

**Testes automatizados.** A seção 4.1 do DERS promete verificação e validação,
mas não existe nenhum teste no projeto. Ficou de fora por opção, para o tempo
render mais garantindo o deploy. Se sobrar tempo, é o próximo da fila.

**Estado vazio e indicador de carregamento**, por exemplo "nenhum registro nesse
período".

## Perguntas prováveis da banca

**Dá para registrar um evento antes de Cristo?** Não. O `<input type="date">` do
HTML não aceita data anterior à era cristã, então a plataforma cobre da era
cristã em diante. É limitação conhecida de escopo, não esquecimento.

**Como o sistema impede que um usuário injete código no artigo de outro?** Todo
conteúdo escrito por usuário passa por `escaparHtml()` antes de ir para a tela,
e URL de mídia só é aceita se começar com `http` ou `https`, o que é feito por
`urlSegura()`.

**Por que Vercel e não um servidor tradicional?** Custo zero, deploy automático
a cada push e, ao contrário do plano free do Render, sem desligar por
inatividade. O custo é que a aplicação roda como função serverless, daí o
`api/index.js` e o uso do pooler do banco.

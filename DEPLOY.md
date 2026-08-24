# Como colocar o PinPedia no ar (Supabase + Vercel)

O código já está todo preparado. O que falta são as etapas que só podem ser
feitas com a sua conta (login, senha, autorização) — cada uma está descrita
clique a clique abaixo.

Tempo estimado: ~15 minutos.

---

## Parte 1 — Banco de dados no Supabase

1. Entre em <https://supabase.com> e crie um projeto (plano free).
   - **Region:** escolha `South America (São Paulo)` — o banco fica mais perto
     de quem vai acessar.
   - **Database Password:** o Supabase gera uma. **Copie e guarde**, ela aparece
     só uma vez e vai ser usada no passo 3.

2. Com o projeto criado, abra **SQL Editor** no menu lateral → **New query**.
   Cole todo o conteúdo do arquivo `schema.sql` e clique em **Run**.
   Isso cria as tabelas `usuarios` e `pins`. Pode rodar de novo sem medo: o
   arquivo usa `IF NOT EXISTS`, então não apaga nem duplica nada.

3. Clique em **Connect** (no topo do painel) e escolha a aba
   **Transaction pooler**. Copie a URI que aparece.

   > ⚠️ Tem que ser o **Transaction pooler** (porta **6543**), não a
   > "Direct connection" (5432). A Vercel acorda várias cópias do servidor ao
   > mesmo tempo, e a conexão direta estoura o limite de conexões do banco.

   Na URI copiada, troque `[YOUR-PASSWORD]` pela senha do passo 1.
   O resultado é o seu **`DATABASE_URL`**.

---

## Parte 2 — Gerar o segredo do JWT

O `JWT_SECRET` é o que assina os tokens de login. Precisa ser um texto longo e
aleatório — não invente um à mão. Rode isto no terminal, dentro da pasta do
projeto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copie o resultado. Esse é o seu **`JWT_SECRET`**.

---

## Parte 3 — Testar localmente antes de subir

Vale confirmar que o banco responde antes de envolver a Vercel.

1. Crie o arquivo `.env` na raiz do projeto (copiando o `.env.example`) e
   preencha com os dois valores dos passos anteriores.
2. Rode:

```bash
npm start
```

3. Abra <http://localhost:3000/teste-db>. Se aparecer
   `{"status":"conectado", ...}`, o banco está OK.
4. Abra <http://localhost:3000>, crie uma conta e um PIN para confirmar o fluxo.

> O `.env` **nunca** vai para o GitHub — ele já está no `.gitignore`.

---

## Parte 4 — Subir o código para o GitHub

O repositório local já está criado e com o primeiro commit pronto.

1. Crie um repositório novo e **vazio** em <https://github.com/new>
   (sem README, sem .gitignore — o projeto já tem os dois).
2. Rode, trocando pela URL do seu repositório:

```bash
git remote add origin https://github.com/SEU-USUARIO/pinpedia.git
```

```bash
git push -u origin main
```

---

## Parte 5 — Publicar na Vercel

1. Entre em <https://vercel.com> com a conta do GitHub.
2. **Add New… → Project** e importe o repositório do passo anterior.
3. Não mexa em Framework Preset, Build Command nem Output Directory — o
   `vercel.json` do projeto já diz tudo o que ela precisa saber.
4. Abra **Environment Variables** e cadastre as duas:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | a URI do Transaction pooler (Parte 1) |
   | `JWT_SECRET` | o texto aleatório (Parte 2) |

   Deixe as duas marcadas para *Production*, *Preview* e *Development*.

5. Clique em **Deploy** e espere.

---

## Parte 6 — Conferir se subiu certo

Com a URL que a Vercel deu (algo como `https://pinpedia.vercel.app`):

1. `.../teste-db` → tem que responder `{"status":"conectado", ...}`.
   Se der erro aqui, o problema é o `DATABASE_URL`.
2. `.../` → o mapa carrega.
3. Criar conta, entrar e criar um PIN.
4. `.../1` → a visualização de terceiros do RF009 (o número é o id do usuário).

---

## Coisas para lembrar antes da apresentação

- **O plano free do Supabase pausa o banco depois de ~7 dias sem nenhum
  acesso.** Se ficar um tempo sem mexer, entre no painel do Supabase e
  reative o projeto **um dia antes** da banca, não na hora.
- Diferente do Render, a Vercel **não** desliga o servidor por inatividade —
  a primeira requisição depois de um tempo parado só demora ~1 segundo a mais.
- Depois do primeiro deploy, **todo `git push` na branch `main` publica
  sozinho**. Cuidado com push de última hora antes de apresentar.
- Se precisar trocar uma variável de ambiente, a Vercel exige um **Redeploy**
  para ela valer (Deployments → … → Redeploy).

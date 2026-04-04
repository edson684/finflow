# 🚀 Guia de Deploy – FinFlow (Supabase + Vercel)

## Passo 1 — Criar o projeto no Supabase

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em **New Project** e dê um nome (ex: `finflow`)
3. Defina uma senha forte para o banco e escolha a região **South America (São Paulo)**
4. Aguarde ~2 minutos até o projeto ficar pronto

---

## Passo 2 — Criar as tabelas

1. No painel do Supabase, vá em **SQL Editor** → **New Query**
2. Cole todo o conteúdo do arquivo `supabase_schema.sql`
3. Clique em **Run** — as tabelas e regras de segurança serão criadas

---

## Passo 3 — Pegar as credenciais

1. No Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon / public key** → a chave longa que começa com `eyJ...`

---

## Passo 4 — Subir o código no GitHub

1. Crie um repositório no https://github.com (pode ser privado)
2. Dentro da pasta `finflow`, rode:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/SEU_USER/finflow.git
   git push -u origin main
   ```

---

## Passo 5 — Deploy na Vercel

1. Acesse https://vercel.com e crie uma conta gratuita (pode entrar com o GitHub)
2. Clique em **Add New Project** e importe o repositório `finflow`
3. Na seção **Environment Variables**, adicione as duas variáveis:

   | Nome                          | Valor                          |
   |-------------------------------|--------------------------------|
   | `REACT_APP_SUPABASE_URL`      | URL do seu projeto Supabase    |
   | `REACT_APP_SUPABASE_ANON_KEY` | Chave anon/public do Supabase  |

4. Clique em **Deploy** e aguarde ~1 minuto

Pronto! A Vercel vai te entregar um link público como:
`https://finflow-seunome.vercel.app`

---

## Passo 6 — Configurar Auth no Supabase (importante!)

1. No Supabase, vá em **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque a URL da Vercel: `https://finflow-seunome.vercel.app`
3. Em **Redirect URLs**, adicione também essa URL

Isso garante que o login por e-mail funcione corretamente em produção.

---

## ✅ O que já está funcionando

- Login e cadastro com e-mail e senha
- Cada usuário vê apenas seus próprios dados (Row Level Security)
- Transações salvas em tempo real no banco
- Metas financeiras persistidas
- Gráficos gerados com dados reais
- Deploy automático a cada `git push`

---

## 🔄 Atualizações futuras

Para atualizar o site basta fazer push para o GitHub:
```bash
git add .
git commit -m "minha atualização"
git push
```
A Vercel detecta automaticamente e republica.

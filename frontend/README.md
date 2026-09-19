# Frontend do LumoStudy

Frontend em Next.js da plataforma LumoStudy.

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação abre em `http://localhost:3000`.

Por padrão, no computador local ela procura o backend na porta `8000`. Se o backend estiver hospedado em outro endereço, crie `frontend/.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_API_URL=https://sua-api.exemplo.com
```

## Produção

```bash
npm run build
npm run start
```

Nunca coloque credenciais do MySQL ou senhas SMTP no frontend. O navegador só precisa conhecer a URL pública da API.

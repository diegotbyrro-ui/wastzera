# Publicação

Siga a seção **Publicar pela Hostinger + GitHub** do README.md. Este projeto deve ter repositório e banco próprios.

- Runtime: Node.js 22.
- Build: `npm ci && npm run build`.
- Start: `npm run start`.
- Banco: execute `database/001_wastzera.sql` no projeto Supabase novo.
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_COOKIE_SECRET`, `APP_ORIGIN`.
- Defina `APP_ORIGIN` como a origem HTTPS do site. Não exponha chaves e senhas no repositório.
- Após configurar, teste uma campanha completa em ambiente real.

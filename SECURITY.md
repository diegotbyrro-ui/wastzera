# Segurança e operação — V0.4

As páginas públicas usam uma lista explícita de campos permitidos. O código completo (`puzzle_parts`) e seu hash (`puzzle_hash`) só são consultados no servidor e no painel administrativo autorizado. Nenhuma tabela pode ser lida diretamente por chaves anônimas. Preserve a chave secreta e a senha fora do GitHub.

O formulário só é exibido após validação em `/api/unlock`. A confirmação em `/api/entries` valida novamente o hash no PostgreSQL; ocultar os campos no navegador não é a proteção principal. Um código correto não reserva vaga: o sorteio precisa estar aberto e ter capacidade no momento do envio.

O código pertence ao sorteio, não ao espectador. O sistema não comprova visualização completa, inscrição ou identidade no YouTube. E-mail e telefone não são confirmados por mensagem.

As inscrições bloqueiam a linha do sorteio e deduplicam e-mail/telefone. O encerramento congela o conjunto e não permite reabertura. O sorteio usa `crypto.randomInt` no servidor e é salvo antes da animação da roleta, sem repetição pela API. O resultado fica público imediatamente, mesmo durante a animação administrativa.

A sessão do painel é assinada, HttpOnly, SameSite=Strict e Secure em produção; expira em duas horas. Alterações exigem a origem configurada. A exportação Excel trata fórmulas de planilhas. As limitações de tentativa são locais por processo e reiniciam com o servidor.

Nome completo, telefone e e-mail ficam no aba de participantes e nos arquivos Word/Excel. A roleta pública, a lista pública de participantes e o resultado mostram primeiro nome e inicial do último sobrenome. A rota de participantes exige sessão para mostrar nomes completos, não retorna telefone ou e-mail e rejeita acesso público a rascunhos. Solicitações de exclusão devem ser tratadas pela organização com acesso administrativo ao banco. Não publique arquivos com contatos.

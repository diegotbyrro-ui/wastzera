# Verificação — V0.11

- Build de produção e TypeScript aprovados com Node.js 22.
- 15 testes automatizados aprovados: catálogo completo e imagens PNG, IDs únicos, GIFT CARD único, validações, sessão, códigos, consentimento, SQL e roleta de nomes.
- 2.126 imagens baixadas, sem falhas. Todas conferidas quanto à presença e assinatura PNG.
- Testes HTTP locais com backend de teste: proteção do ADMIN, nomes completos restritos, código e cadastro, aba de participantes e ausência do campo de descrição.
- Downloads reais de Word (.docx) e Excel (.xlsx) gerados pela rota da aplicação; contêineres ZIP/OOXML abertos e conteúdo dos participantes fictícios conferido.
- Prévias separadas para site, ADMIN e participantes. Dados fictícios; nenhuma inscrição real é criada.
- Sem inspeção visual completa em navegador ou execução do instalador no Windows nesta sessão.
- Sem configuração ou validação em Supabase/Hostinger reais. Nenhum banco real foi alterado.

- Seletor nativo e atualização da imagem validados por compilação e verificações da estrutura das prévias.
- MP3 local idêntico ao arquivo enviado (SHA-256); player nativo sem iframe ou link de música YouTube. Rotas da aplicação e da prévia conferidas com resposta parcial (HTTP 206), MIME de áudio e tamanho.
- Imagens configuradas com object-fit: contain e sem zoom/rotação; título e valor dos cards ficam em fluxo próprio abaixo da imagem. Prévia ADMIN e demais prévias conferidas quanto aos caminhos locais.
- Reprodução audível e aparência final não foram inspecionadas em navegador nesta sessão.
- Fogos renderizados em canvas, sem som, com preferência por reduzir movimento respeitada. A animação não foi inspecionada em navegador nesta sessão.

- V0.8: logos oficiais locais no cabeçalho/rodapé/roleta; foto recortada aplicada na abertura e caminhos das imagens conferidos nas prévias.


- Nick da Twitch: normalização, obrigatoriedade, armazenamento SQL, migração repetida e preservação de cadastro anterior conferidos nos testes. A função antiga de seis argumentos deixa de aceitar novos cadastros.
- Remoção do campo de endereço e geração automática pelo servidor verificadas em HTTP; nick presente nos arquivos Word/Excel e ausente na resposta pública.
- Giro de 30 segundos configurado na aplicação e prévia; o tempo de rede antecede o giro. Cronometragem e áudio não verificados em navegador nesta sessão.
- Recorte transparente criado com a ferramenta integrada de imagem a partir da foto enviada, inspecionado antes da inclusão. Prompt: remover fundo de evento e demais pessoas; manter jogador, rosto, headset, cadeira, monitor, teclado, mãos e mesa em um recorte fotográfico transparente. Arquivo: public/brand/wastzera-gaming.png.

- V0.9: duração atualizada para 50.000 ms na aplicação e 50 segundos na prévia; preferências de movimento reduzido mantidas. A duração não foi cronometrada em navegador nesta sessão.
- Foto da abertura complementada pela ferramenta integrada de imagem e inspecionada antes da inclusão. Prompt: expandir somente o lado esquerdo do monitor e da mesa para completar seus contornos; preservar jogador, pose e setup, com fundo transparente. Asset final: public/brand/wastzera-gaming-complete.png.

- V0.10: logo oficial reutilizada como máscara CSS em duas camadas ciano/roxo, com desfoque e halo atrás do jogador. Sem edição da foto. Caminho da máscara adaptado para uso local nas três prévias. Estrutura das camadas e presença dos arquivos verificadas; aparência final não inspecionada em navegador.

- V0.11: roleta ADMIN com até 520 px e escala de nomes/centro proporcional; tamanho limitado pelo contêiner para manter a forma circular. Layout passa para uma coluna até 1.000 px. CSS atualizado nas três prévias. Não houve alteração no sorteio nem no banco; inspeção visual em navegador não realizada.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Consumidor Final (B2C):** Proprietários de smartphones (Apple iPhone, Samsung Galaxy, Xiaomi, Motorola, Realme) em Campo Grande - MS com telas quebradas, baterias viciadas, falhas de software ou danos líquidos precisando de reparo urgente, transparente e com garantia.
2. **Lojistas e Técnicos de Reparo (B2B):** Donos de assistência técnica, revendedores de acessórios e lojistas de celular de Campo Grande e região que necessitam de reposição rápida e recorrente de peças, películas e acessórios no atacado com margem competitiva e suporte direto via WhatsApp.

## Product Purpose

Oferecer um portal web de alta conversão e presença digital para a **InfinityTech**, centralizando em uma única estrutura duas operações distintas e complementares:
- Atendimento direto ao cliente final para conserto de celular com diagnóstico gratuito e delivery leva-e-traz.
- Distribuição de peças e acessórios no atacado para revendedores e assistências parceiras.

## Positioning

A InfinityTech se diferencia por combinar estoque real a pronta-entrega em Campo Grande - MS (Av. Afonso Pena, 1753), velocidade de conserto (troca de tela e bateria em até 2 horas), peças testadas com garantia real e atendimento consultivo humanizado direto no WhatsApp, sem termos técnicos confusos para o cliente final e sem burocracia para o lojista.

## Operating Context

- **Localização física:** Av. Afonso Pena, 1753 - Centro, Campo Grande - MS, CEP 79002-070.
- **Canais de conversão:**
  - WhatsApp B2C (Assistência Técnica): `(67) 99342-9905`
  - WhatsApp B2B (Lojistas / Atacado): `(67) 99268-3435`
- **Jornada de uso:** Acesso ao portal split-screen (`index.html`) para segmentar a intenção do visitante em 1 clique, direcionando para a landing page dedicada correspondente com argumentos, catálogo/serviços e botão direto para o WhatsApp do atendente responsável.

## Capabilities and Constraints

- **Arquitetura estática pura:** HTML5 semântico, CSS3 moderno modular (`main.css`, `portal.css`, `assistencia.css`, `lojistas.css`) e JavaScript Vanilla performático sem dependências de frameworks pesados.
- **Roteamento duplo:** Suporte tanto às rotas na raiz (`assistencia-tecnica.html`, `lojistas.html`) quanto a diretórios (`assistencia-tecnica/index.html`, `lojistas/index.html`) para compatibilidade total de deploy estático.
- **Zero stock photos genéricas:** Uso estrito e exclusivo do acervo de imagens reais da empresa localizado em `/img`.

## Brand Commitments

- **Nome oficial:** InfinityTech (Distribuidor de Peças de Celular & Assistência Técnica).
- **Logo:** Logomarca oficial padronizada em `img/logo.png`.
- **Cores da Marca:**
  - Primária: Azul Petróleo / Metálico (`#0B2A4A` / `#0E3A63`)
  - Secundária / Destaque: Vermelho Vibrante (`#C0202E` / `#C41E2E`)
  - Fundos: Branco/Off-white (`#FFFFFF` / `#F8FAFC`) para B2C e Dark Mode Tecnológico (`#040D17` / `#071D33`) para o Portal e Lojistas.
- **Tom de voz:** Profissional, ágil, transparente, confiável e focado em resolver o problema do cliente sem fricção.

## Evidence on Hand

- Catálogo de imagens reais da operação em `/img`:
  - `img/logo.png` (Logomarca oficial)
  - `img/1584E782-EF9F-4393-B773-A3A333E2E89A.PNG` (Bancada e atendente com uniforme)
  - Fotos de peças e acessórios no atacado: películas de vidro e hidrogel, carregadores homologados, suportes veiculares para carro/moto, power banks, fones sem fio.
- Depoimentos reais de clientes e lojistas parceiros mapeados.

## Product Principles

1. **Segmentação Imediata:** O visitante nunca deve se sentir perdido; a escolha entre cliente final e lojista é clara desde o primeiro segundo no portal.
2. **Confiança e Transparência:** Prova visual com fotos reais da loja física, técnicos e produtos em vez de ilustrações abstratas.
3. **Conversão em Menos Passos:** Cada bloco de conteúdo conduz naturalmente a uma chamada clara e objetiva para o WhatsApp.
4. **Performance e Acessibilidade:** Carregamento ultra-rápido em conexões 4G/5G móveis, código semântico e contraste visual confortável.

## Accessibility & Inclusion

- Contraste tipográfico de acordo com as diretrizes WCAG AA.
- Textos alternativos (`alt`) descritivos em todas as imagens de produtos e da loja física.
- Alvos de toque (touch targets) de no mínimo 44x44px para dispositivos móveis.

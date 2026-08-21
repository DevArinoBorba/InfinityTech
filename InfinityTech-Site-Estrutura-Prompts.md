# InfinityTech — Estrutura do Site + Prompts para o AntGravity

Base de referência: **https://orium-phi.vercel.app/** (layout, fluxo de seções e UX)
Conteúdo/negócio: **InfinityTech — Distribuidor de Peças de Celular**

> ⚠️ **IMPORTANTE — pasta de imagens:** o projeto tem uma pasta **`/img`** com todas as fotos e artes da InfinityTech já prontas (logo, fotos da assistência técnica, fotos de produtos/acessórios, telas de proteção, suportes, carregador, etc.). **Todos os prompts abaixo já reforçam isso** — a IA não deve gerar imagens novas nem usar placeholders/stock photos: ela deve **buscar e referenciar os arquivos existentes em `/img`**.

---

## 0. Antes de começar — decisões de escopo

A InfinityTech atende **dois públicos completamente diferentes**, e o site vai ser estruturado em **duas partes separadas**, cada uma com sua própria jornada, sem misturar mensagens:

1. **Cliente Final (B2C)** → `/assistencia-tecnica` — conserto de celular: troca de tela, bateria, placas, água, diagnóstico grátis, delivery, pronto em 2h. WhatsApp: **(67) 99333-2306**
2. **Lojista / Revendedor (B2B)** → `/lojistas` — compra de peças e acessórios (carregadores, cabos, capas, películas, suportes, fones, powerbank) com preço de atacado. WhatsApp: **(67) 99268-3435**

**Como isso funciona na prática:** existe uma **página inicial (portal de entrada)** só com a marca e uma pergunta simples — "Você é cliente final ou lojista?" — que direciona para uma das duas experiências completas. Cada parte tem seu próprio hero, diferenciais, serviços/produtos, FAQ e contato — como se fossem dois mini-sites dentro do mesmo domínio, com footer compartilhado.

Cores da marca (extraídas do logo): azul petróleo/metálico (#0B2A4A a #1B4F8C aprox.), vermelho (#C0202E aprox.), branco. Tipografia pesada, bold, estilo tech/industrial — igual ao clima do Orium (mas trocando a paleta roxo/azul do Orium por azul+vermelho da InfinityTech).

---

## 1. Mapa do Site (Sitemap)

```
/ (Portal de entrada — split screen "Cliente Final" x "Sou Lojista")
 │
 ├── /assistencia-tecnica  (PARTE 1 — Cliente Final)
 │    ├── #hero
 │    ├── #diferenciais
 │    ├── #servicos
 │    ├── #marcas-atendidas
 │    ├── #como-funciona
 │    ├── #depoimentos (opcional)
 │    ├── #faq
 │    └── #contato
 │
 ├── /lojistas  (PARTE 2 — Lojista/Revendedor B2B)
 │    ├── #hero
 │    ├── #por-que-ser-parceiro
 │    ├── #produtos-acessorios
 │    ├── #como-funciona-parceria
 │    ├── #faq
 │    └── #contato
 │
 └── footer (compartilhado, com links para as duas partes + os dois WhatsApp)
```

**Navegação:** o header, em ambas as partes, mantém um pequeno seletor fixo no canto (ex.: "Cliente Final | Sou Lojista") para trocar de trilha a qualquer momento, sem precisar voltar ao portal inicial.

---

## 2. Estrutura seção por seção (conteúdo real, pronto pra usar)

### 2.0 Portal de Entrada (página `/`)
Tela simples, de impacto, dividida em duas metades clicáveis (split screen), sem menu extenso — só a logo no topo.
- Logo InfinityTech centralizada no topo — **arquivo do logo em `/img`**
- Título: **"O que você precisa hoje?"**
- Metade esquerda (foto de assistência técnica vinda de `/img`): **"Sou Cliente Final"** — "Conserto rápido, com garantia e diagnóstico gratuito" → botão "Ver Assistência Técnica" → `/assistencia-tecnica`
- Metade direita (foto de produtos/acessórios vinda de `/img`): **"Sou Lojista"** — "Peças e acessórios com preço de atacado para o seu negócio" → botão "Ver para Lojistas" → `/lojistas`
- Rodapé simples com os dois WhatsApp já visíveis, para quem quiser ir direto sem escolher.

---

## PARTE 1 — Cliente Final (`/assistencia-tecnica`)

### 2.1 Header / Navbar
- Logo InfinityTech (arquivo em `/img`)
- Menu: Início · Serviços · Marcas · Como Funciona · FAQ · Contato
- Seletor de trilha no canto: "Cliente Final ✓ | Sou Lojista" (link para `/lojistas`)
- Botão CTA fixo no topo direito: **"Fale no WhatsApp"** (verde, ícone WhatsApp) → (67) 99333-2306

### 2.2 Hero
- **H1:** Assistência Técnica Profissional e Confiável para o seu Smartphone
- **Subheadline:** Cuidado especializado, peças de qualidade e agilidade — na maioria dos casos, seu celular fica pronto em até 2 horas.
- **Bullets rápidos (3 ícones):** Pronto em até 2h · Delivery — buscamos e entregamos · Garantia no serviço
- **CTA primário:** "Solicitar orçamento grátis no WhatsApp" → (67) 99333-2306
- Imagem: foto da atendente com o celular na bancada — **buscar em `/img`** (arte "Assistência Técnica" com fundo claro, atendente de uniforme preto)

### 2.3 Diferenciais
Título: **Cuidamos do que é importante para você**
- Profissionais Especializados — para o melhor cuidado com seu aparelho
- Agilidade — serviços rápidos sem perder a qualidade
- Peças de Qualidade — mais durabilidade
- Garantia no Serviço — mais segurança e tranquilidade
- Manutenção Especializada — soluções completas
- Diversas Marcas — atendemos as principais marcas
- Diagnóstico Preciso — identificamos o problema com precisão
- Confiança e Transparência — você informado em cada etapa

### 2.4 Serviços de Assistência Técnica
Título: **Assistência Técnica Profissional e Confiável**
Cards (ícone + título + descrição curta):
1. **Troca de Tela** — com garantia
2. **Troca de Bateria** — com qualidade
3. **Reparos em Placas** — com precisão
4. **Problemas com Água** — diagnóstico especializado
5. **Manutenção Completa** — seu aparelho como novo
6. **Diagnóstico Gratuito** — análise completa, sem custo, sem compromisso

Destaque em caixa: **"Troca de Tela em até 2 horas — Rápido, seguro e com garantia"** (usar a foto da tela trincada de `/img`)

### 2.5 Marcas Atendidas
Título: **Assistência técnica para todas as marcas**
- Apple · Samsung · Xiaomi · Motorola · Realme
- Dois blocos de destaque (usando as artes prontas de Apple e Motorola já existentes em `/img`):
  - **Apple** — Reparos especializados em iPhone/iPad, troca de bateria com peças de alta qualidade, recuperação de placas, garantia estendida
  - **Motorola** — especializada em cuidar do seu Motorola, troca de tela/bateria, reparos em placas, problemas com água

### 2.6 Como Funciona
Título: **Simples, rápido e transparente**
1. Você entra em contato pelo WhatsApp e explica o problema
2. Trazemos seu aparelho ou fazemos a coleta (delivery)
3. Diagnóstico gratuito e orçamento sem compromisso
4. Reparo executado por especialistas, com peças de qualidade
5. Você recebe o aparelho pronto — com garantia

### 2.7 Depoimentos / Prova Social (opcional)
Se não houver depoimentos reais ainda, trocar por selos: "Diagnóstico 100% Gratuito" e "Garantia em todos os serviços".
> Não inventar depoimentos falsos — só usar se o cliente fornecer avaliações reais.

### 2.8 FAQ
- Quanto tempo leva o conserto? → Na maioria dos casos, até 2 horas.
- O orçamento tem custo? → Não, o diagnóstico é 100% gratuito e sem compromisso.
- Vocês atendem todas as marcas? → Sim: Apple, Samsung, Xiaomi, Motorola, Realme e outras.
- Tem garantia? → Sim, todo serviço sai com garantia.
- Vocês fazem delivery? → Sim, buscamos e entregamos.

### 2.9 Contato / CTA Final
Título: **Seu celular parou? Fale com a gente agora**
Botão grande de WhatsApp → (67) 99333-2306
Endereço da loja (se quiser exibir) + mapa embed (Google Maps) + horário de funcionamento

---

## PARTE 2 — Lojista / Revendedor (`/lojistas`)

### 2.10 Header / Navbar
- Logo InfinityTech (arquivo em `/img`)
- Menu: Início · Por que ser parceiro · Produtos · Como Funciona · FAQ · Contato
- Seletor de trilha no canto: "Cliente Final | Sou Lojista ✓" (link para `/assistencia-tecnica`)
- Botão CTA fixo no topo: **"Fale no WhatsApp"** → (67) 99268-3435

### 2.11 Hero
Fundo escuro/diferenciado (identidade visual própria dessa trilha, para não confundir com a Parte 1).
- **H1:** Acessórios para Celular — Para Lojistas
- **Subheadline:** Qualidade premium, preço competitivo e entrega rápida para o seu negócio.
- **CTA primário:** "Seja nosso parceiro e aumente seus lucros" → WhatsApp (67) 99268-3435
- Imagem: foto do mockup de produtos (carregador, capa, fones, película, suporte) — **buscar em `/img`**

### 2.12 Por que ser parceiro
- Produtos de Qualidade — padrão premium
- Preços Competitivos — mais lucro para você
- Entrega Rápida — agilidade que seu negócio precisa
- Variedade que Vende — tudo em um só lugar
- Parceria que Gera Lucro — cresça junto com a InfinityTech

### 2.13 Produtos / Catálogo (grid com foto real de `/img` para cada item)
1. Película Protetora de Vidro — Proteção máxima contra riscos e impactos, alta definição
2. Película de Hidrogel — Autorrecuperável, se adapta perfeitamente à tela
3. Carregador Premium — Carregamento rápido, alta durabilidade, segurança total
4. Suporte Veicular para Carro — Fixação segura, ajuste 360°
5. Suporte Veicular para Moto — Resistente à chuva, reduz vibrações
6. Capas, Cabos, Fones sem fio, Power Banks

Cada card: foto do produto (de `/img`) + nome + 2 bullets + botão "Consultar disponibilidade" → WhatsApp (67) 99268-3435

### 2.14 Como Funciona a Parceria
1. Fale com a gente pelo WhatsApp e conte sobre sua loja
2. Receba a tabela de preços e catálogo completo
3. Faça seu pedido com condições especiais
4. Receba com entrega rápida
5. Reponha o estoque sempre que precisar

### 2.15 FAQ (Lojistas)
- Qual o pedido mínimo? → (a definir pelo cliente)
- Como funciona o frete/entrega? → Entrega rápida, condições a combinar conforme região.
- Emitem nota fiscal? → (a definir pelo cliente)
- Vocês têm tabela de preços fixa? → Fale no WhatsApp para receber a tabela atualizada.

### 2.16 Contato Final
Título: **Vamos fazer negócio?**
Botão grande de WhatsApp → (67) 99268-3435

---

### 2.17 Footer (compartilhado nas duas partes)
- Logo + slogan "Distribuidor de Peças de Celular" (arquivo em `/img`)
- Links rápidos para as duas trilhas
- Redes sociais (Instagram/Facebook, se houver)
- Os dois WhatsApp: Assistência (67) 99333-2306 · Lojistas (67) 99268-3435
- © InfinityTech — Todos os direitos reservados

---

## 3. Prompts para usar no AntGravity

> Como o AntGravity trabalha a partir de um projeto/base existente, a estratégia é: **(1)** abrir o projeto do Orium, **(2)** rodar o prompt "mestre" de clonagem estrutural + rebranding + divisão em duas partes, **(3)** depois prompts seção por seção. Cole os prompts abaixo em sequência. **Todo prompt já reforça o uso da pasta `/img`** — não deixe a IA gerar ou buscar imagens de outro lugar.

### Prompt 1 — Clonagem estrutural + rebranding + divisão em 2 partes (rodar primeiro)
```
Use o projeto atual (baseado em orium-phi.vercel.app) como estrutura de layout, grid, animações e componentes reutilizáveis — NÃO reaproveite nenhum texto, imagem ou cor da Orium Digital.

IMPORTANTE SOBRE IMAGENS: este projeto tem uma pasta "/img" com TODAS as imagens oficiais da InfinityTech (logo, fotos da assistência técnica, fotos de produtos e acessórios, artes de películas, carregador, suportes veiculares, etc.). Em nenhuma hipótese gere imagens novas, use IA de imagem ou placeholders/stock photos — sempre importe e referencie os arquivos que já existem dentro de "/img", escolhendo o arquivo mais adequado para cada seção pelo nome/conteúdo do arquivo. Se não encontrar uma imagem adequada em "/img" para alguma seção específica, apenas sinalize isso em vez de inventar uma imagem.

Crie um site institucional para a empresa "InfinityTech — Distribuidor de Peças de Celular" dividido em DUAS PARTES/TRILHAS distintas, dentro do mesmo domínio:

1. Uma página inicial "/" funcionando como portal de entrada: uma tela split-screen com duas metades clicáveis — "Sou Cliente Final" (leva para /assistencia-tecnica) e "Sou Lojista" (leva para /lojistas). Use fotos de "/img" em cada metade.

2. A rota "/assistencia-tecnica" — voltada para o CLIENTE FINAL (conserto de celular): hero, diferenciais, serviços, marcas atendidas, como funciona, FAQ e contato. WhatsApp desta trilha: (67) 99333-2306.

3. A rota "/lojistas" — voltada para o LOJISTA/REVENDEDOR (compra de peças e acessórios no atacado): hero com identidade visual própria (fundo mais escuro, para diferenciar da trilha do cliente final), diferenciais de parceria, catálogo de produtos, como funciona a parceria, FAQ e contato. WhatsApp desta trilha: (67) 99268-3435.

Mantenha, em ambas as rotas, o mesmo padrão de: header fixo com CTA em destaque, hero com headline grande + subheadline + botões, grid de ícones para diferenciais, cards para serviços/produtos, FAQ em accordion, e um footer compartilhado com as duas rotas e os dois WhatsApp.

Paleta de cores: azul petróleo/metálico (#0E3A63 principal, #1B5AA0 secundário) e vermelho (#C41E2E), sobre fundo branco/cinza claro (#F5F6F8), tipografia bold/condensada (estilo tech). Use a logo InfinityTech de "/img" no header e footer das duas rotas.

Adicione, no header das duas rotas, um pequeno seletor de trilha ("Cliente Final | Sou Lojista") para alternar entre elas sem voltar ao portal inicial.

Não gere nenhum texto placeholder do tipo "lorem ipsum" — vou fornecer o conteúdo completo seção por seção nos próximos prompts. Pergunte se faltar algum dado específico.
```

### Prompt 2 — Portal de entrada "/"
```
Use imagens da pasta "/img" (não gere nem busque imagens novas) para montar a página inicial "/":
Logo InfinityTech centralizada no topo (arquivo do logo em "/img").
Título: "O que você precisa hoje?"
Metade esquerda (usar foto de assistência técnica de "/img" como fundo): "Sou Cliente Final" — "Conserto rápido, com garantia e diagnóstico gratuito" — botão "Ver Assistência Técnica" → /assistencia-tecnica
Metade direita (usar foto de produtos/acessórios de "/img" como fundo): "Sou Lojista" — "Peças e acessórios com preço de atacado para o seu negócio" — botão "Ver para Lojistas" → /lojistas
Rodapé simples com os dois WhatsApp visíveis: (67) 99333-2306 e (67) 99268-3435.
```

### Prompt 3 — Hero da rota /assistencia-tecnica
```
Na rota /assistencia-tecnica, monte a seção Hero usando uma foto de "/img" (a arte com a atendente de uniforme preto, logo InfinityTech no peito, em bancada com celular e ferramentas) — não gerar imagem nova.
Headline (H1): "Assistência Técnica Profissional e Confiável para o seu Smartphone"
Subheadline: "Cuidado especializado, peças de qualidade e agilidade — na maioria dos casos, seu celular fica pronto em até 2 horas."
3 badges/ícones em linha: "Pronto em até 2h" | "Delivery — buscamos e entregamos" | "Garantia no serviço"
Botão primário (verde, ícone WhatsApp): "Solicitar orçamento grátis" → https://wa.me/5567993332306
```

### Prompt 4 — Diferenciais (/assistencia-tecnica)
```
Crie uma seção de grid com 8 diferenciais, ícone + título + descrição curta, cards com borda arredondada:
1. Profissionais Especializados — para o melhor cuidado com seu aparelho
2. Agilidade — serviços rápidos sem perder a qualidade
3. Peças de Qualidade — trabalhamos com peças de alta qualidade para mais durabilidade
4. Garantia no Serviço — mais segurança e tranquilidade para você
5. Manutenção Especializada — soluções completas para seu aparelho
6. Diversas Marcas — atendemos as principais marcas
7. Diagnóstico Preciso — identificamos o problema com precisão
8. Confiança e Transparência — você informado em cada etapa do serviço
Título da seção: "Cuidamos do que é importante para você"
Use ícones simples de linha (não precisa de foto para esta seção).
```

### Prompt 5 — Serviços (/assistencia-tecnica)
```
Crie a seção "Assistência Técnica Profissional e Confiável" com 6 cards (ícone + título + descrição curta):
1. Troca de Tela — com garantia
2. Troca de Bateria — com qualidade
3. Reparos em Placas — com precisão
4. Problemas com Água — diagnóstico especializado
5. Manutenção Completa — seu aparelho como novo
6. Diagnóstico Gratuito — análise completa, sem custo, sem compromisso

Abaixo dos cards, um banner de destaque (vermelho/azul) usando a foto da tela de celular trincada que está em "/img": "Troca de Tela em até 2 horas — Rápido, seguro e com garantia", com botão "Fazer orçamento" → https://wa.me/5567993332306
```

### Prompt 6 — Marcas atendidas (/assistencia-tecnica)
```
Crie a seção "Assistência técnica para todas as marcas" com uma linha: Apple • Samsung • Xiaomi • Motorola • Realme.
Abaixo, dois cards grandes de destaque, usando as artes de "/img" específicas de Apple e de Motorola como imagem de fundo/lateral de cada card (não gerar imagem nova):
- Card Apple: título "Assistência Técnica Especializada Apple", texto "Excelência em cada detalhe. Cuidado que seu Apple merece.", lista: Reparos em iPhone/iPad, Troca de bateria com peças de alta qualidade, Recuperação de placas, Garantia estendida.
- Card Motorola: título "Assistência Técnica Especializada Motorola", texto "Especializada em cuidar do seu Motorola.", lista: Troca de tela com garantia, Troca de bateria com qualidade, Reparos em placas, Diagnóstico para problemas com água.
```

### Prompt 7 — Como funciona + FAQ + Contato (/assistencia-tecnica) [Concluído]
```
Crie 3 seções na rota /assistencia-tecnica:

1) "Como Funciona" — stepper horizontal com 5 passos:
Fale com a gente pelo WhatsApp e explique o problema → Traga o aparelho ou solicite o delivery → Diagnóstico gratuito e orçamento sem compromisso → Reparo feito por especialistas, com peças de qualidade → Você recebe o aparelho pronto, com garantia.

2) FAQ em accordion:
Quanto tempo leva o conserto? — Na maioria dos casos, até 2 horas.
O orçamento tem custo? — Não, o diagnóstico é 100% gratuito e sem compromisso.
Vocês atendem todas as marcas? — Sim: Apple, Samsung, Xiaomi, Motorola, Realme e outras.
Os serviços têm garantia? — Sim, todo serviço sai com garantia.
Vocês fazem delivery? — Sim, buscamos e entregamos o aparelho.

3) Contato final: título "Seu celular parou? Fale com a gente agora", botão grande de WhatsApp → https://wa.me/5567993332306, embed de mapa (placeholder) e campo de horário de funcionamento a definir.

Nenhuma imagem nova necessária nesta etapa; se quiser usar ícones de apoio, mantenha o estilo de linha já usado nas seções anteriores.
```

### Prompt 8 — Hero + diferenciais da rota /lojistas [Concluído]
```
Na rota /lojistas, use uma foto de "/img" (mockup de produtos: carregador, capa, fones, película, suporte) — não gerar imagem nova.
Crie um hero com fundo escuro/diferenciado (para marcar visualmente que essa é a trilha B2B, diferente da /assistencia-tecnica):
Headline (H1): "Acessórios para Celular — Para Lojistas"
Subheadline: "Qualidade premium, preço competitivo e entrega rápida para o seu negócio."
Botão CTA em destaque: "Seja nosso parceiro e aumente seus lucros" → https://wa.me/5567992683435

Logo abaixo, seção "Por que ser parceiro" em grid de 5 itens:
Produtos de Qualidade — padrão premium
Preços Competitivos — mais lucro para você
Entrega Rápida — agilidade que seu negócio precisa
Variedade que Vende — tudo em um só lugar
Parceria que Gera Lucro — cresça junto com a InfinityTech
```

### Prompt 9 — Catálogo de produtos (/lojistas) [Concluído]
```
Crie a seção "Nossos Produtos" em grid de cards. Para CADA produto, use a foto correspondente da pasta "/img" (não gerar imagem nova, não usar placeholder):
1. Película Protetora de Vidro — Proteção máxima contra riscos e impactos, alta definição
2. Película de Hidrogel — Autorrecuperável, se adapta perfeitamente à tela
3. Carregador Premium — Carregamento rápido, alta durabilidade, segurança total
4. Suporte Veicular para Carro — Fixação segura, ajuste 360°
5. Suporte Veicular para Moto — Resistente à chuva, reduz vibrações
6. Capas, Cabos, Fones sem fio e Power Banks (usar a foto do mockup geral de acessórios de "/img")

Cada card com botão "Consultar disponibilidade" → https://wa.me/5567992683435
```

### Prompt 10 — Como funciona a parceria + FAQ + Contato (/lojistas) [Concluído]
```
Crie 3 seções na rota /lojistas:

1) "Como Funciona a Parceria" — stepper com 5 passos:
Fale com a gente pelo WhatsApp e conte sobre sua loja → Receba a tabela de preços e catálogo completo → Faça seu pedido com condições especiais → Receba com entrega rápida → Reponha o estoque sempre que precisar.

2) FAQ em accordion:
Qual o pedido mínimo? — a definir.
Como funciona o frete/entrega? — Entrega rápida, condições a combinar conforme a região.
Emitem nota fiscal? — a definir.
Vocês têm tabela de preços fixa? — Fale no WhatsApp para receber a tabela atualizada.

3) Contato final: título "Vamos fazer negócio?", botão grande de WhatsApp → https://wa.me/5567992683435
```

### Prompt 11 — Footer compartilhado [Concluído]
```
Crie um footer compartilhado entre as rotas /assistencia-tecnica e /lojistas, usando a logo InfinityTech da pasta "/img":
- Logo + slogan "Distribuidor de Peças de Celular"
- Links rápidos para as duas trilhas (Assistência Técnica / Sou Lojista)
- Ícones de redes sociais (Instagram/Facebook, se houver link — deixar como placeholder de link caso não tenha)
- Os dois contatos de WhatsApp: Assistência (67) 99333-2306 · Lojistas (67) 99268-3435
- Copyright "© InfinityTech — Todos os direitos reservados"
```

### Prompt 12 — Ajuste fino de responsividade e SEO (rodar por último) [Concluído]
```
Revise o site inteiro (portal "/", "/assistencia-tecnica" e "/lojistas") para:
- Garantir responsividade total em mobile (breakpoints iguais aos usados na base do Orium)
- Confirmar que TODAS as imagens usadas vêm da pasta "/img" do projeto — nenhuma imagem gerada por IA, nenhum placeholder e nenhum stock photo externo deve restar no site
- Meta title de /assistencia-tecnica: "InfinityTech | Assistência Técnica para Celular"
- Meta title de /lojistas: "InfinityTech | Peças e Acessórios para Lojistas"
- Meta description geral: "Assistência técnica especializada para smartphones (Apple, Samsung, Xiaomi, Motorola, Realme) com diagnóstico gratuito, garantia e delivery. Também distribuímos peças e acessórios para lojistas."
- Open Graph com a logo InfinityTech (de "/img")
- Botão flutuante fixo de WhatsApp no canto inferior direito em cada rota, direcionando para o número correto de cada trilha
- Otimizar imagens (lazy loading) e verificar contraste de acessibilidade nas cores azul/vermelho sobre fundo branco
```

---

## 4. Informações que ainda preciso confirmar com você para fechar o conteúdo 100%

- [x] Endereço físico da loja: Av. Afonso Pena, 1753 - Centro, Campo Grande - MS, 79002-070
- [ ] Horário de funcionamento (para contato e footer)
- [ ] Instagram / Facebook (links)
- [ ] Se existem depoimentos reais de clientes (print, avaliação do Google) para usar como prova social
- [ ] Confirmar os nomes dos arquivos dentro da pasta `/img` do projeto (ou pelo menos quais imagens você já subiu lá), para eu poder referenciar o nome exato de cada arquivo em cada prompt em vez de descrição genérica
- [ ] Regras de pedido mínimo / frete / nota fiscal para a seção de FAQ da trilha Lojistas

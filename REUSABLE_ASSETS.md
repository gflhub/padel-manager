# Conceitos e Arquiteturas Universais (Agnósticos)

> Este arquivo compila abstrações arquiteturais, modelos conceptuais de dados e diretrizes de prompt (skills) que transcendes linguagens, frameworks ou tipos de bancos de dados. Seu objetivo é servir de norte para *qualquer* projeto de software construído daqui para frente.

---

## 1. Arquitetura de Dados Multi-Inquilino (SaaS Multi-Tenant)

Virtualmente qualquer sistema que escale precisará atender múltiplas "organizações" em uma base única (para reduzir custos de infraestrutura e facilitar as atualizações).

### O Padrão "Entidade Universal x Vínculo Local"
- **Entidades Globais Identificadoras**: Em vez de isolar ou clonar contas, cria-se uma tabela centralizada de Identidades (ex: *Perfis Globais*) vinculada ao sistema de autenticação. Apenas dados imutáveis ou centrais de identificação ficam aqui (Documentos, E-mail Global).
- **Vínculos Contextuais Dinâmicos**: A relação de um cliente com um Inquilino (Organização) sempre deve ser transacional. Uma tabela pivô (ex: *Membros da Organização*) armazena dados de estado local (ativo/inativo, papel, notas internas) e conecta a Identidade Universal ao Inquilino, evitando descompasso de senhas e sincronizações dolorosas de informações vitais (E-mail, Documentos).

---

## 2. Paradigmas de Interface de Usuário (UX/UI)

### O Padrão de "Visualização Dupla" (Dual-View Data Consumptiom)
Sistemas com pesada carga de leitura necessitam atender perfis de usuários distintos (Auditor vs. Operador de Chão de Fábrica):
- Forneça o **Modo Tabela/Lista** focado na alta densidade de dados e auditoria analítica.
- Forneça um toggle para o **Modo Cartões Visuais (Cards)** centrado na clareza tátil, operável em telas menores com prioritação de estado via cor (Badges de Status, Cores semânticas para urgência). Este layout é ideal para PDVs e workflows dinâmicos orientados à ação por clique fácil.

---

## 3. Workflow Contínuo: O Canal de "Feedback Invisível"

Para assegurar testes reais e adoção durante as fases cruciais de qualquer sistema:
- **Client Side (Coletor Fino)**: Use um pequeno acionador flutuante assíncrono. Solicite do usuário **apenas** o descritivo de texto humano ou screenshot base. Omissões não devem corromper ou estagnar a entrega.
- **Camada de Orquestração Técnica**: Configure no pipeline da API a inserção de metadados invisíveis à requisição (Logs capturados, URL da requisição, tipo/função do usuário e User-Agent) embalando e convertendo os dados em um 'Card de Bug' nativo em uma aplicação externa (Ex: *Linear*, *Jira*, *Trello*) de maneira agnóstica sem expor os tokens do ecossistema final ao navegador.

---

## 4. O "Guardião" de Mutação de Estado (Security Design)

Nenhum dado é modificado em um sistema (independente de ser via REST, GraphQL ou Server Actions) sem atravessar um padrão de checagem encapsulado e onipresente.

### Validar Invariantes de Contexto Abstrato (Guard Clauses)
Estabeleça de início funções validadoras de permissões que interceptam o fluxo e são as primeiras executadas. Estas abstrações devem exigir:
1. Identificação inequívoca do autor do request.
2. Afirmação em cascata (se Tentar Alterar "X", garantir não apenas que o autor pode alterar "X", mas de qual "Organização Y" originou).
3. Obter retornos formatados de IDs pré-validados para que as querys lógicas dependam estritamente da saída desta validação inicial.

---

## 5. Prompt Base Universal (Engenharia para IAs/Agentes)

Sempre que acionar assistentes sintéticos ou fluxos LLMs para *fundar um novo projeto do zero*, utilize a seguinte armadilha conceitual:

> **[TEMPLATE DE KICK-OFF DE PROJETO AGNÓSTICO]**
> "Você atuará como um Arquiteto de Software e Engenheiro Full-Stack líder no projeto [NOME DO PROJETO]. 
> As tecnologias que empregaremos para este sistema são [STACK C/ AS VERSÕES TIPO: LINGUAGEM, FRAMEWORK WEB, DB, UI FRAMEWORK].
>  
> Suas diretrizes supremas são:
> 1. **Componentização e CSS Restrito**: Nunca escreva blocos longos e manuais de estilização do zero se já possuirmos a biblioteca UI definida. Adapte através de classes globais ou tokens.
> 2. **Validação Fronteiriça**: Trate qualquer entrada de usuário através de esquemas (schemas), forçando que as tipagens sejam estáticas ou asseguradas de ponta a ponta.
> 3. **Paradigma de Conflito Nulo**: Crie interfaces considerando design responsivo/Mobile-First por premissa desde a elaboração da primeira view.
> 4. **Isolamento Lógico**: Entenda que a infraestrutura deve assumir premissas [SINGLE, SHARED OU ISOLATE TENANT] e atuar de modo a encapsular mutações via restrições rígidas.
> 5. Para qualquer nova feature complexa ou mutação perigosa, gere antes um plano pontual de aproximação se a intervenção passar de 100 linhas. Mãos à obra." 

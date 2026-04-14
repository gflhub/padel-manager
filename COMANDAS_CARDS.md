# Visualização de Comandas - Cards

## Visão Geral

A nova visualização de comandas em formato de cards permite uma gestão mais visual e intuitiva das comandas abertas.

## Funcionalidades

### 1. Visualização em Cards
- **Grid Responsivo**: Os cards se adaptam ao tamanho da tela (1-4 colunas)
- **Informações no Card**:
  - Nome do cliente (em destaque)
  - Número de itens
  - Valor total
  - Data/hora de abertura
  - Badge de status (Aberta)

### 2. Modal de Detalhes
Ao clicar em um card, abre-se um modal com:

#### Resumo
- Valor total em destaque com fundo colorido

#### Lista de Itens
- **Scroll Area**: Lista com altura máxima de 300px
- Para cada item:
  - Nome do produto
  - Preço unitário e quantidade
  - Controles de quantidade:
    - Botão **-** (diminuir)
    - Quantidade atual
    - Botão **+** (aumentar)
  - Valor total do item

#### Botões de Ação
- **Adicionar Item**: Abre modal de pesquisa
- **Cancelar Comanda**: Limpa a comanda (com confirmação)
- **Fechar Comanda**: Finaliza e processa pagamento

### 3. Adicionar Produtos

#### Modal de Pesquisa
- Campo de busca com **foco automático**
- Pesquisa em tempo real por:
  - Nome do produto
  - Categoria

#### Seleção de Produto
- **Primeiro produto destacado** visualmente (fundo azul)
- **Tecla Enter**: Adiciona o primeiro produto da lista
- **Click**: Adiciona o produto clicado
- Lista com scroll para múltiplos resultados

### 4. Cancelar Comanda

Ao clicar em "Cancelar Comanda":
- Exibe **AlertDialog** com confirmação
- Aviso que a ação é irreversível
- Botões:
  - "Voltar" (cancelar ação)
  - "Sim, Cancelar Comanda" (confirmar - botão vermelho)

### 5. Fechar Comanda

Ao clicar em "Fechar Comanda":
- Exibe modal com:
  - Valor total a pagar
  - Seletor de forma de pagamento:
    - PIX
    - Cartão
    - Dinheiro
  - Botões:
    - "Cancelar"
    - "Confirmar Pagamento"

### 6. Alternância de Visualização

No topo da página:
- Toggle entre **Cards** e **Tabela**
- Ícones visuais para cada modo
- Botão "Nova Comanda"

## Vantagens da Visualização em Cards

1. **Visual**: Mais fácil de visualizar múltiplas comandas
2. **Responsivo**: Se adapta a diferentes tamanhos de tela
3. **Intuitivo**: Click direto no card para abrir
4. **Rápido**: Pesquisa e adição de produtos otimizadas
5. **Seguro**: Confirmação antes de ações destrutivas

## Atalhos de Teclado

- **Enter** no modal de pesquisa: Adiciona o primeiro produto
- **Esc**: Fecha modais abertos

## Componentes Utilizados

- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Layout dos cards
- `Dialog` - Modais de detalhes, pesquisa e fechamento
- `AlertDialog` - Confirmação de cancelamento
- `ScrollArea` - Áreas com scroll customizado
- `Button`, `Input`, `Select` - Controles de formulário

## Fluxo de Uso

1. **Visualizar Comandas**: Navegue até `/admin/comandas`
2. **Abrir Comanda**: Click em "Nova Comanda", preencha dados do cliente
3. **Adicionar Produtos**: 
   - Click no card da comanda
   - Click em "Adicionar"
   - Pesquise o produto
   - Pressione Enter ou click no produto
4. **Ajustar Quantidade**: Use os botões + e - em cada item
5. **Fechar ou Cancelar**: Use os botões na parte inferior do modal

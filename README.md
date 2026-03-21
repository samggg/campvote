# 🔥 CampVote

Sistema de votação para acampamentos — funciona **100% offline**, sem necessidade de internet ou servidor.

---

## Sobre o projeto

O CampVote foi criado para resolver um problema real: realizar votações em eventos presenciais (acampamentos, retiros, encontros) onde não há acesso à internet. Os participantes votam em categorias como "Pessoa mais animada", "Melhor líder", "Mais prestativo", entre outras definidas pelo organizador.

Tudo fica armazenado localmente no navegador. Nenhum dado é enviado para nenhum servidor.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Vite + React + TypeScript |
| Banco de dados | Dexie.js (IndexedDB) |
| Estado global | Zustand |
| Roteamento | React Router DOM |
| Ícones | Lucide React |

---

## Funcionalidades

### Participante
- Login com **nome completo + data de nascimento** (sem senha, sem código) -- EM REVISÃO
- Visualiza categorias disponíveis com status (aberta / fechada / já votou)
- Vota em cada categoria com confirmação obrigatória
- Voto é **secreto e imutável** após confirmação
- Barra de progresso mostrando categorias votadas

### Admin
- Login com PIN numérico seguro -- EM REVISÃO
- **Dashboard** com estatísticas em tempo real (votos totais, participantes, pendentes)
- **Controle de votação** — abre e fecha cada categoria individualmente
- **Configuração** (Setup):
  - Importar participantes em massa via arquivo CSV
  - Adicionar participantes manualmente
  - Criar e remover categorias
  - Definir ou alterar o PIN de admin
  - Resetar votos ou fazer reset completo do banco
- **Resultados** — ranking por categoria com barras de progresso e troféus
- **Exportação** — JSON para download, compartilhamento via app nativo, QR Code do resumo

---

## Segurança offline

- Cada voto recebe um hash único `SHA-256(voterId + categoryId + deviceId + timestamp)`
- Bloqueio duplo: por usuário e por dispositivo por categoria
- PIN do admin armazenado como hash SHA-256 no localStorage
- Usuário não pode votar em si mesmo
- Voto não pode ser alterado após confirmação
- AuditLog imutável de todas as ações

---

## Estrutura do projeto

```
src/
├── db/
│   └── database.ts          # Instância Dexie + schema das tabelas
├── types/
│   └── index.ts             # Interfaces TypeScript (User, Category, Vote...)
├── repositories/            # Acesso direto ao banco (sem lógica de negócio)
├── services/
│   ├── AuthService.ts       # Login participante e admin
│   ├── VoteService.ts       # Validação e registro de votos
│   ├── CategoryService.ts   # Gerenciamento de categorias
│   └── ExportService.ts     # Exportação de resultados
├── utils/
│   ├── hash.ts              # SHA-256 via Web Crypto API
│   └── device.ts            # Fingerprint do dispositivo
├── store/
│   └── authStore.ts         # Estado global de autenticação (Zustand)
├── pages/
│   ├── Login.tsx            # Tela de entrada do participante
│   ├── AdminLogin.tsx       # Teclado PIN do admin
│   ├── Categories.tsx       # Lista de categorias do participante
│   ├── Vote.tsx             # Tela de votação por categoria
│   ├── Success.tsx          # Confirmação de voto registrado
│   └── admin/
│       ├── Dashboard.tsx    # Painel principal do admin
│       ├── Setup.tsx        # Configuração (participantes, categorias, PIN)
│       ├── Participants.tsx # Gerenciar participantes
│       ├── Results.tsx      # Resultados por categoria
│       └── Export.tsx       # Exportar resultados
└── components/              # Componentes reutilizáveis
```

---

## Instalação e execução

### Pré-requisitos
- Node.js 18 ou superior
- npm 9 ou superior

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/campvote.git
cd campvote

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` no navegador.

### Build para produção

```bash
npm run build
```

O conteúdo da pasta `dist/` pode ser servido por qualquer servidor HTTP estático — inclusive offline via rede local.

---

## Uso no acampamento

### Antes do evento

1. Acesse o app como **admin** (botão "Acesso de organizador" na tela de login)
2. Vá em **Configuração → PIN admin** e defina um PIN seguro
3. Vá em **Configuração → Categorias** e crie as categorias de votação
4. Vá em **Configuração → Participantes** e importe o CSV com todos os nomes

### Formato do CSV de participantes

```csv
Nome,DataNascimento
Ana Silva,15/03/2000
Bruno Costa,22/07/1998
Maria Clara Santos,08/11/2001
```

> Aceita os formatos `DD/MM/AAAA` e `AAAA-MM-DD`.
> Separe por vírgula ou ponto-e-vírgula.

### Durante o evento

1. Conecte todos os celulares na mesma rede Wi-Fi local (sem internet)
2. Sirva o app na rede com:
   ```bash
   npm run preview -- --host
   ```
3. Os participantes acessam pelo IP exibido no terminal (ex: `http://192.168.0.10:4173`)
4. No **Dashboard**, abra as categorias na hora certa
5. Após o encerramento, veja os resultados em **Resultados**

### Após a votação

- Exporte os resultados em **JSON** para arquivar
- Use o **QR Code** para mostrar os vencedores na tela
- Compartilhe via WhatsApp ou e-mail com o botão de compartilhamento

---

## Login dos participantes

O participante entra com:
- **Nome completo** (sem distinção de maiúsculas ou acentos)
- **Data de nascimento**

Não há senha nem código para memorizar — apenas informações que a pessoa já sabe.

---

## Regras de negócio

- Cada participante vota **uma única vez** por categoria
- O voto é **secreto** — o admin vê apenas contagens agregadas, nunca quem votou em quem
- Ninguém pode votar **em si mesmo**
- Votos só são aceitos enquanto a categoria estiver **aberta**
- Após confirmar, o voto **não pode ser alterado**
- Um mesmo dispositivo não pode registrar dois votos na mesma categoria

---

## Licença

MIT — use, modifique e distribua livremente.
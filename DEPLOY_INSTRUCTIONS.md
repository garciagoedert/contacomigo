# Instruções de Deploy - Trilha Comigo Finance App

Este documento contém as instruções para fazer o deploy da aplicação no Firebase Hosting e configurar a integração com o Asaas.

## Pré-requisitos

- Node.js instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Conta no Firebase
- Conta no Asaas (https://www.asaas.com)

## 1. Deploy do Hosting (Frontend)

```bash
firebase deploy --only hosting
```

Isso fará o deploy dos arquivos HTML, CSS e JavaScript para o Firebase Hosting.

## 2. Configurar Integração com Asaas

### 2.1 Obter Chave de API

1. Acesse o painel do Asaas: https://www.asaas.com
2. Vá em **Configurações** → **Integrações** → **API Keys**
3. Copie sua chave de API de produção

### 2.2 Configurar Cloud Functions (IMPORTANTE!)

**A chave de API NÃO deve estar no código!** Use Firebase Functions Config para armazená-la de forma segura:

```bash
firebase functions:config:set asaas.api_key="aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjgwZmJiNWI3LWM5Y2QtNGQ4My05YjM5LTc4YTUyYzQ3MTdiOTo6JGFhY2hfYTVlYTk0OTMtNjNjYi00NGQyLTk1YTktNjU4MjgxNzQyMDQ"
```

Para verificar se foi configurado corretamente:

```bash
firebase functions:config:get
```

**Nota**: O código em `functions/index.js` já está configurado para buscar a chave de forma segura usando `functions.config().asaas.api_key`.

> 📖 Para mais detalhes sobre configuração segura, consulte [CONFIGURACAO_SEGURA.md](file:///Users/goedert/Documents/GITHUB/FinanceApp/CONFIGURACAO_SEGURA.md)

## 3. Deploy das Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Isso criará a Cloud Function `createAsaasSubscription` que será acessível em:
   `https://us-central1-financeapp-6da16.cloudfunctions.net/createAsaasSubscription`

## 4. Testar em Ambiente Local

Para testar localmente antes do deploy:

```bash
# Terminal 1 - Emulador de Functions
firebase emulators:start --only functions

# Terminal 2 - Servidor local
python3 -m http.server 8080
```

Acesse `http://localhost:8080` e teste o fluxo de checkout.

**Nota**: Para testes locais, atualize a URL da Cloud Function em `checkout.html` para:
   `http://localhost:5001/financeapp-6da16/us-central1/createAsaasSubscription`

## 5. Verificação

Após o deploy:

1. Acesse a URL do seu app
2. Faça login
3. Vá para a página de checkout
4. Clique em "Assinar Agora"
5. Verifique se você é redirecionado para o checkout do Asaas
6. Complete um pagamento de teste
7. Verifique se o status Premium é ativado no app

✅ **Pronto!** Com isso, sua integração com Asaas estará segura e rodando no backend do Firebase.

# Guia de Configuração Segura - Chave API Asaas

Este guia mostra como configurar a chave de API do Asaas de forma segura usando Firebase Functions Config.

## 🔒 Por que não colocar chaves no código?

- ❌ Código vai para o Git/GitHub (expõe a chave publicamente)
- ❌ Qualquer pessoa com acesso ao repositório vê a chave
- ❌ Dificulta usar chaves diferentes para desenvolvimento/produção
- ✅ **Solução**: Firebase Functions Config

## 📝 Passo a Passo

### 1. Configurar a chave no Firebase

No terminal, execute:

```bash
firebase functions:config:set asaas.api_key="aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjgwZmJiNWI3LWM5Y2QtNGQ4My05YjM5LTc4YTUyYzQ3MTdiOTo6JGFhY2hfYTVlYTk0OTMtNjNjYi00NGQyLTk1YTktNjU4MjgxNzQyMDQ"
```

✅ Isso armazena a chave de forma segura no Google Cloud, acessível apenas pelas Cloud Functions.

### 2. Verificar a configuração

Para ver todas as configurações:

```bash
firebase functions:config:get
```

Você deve ver:

```json
{
  "asaas": {
    "api_key": "aact_prod_..."
  }
}
```

### 3. Fazer Deploy

Agora faça o deploy das functions:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

As functions agora terão acesso à chave de API sem ela estar no código!

## 🧪 Teste Local

Para testar localmente, você precisa baixar as configurações:

```bash
firebase functions:config:get > functions/.runtimeconfig.json
```

**IMPORTANTE**: Adicione esse arquivo ao `.gitignore` (já está configurado)

Agora você pode testar localmente:

```bash
firebase emulators:start --only functions
```

## 🔄 Ambientes Diferentes

Se você quiser usar chaves diferentes para desenvolvimento e produção:

### Desenvolvimento (Sandbox do Asaas)
```bash
firebase functions:config:set asaas.api_key="SUA_CHAVE_SANDBOX"
```

### Produção
```bash
firebase use prod  # mude para o projeto de produção
firebase functions:config:set asaas.api_key="SUA_CHAVE_PROD"
firebase use default  # volte para desenvolvimento
```

## 🔍 Como Funciona no Código

No arquivo `functions/index.js`, a chave é acessada assim:

```javascript
const ASAAS_API_KEY = functions.config().asaas?.api_key;
```

- `functions.config()` - acessa as configurações do Firebase
- `.asaas` - namespace que você criou
- `.api_key` - nome da chave

## ⚠️ Importante

1. **Nunca comite** arquivos `.runtimeconfig.json`
2. **Não exponha** a chave em logs ou mensagens de erro para o cliente
3. **Rotacione** a chave periodicamente para maior segurança
4. **Use chaves diferentes** para desenvolvimento e produção

## 📋 Checklist de Segurança

- [x] Chave configurada via Firebase Functions Config
- [x] Código não contém chave hardcoded
- [x] `.runtimeconfig.json` está no `.gitignore`
- [x] Validação de chave no código (erro se não configurada)
- [ ] Deploy realizado com sucesso
- [ ] Testado em produção

## 🆘 Troubleshooting

### Erro: "ASAAS_API_KEY is undefined"

**Solução**: Você esqueceu de configurar a chave. Execute:
```bash
firebase functions:config:set asaas.api_key="SUA_CHAVE"
firebase deploy --only functions
```

### Erro ao testar localmente

**Solução**: Baixe as configurações:
```bash
firebase functions:config:get > functions/.runtimeconfig.json
```

### Chave não está funcionando após deploy

**Solução**: Verifique se configurou para o projeto correto:
```bash
firebase projects:list
firebase use SEU_PROJETO
firebase functions:config:get
```

## ✅ Resumo

Agora sua chave de API está armazenada de forma segura! 🔐

- ✅ Não está no código
- ✅ Não vai para o Git
- ✅ Apenas o Firebase tem acesso
- ✅ Pode usar chaves diferentes por ambiente

# 🚀 Instruções de Deploy - Cloud Functions

Para finalizar a migração segura do sistema de pagamentos, você precisa fazer o deploy da Cloud Function que criamos.

## Pré-requisitos

Certifique-se de ter o Firebase CLI instalado e estar logado:
```bash
npm install -g firebase-tools
firebase login
```

## Passo a Passo

1. **Instalar dependências da função:**
   Abra o terminal na pasta do projeto e execute:
   ```bash
   cd functions
   npm install
   cd ..
   ```

2. **Fazer o Deploy:**
   Execute o comando abaixo para enviar a função para o Google Cloud:
   ```bash
   firebase deploy --only functions
   ```

3. **Verificar a URL:**
   Após o deploy, o terminal mostrará a URL da função (Function URL).
   Ela deve ser algo como:
   `https://us-central1-financeapp-6da16.cloudfunctions.net/createStripeCheckoutSession`

   **Nota:** O arquivo `checkout.html` já está configurado com essa URL padrão. Se a sua URL for diferente, atualize a constante `FUNCTION_URL` no arquivo `checkout.html`.

## Testando Localmente (Opcional)

Se quiser testar antes de fazer o deploy:

1. Inicie o emulador:
   ```bash
   firebase emulators:start --only functions
   ```

2. Atualize o `checkout.html` para usar a URL local (comentada no código):
   `http://localhost:5001/financeapp-6da16/us-central1/createStripeCheckoutSession`

---

✅ **Pronto!** Com isso, sua integração com Stripe estará segura e rodando no backend do Firebase.

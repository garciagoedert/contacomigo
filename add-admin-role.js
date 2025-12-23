// Script para adicionar role de admin a um usuário
// Execute com: node add-admin-role.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Você precisa baixar isso do Firebase Console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addAdminRole(userEmail) {
    try {
        // Buscar usuário por email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', userEmail)
            .get();

        if (usersSnapshot.empty) {
            console.log(`❌ Usuário com email ${userEmail} não encontrado.`);
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;

        // Atualizar role para admin
        await db.collection('users').doc(userId).update({
            role: 'admin'
        });

        console.log(`✅ Role de admin adicionada ao usuário ${userEmail} (UID: ${userId})`);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// SUBSTITUA PELO EMAIL DO USUÁRIO QUE DEVE SER ADMIN
const adminEmail = 'paulo@southsea.com.br'; // <-- ALTERE AQUI

addAdminRole(adminEmail)
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

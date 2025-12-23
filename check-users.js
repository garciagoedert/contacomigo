// Script para verificar usuários no Firestore
const admin = require('firebase-admin');

// Inicializar com credenciais padrão
admin.initializeApp();

const db = admin.firestore();

async function checkUsers() {
    try {
        console.log('🔍 Buscando usuários no Firestore...\n');

        const usersSnapshot = await db.collection('users').get();

        console.log(`📊 Total de documentos na coleção 'users': ${usersSnapshot.size}\n`);

        if (usersSnapshot.empty) {
            console.log('❌ Nenhum usuário encontrado na coleção "users"');
            return;
        }

        console.log('👥 Primeiros 5 usuários:\n');

        let count = 0;
        usersSnapshot.forEach(doc => {
            if (count < 5) {
                const data = doc.data();
                console.log(`${count + 1}. UID: ${doc.id}`);
                console.log(`   Email: ${data.email || 'N/A'}`);
                console.log(`   Nome: ${data.firstName || 'N/A'}`);
                console.log(`   Plano: ${data.plan || 'N/A'}`);
                console.log(`   Status: ${data.subscriptionStatus || 'N/A'}`);
                console.log(`   Role: ${data.role || 'N/A'}`);
                console.log('');
                count++;
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
    } finally {
        process.exit(0);
    }
}

checkUsers();

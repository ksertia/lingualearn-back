/**
 * Script pour fermer toutes les connexions MySQL de l'application
 * À exécuter avant de redémarrer le serveur
 */

const mysql = require('mysql2/promise');

async function killAllConnections() {
    const connection = await mysql.createConnection({
        host: '213.32.120.11',
        port: 3306,
        user: 'root',
        password: 'Sertoi1029',
        database: 'learning-db'
    });

    try {
        console.log('🔍 Récupération des connexions actives...');
        
        // Récupérer toutes les connexions actives
        const [processes] = await connection.query(`
            SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE
            FROM information_schema.PROCESSLIST
            WHERE DB = 'learning-db' 
            AND USER = 'root'
            AND ID != CONNECTION_ID()
        `);

        console.log(`📊 ${processes.length} connexion(s) trouvée(s)`);

        if (processes.length === 0) {
            console.log('✅ Aucune connexion à fermer');
            return;
        }

        // Afficher les connexions
        console.table(processes);

        // Tuer chaque connexion
        for (const process of processes) {
            try {
                await connection.query(`KILL ${process.ID}`);
                console.log(`✅ Connexion ${process.ID} fermée`);
            } catch (error) {
                console.log(`⚠️  Impossible de fermer la connexion ${process.ID}: ${error.message}`);
            }
        }

        console.log('✅ Toutes les connexions ont été fermées');
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await connection.end();
    }
}

killAllConnections().catch(console.error);

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Statik dosyaları kesin yol ile sunucuya tanıtıyoruz
app.use(express.static(path.join(__dirname)));

const io = new Server(server, {
    cors: { origin: "*" }
});

const lobbies = {}; // Aktif tüm lobileri burada saklayacağız

io.on('connection', (socket) => {
    console.log('==> Yeni bir oyuncu bağlandı! Socket ID:', socket.id);

    // 1. Lobi Oluşturma Mantığı
    socket.on('createLobby', (username) => {
        // 5 haneli rastgele kod üret
        const lobbyCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        
        lobbies[lobbyCode] = {
            players: [{ id: socket.id, name: username, ready: false }]
        };

        console.log(`[LOBİ OLUŞTURULDU] Kod: ${lobbyCode} | Kuran: ${username}`);
        
        socket.join(lobbyCode);
        socket.emit('lobbyCreated', { lobbyCode, players: lobbies[lobbyCode].players });
    });

    // 2. Lobiye Katılma Mantığı
    socket.on('joinLobby', ({ lobbyCode, username }) => {
        // Gelen kodu temizle (boşlukları sil ve büyük harfe çevir)
        const cleanCode = lobbyCode.trim().toUpperCase();
        
        console.log(`[KATILMA İSTEĞİ] Gelen Kod: "${lobbyCode}" | Temizlenen Kod: "${cleanCode}" | Oyuncu: ${username}`);
        console.log('Mevcut Aktif Lobiler:', Object.keys(lobbies));

        if (lobbies[cleanCode]) {
            if (lobbies[cleanCode].players.length >= 5) {
                console.log(`[REDDEDİLDİ] Lobi dolu. Kod: ${cleanCode}`);
                socket.emit('errorMsg', 'Lobi dolu!');
                return;
            }
            
            // Eğer oyuncu zaten lobideyse tekrar ekleme
            const alreadyIn = lobbies[cleanCode].players.some(p => p.id === socket.id);
            if (!alreadyIn) {
                lobbies[cleanCode].players.push({ id: socket.id, name: username, ready: false });
            }
            
            socket.join(cleanCode);
            console.log(`[BAŞARILI] ${username} lobiye girdi. Kod: ${cleanCode}`);

            // Lobideki HERKESE güncel listeyi fırlatıyoruz
            io.to(cleanCode).emit('lobbyUpdated', { 
                lobbyCode: cleanCode, 
                players: lobbies[cleanCode].players 
            });
        } else {
            console.log(`[BAŞARILI DEĞİL] Lobi bulunamadı. Aranan Kod: "${cleanCode}"`);
            socket.emit('errorMsg', 'Lobi bulunamadı!');
        }
    });

    // 3. Hazır Durumu Güncelleme
    socket.on('toggleReady', ({ lobbyCode, readyStatus }) => {
        const cleanCode = lobbyCode.trim().toUpperCase();
        if (lobbies[cleanCode]) {
            const player = lobbies[cleanCode].players.find(p => p.id === socket.id);
            if (player) {
                player.ready = readyStatus;
                io.to(cleanCode).emit('lobbyUpdated', { 
                    lobbyCode: cleanCode, 
                    players: lobbies[cleanCode].players 
                });
            }
        }
    });

    // 4. Bağlantı Koptuğunda
    socket.on('disconnect', () => {
        console.log('==> Bir oyuncunun bağlantısı koptu. ID:', socket.id);
        for (const lobbyCode in lobbies) {
            const lobby = lobbies[lobbyCode];
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                console.log(`[AYRILDI] ${lobby.players[playerIndex].name} lobiden düştü. Kod: ${lobbyCode}`);
                lobby.players.splice(playerIndex, 1);
                
                if (lobby.players.length === 0) {
                    console.log(`[LOBİ SİLİNDİ] Kimse kalmadığı için lobi silindi. Kod: ${lobbyCode}`);
                    delete lobbies[lobbyCode];
                } else {
                    io.to(lobbyCode).emit('lobbyUpdated', { 
                        lobbyCode, 
                        players: lobby.players 
                    });
                }
                break;
            }
        }
    });
});

server.listen(3000, () => {
    console.log('====================================================');
    console.log('Sunucu başlatıldı! http://localhost:3000 adresinden girebilirsin.');
    console.log('====================================================');
});
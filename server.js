const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io'); // Modern socket.io başlatma yöntemi

const app = express();
const server = http.createServer(app);

// Canlı sunucu (Railway) için en kararlı WebSocket ayarları
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'] // Hem polling hem websocket desteği ver
});

// Statik dosyaları (html, css, js) dışarıya aç
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- LOBİ YÖNETİM SİSTEMİ (MANTIK) ---
let activeLobbies = {}; // Aktif lobileri hafızada tutacak nesne

// Rastgele Lobi Kodu Üretici (Örn: 362GR)
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`=> Yeni bir oyuncu bağlandı! Sunucu ID: ${socket.id}`);

    // 1. LOBİ OLUŞTURMA (Lobi Kur)
    socket.on('create-lobby', (data) => {
        const lobbyCode = generateLobbyCode();
        
        activeLobbies[lobbyCode] = {
            id: lobbyCode,
            creator: data.playerName || 'Oyuncu',
            players: [{ id: socket.id, name: data.playerName || 'Oyuncu', ready: false }]
        };

        socket.join(lobbyCode);
        
        // Kuran oyuncuya lobi bilgilerini gönder
        socket.emit('lobby-created', activeLobbies[lobbyCode]);
        console.log(`[LOBİ OLUŞTURULDU] Kod: ${lobbyCode} | Kuran: ${data.playerName}`);
    });

    // 2. LOBİYE KATILMA (Lobiye Katıl)
    socket.on('join-lobby', (data) => {
        const lobbyCode = data.lobbyCode ? data.lobbyCode.toUpperCase() : '';
        const lobby = activeLobbies[lobbyCode];

        if (lobby) {
            if (lobby.players.length >= 2) {
                socket.emit('error-message', 'Lobi tamamen dolu!');
                return;
            }

            lobby.players.push({ id: socket.id, name: data.playerName || 'Oyuncu 2', ready: false });
            socket.join(lobbyCode);

            // Lobideki herkese yeni oyuncunun geldiğini bildir
            io.to(lobbyCode).emit('lobby-updated', lobby);
            console.log(`[KATILMA İSTEĞİ] Kod: ${lobbyCode} | Oyuncu: ${data.playerName}`);
        } else {
            socket.emit('error-message', 'Lobi bulunamadı! Kodu kontrol edin.');
        }
    });

    // 3. HAZIR DURUMU DEĞİŞTİRME
    socket.on('toggle-ready', (data) => {
        const lobby = activeLobbies[data.lobbyCode];
        if (lobby) {
            const player = lobby.players.find(p => p.id === socket.id);
            if (player) {
                player.ready = !player.ready;
                io.to(data.lobbyCode).emit('lobby-updated', lobby);
            }
        }
    });

    // 4. BAĞLANTI KOPMA DURUMU
    socket.on('disconnect', () => {
        console.log(`=> Bir oyuncunun bağlantısı koptu. Sunucu ID: ${socket.id}`);
        
        // Oyuncunun bulunduğu lobiyi bul ve temizle
        for (const code in activeLobbies) {
            const lobby = activeLobbies[code];
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                lobby.players.splice(playerIndex, 1);
                
                if (lobby.players.length === 0) {
                    delete activeLobbies[code];
                    console.log(`[LOBİ SİLİNDİ] Kimse kalmadığı için lobi silindi. Kod: ${code}`);
                } else {
                    io.to(code).emit('lobby-updated', lobby);
                }
                break;
            }
        }
    });
});

// Railway port entegrasyonu
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[BAŞARILI] Sunucu ${PORT} portunda aktif.`);
});
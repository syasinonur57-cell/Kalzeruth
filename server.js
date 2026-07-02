const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS izinleriyle Socket.io'yu başlat
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Sunucunun tüm klasördeki dosyaları (html, css, js) görebilmesini sağla
app.use(express.static(__dirname));

// Ana sayfaya girildiğinde index.html'i gönder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- LOBİ VE SOCKET.IO MANTIĞI ---
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı: ' + socket.id);

    // Kendi mevcut lobi kurma/katılma kodlarını tam bu araya ekleyebilirsin.
    // Örnek standart test mantığı:
    socket.on('createRoom', (data) => {
        console.log('Lobi kuruluyor:', data);
        socket.join(data.roomId || 'test-room');
        socket.emit('roomCreated', { status: 'success', roomId: data.roomId });
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı: ' + socket.id);
    });
});

// Canlı sunucu port ayarı
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Sunucu ${PORT} portunda aktif! Odalar kurulmaya hazır.`);
    console.log(`====================================================`);
});
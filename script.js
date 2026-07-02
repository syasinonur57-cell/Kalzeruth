const socket = io();

// Elemanlar
const btnCreate = document.getElementById('btn-create');
const btnJoin = document.getElementById('btn-join');
const btnReady = document.getElementById('btn-ready');
const btnLeave = document.getElementById('btn-leave');

const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const lobbyCodeDisplay = document.getElementById('lobby-code-display');
const usernameInput = document.getElementById('username');
const lobbyCodeInput = document.getElementById('lobby-code-input');
const playerListDiv = document.getElementById('player-list');

let currentLobbyCode = null;
let myReadyStatus = false;

// KATIL / KODA KATIL BUTONU
btnJoin.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const lobbyCode = lobbyCodeInput.value.trim().toUpperCase();

    if (lobbyCodeInput.classList.contains('hidden')) {
        lobbyCodeInput.classList.remove('hidden');
        lobbyCodeInput.focus();
        btnJoin.innerText = "KODA KATIL";
        return;
    }

    if (username === "" || lobbyCode === "") {
        alert("Lütfen hem Oyuncu Adı hem de Lobi Kodu girin!");
        return;
    }

    // Doğrudan sunucuya istek atıyoruz
    socket.emit('joinLobby', { lobbyCode, username });
});

// LOBİ KUR BUTONU
btnCreate.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username === "") {
        alert("Lütfen bir Oyuncu Adı girin!");
        return;
    }
    socket.emit('createLobby', username);
});

// Sunucudan gelen cevap: Lobi başarıyla kuruldu
socket.on('lobbyCreated', ({ lobbyCode, players }) => {
    currentLobbyCode = lobbyCode;
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    lobbyCodeDisplay.innerText = "#" + lobbyCode;
    updatePlayerList(players);
});

// Sunucudan gelen ortak güncelleme (Biri girdiğinde veya hazır verdiğinde)
socket.on('lobbyUpdated', ({ lobbyCode, players }) => {
    currentLobbyCode = lobbyCode; // Kodu senkronize et
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    lobbyCodeDisplay.innerText = "#" + lobbyCode;
    updatePlayerList(players);
});

// HAZIR VER BUTONU
btnReady.addEventListener('click', () => {
    myReadyStatus = !myReadyStatus;
    btnReady.innerText = myReadyStatus ? "HAZIR IPTAL" : "HAZIR VER";
    btnReady.style.backgroundColor = myReadyStatus ? "#ff4655" : "#107c41";
    
    socket.emit('toggleReady', { lobbyCode: currentLobbyCode, readyStatus: myReadyStatus });
});

// LOBİDEN ÇIK
btnLeave.addEventListener('click', () => {
    window.location.reload();
});

socket.on('errorMsg', (msg) => {
    alert(msg);
});

function updatePlayerList(players) {
    playerListDiv.innerHTML = ""; // İçeriyi tamamen temizle
    
    // 1. Lobideki gerçek oyuncuları senin tasarımla ekrana basıyoruz
    players.forEach(player => {
        const slot = document.createElement('div');
        // Eğer oyuncu bensem yanına 'active' sınıfını da ekle
        slot.className = `player-slot ${player.id === socket.id ? 'active' : ''}`;
        
        slot.innerHTML = `
            <span class="player-name">${player.name} ${player.id === socket.id ? ' (SEN)' : ''}</span>
            <span class="player-status ${player.ready ? 'ready' : ''}" style="color: ${player.ready ? '#00ff7b' : '#ffb700'}">
                ${player.ready ? 'HAZIR' : 'BEKLİYOR'}
            </span>
        `;
        playerListDiv.appendChild(slot);
    });
    
    // 2. Boş kalan slotları "Oyuncu Bekleniyor..." olarak 5 kişiye tamamlıyoruz
    for (let i = players.length; i < 5; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = "player-slot empty";
        emptySlot.innerHTML = `
            <span class="player-name">Oyuncu Bekleniyor...</span>
            <span class="player-status">--</span>
        `;
        playerListDiv.appendChild(emptySlot);
    }
}
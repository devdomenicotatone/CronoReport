// login.js

// DEV MODE — Se su localhost, salta il login
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.location.href = 'index.html';
    // Blocca esecuzione del resto dello script
    throw new Error('DEV_MODE: redirect to index.html');
}

// Ottieni l'elemento del pulsante di login
const googleLoginBtn = document.getElementById('google-login-btn');

// Aggiungi l'event listener per il click
googleLoginBtn.addEventListener('click', () => {
    // Disabilita il pulsante per evitare clic multipli
    googleLoginBtn.disabled = true;

    // Inizializza il provider di Google
    const provider = new firebase.auth.GoogleAuthProvider();

    // Aggiungi gli ambiti necessari per le API di Google
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/documents');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');

    // Avvia l'autenticazione con popup
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // Login riuscito
            const user = result.user;

            // Ottieni il token di accesso OAuth di Google
            const credential = result.credential;
            const accessToken = credential.accessToken;

            // Memorizza il token di accesso per l'utilizzo nelle API di Google
            localStorage.setItem('googleAccessToken', accessToken);

            // Reindirizza alla pagina principale
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Errore durante l\'autenticazione:', error);
            // Mostra un messaggio di errore elegante
            Swal.fire({
                icon: 'error',
                title: 'Errore di Autenticazione',
                text: 'Si è verificato un errore durante l\'accesso. Riprova più tardi.',
                confirmButtonText: 'OK'
            });
            // Riabilita il pulsante in caso di errore
            googleLoginBtn.disabled = false;
        });
});

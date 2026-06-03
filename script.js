// --- Configuración e Inicialización de Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1xKNr--giiPMvWaLaw-CngDQQJQUDK90",
  authDomain: "gis-piscis.firebaseapp.com",
  projectId: "gis-piscis",
  storageBucket: "gis-piscis.firebasestorage.app",
  messagingSenderId: "704578289004",
  appId: "1:704578289004:web:ba90ffc0d978ae21030749"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const gisCollection = collection(db, "gis");

// Variables de Estado de la Aplicación
const priceDisplay = document.getElementById('display-price');
const portionsDisplay = document.getElementById('spec-portions');
const toast = document.getElementById('cart-toast');
let isAdmin = false;
let currentEditTargetId = '';
let currentEditField = '';
let currentEditFileInput = '';

// Control del Cambio de Variantes de Tamaño (Precio y Porciones Dinámicas)
document.querySelectorAll('input[name="size"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target;
        const basePrice = parseFloat(target.dataset.price);
        const portions = target.dataset.portions;
        
        priceDisplay.textContent = `S/. ${basePrice.toFixed(2)}`;
        portionsDisplay.textContent = portions;
    });
});

// Control Visual de la Galería de Miniaturas
function handleThumbClick(element, detailName, targetId, fieldName, fileInputId) {
    if (isAdmin) {
        openImageEditor(targetId, fieldName, fileInputId);
        return;
    }

    document.querySelectorAll('.thumb-item').forEach(thumb => thumb.classList.remove('active'));
    element.classList.add('active');
    
    const thumbImg = element.querySelector('img');
    if (thumbImg) {
        updateImageDisplay('main-display', thumbImg.src);
    }
    
    console.log(`Perspectiva visual del producto cambiada a: ${detailName}`);
}

// --- Funcionalidad del Modo Administrador ---
function toggleAdminMode() {
    if (isAdmin) {
        signOut(auth).then(() => {
            showAdminToast('Modo Administrador Desactivado');
        }).catch((error) => console.error("Error al cerrar sesión:", error));
    } else {
        document.getElementById('login-modal').classList.add('show');
        document.getElementById('admin-email').value = '';
        document.getElementById('admin-password').value = '';
        document.getElementById('login-error').style.display = 'none';
    }
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
}

async function authenticateAdmin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorDisplay = document.getElementById('login-error');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeLoginModal();
        showAdminToast('¡Modo Administrador Activado!');
    } catch (error) {
        errorDisplay.textContent = 'Credenciales incorrectas o usuario no encontrado.';
        errorDisplay.style.display = 'block';
        console.error("Error de autenticación: ", error);
    }
}

// Mantener la sesión activa incluso al recargar la página
onAuthStateChanged(auth, (user) => {
    isAdmin = !!user;
    document.body.classList.toggle('admin-mode', isAdmin);
});

function showAdminToast(msg) {
    const toastSpan = toast.querySelector('span');
    toastSpan.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function openImageEditor(targetId, fieldName, fileInputId) {
    if (!isAdmin) return;
    currentEditTargetId = targetId;
    currentEditField = fieldName;
    currentEditFileInput = fileInputId;
    
    document.getElementById('image-url-input').value = '';
    document.getElementById('image-edit-modal').classList.add('show');
}

function closeImageEditor() {
    document.getElementById('image-edit-modal').classList.remove('show');
}

async function saveImageUrl() {
    const inputString = document.getElementById('image-url-input').value.trim();
    if (!inputString) {
        alert('Por favor ingrese un enlace o código válido.');
        return;
    }

    let url = "";
    // Extractor Inteligente: Busca enlaces directos dentro del texto pegado (.jpg, .jpeg, .png, .gif, .webp)
    const regex = /(https?:\/\/[^\s"'>\]\)]+\.(?:jpg|jpeg|png|gif|webp))/i;
    const match = inputString.match(regex);

    if (match && match[1]) {
        url = match[1]; // Se encontró el enlace directo exacto
    } else if (inputString.startsWith('http')) {
        url = inputString; // Es un enlace web genérico, se intentará usar
    } else {
        alert('No se detectó un enlace de imagen válido. Intente copiar el "Enlace directo", "Markdown" o "HTML".');
        return;
    }

    const targetElement = document.getElementById(currentEditTargetId);
    targetElement.innerHTML = `<span style="font-size: 1rem; color: var(--accent-terracotta);">Guardando...</span>`;

    try {
        const docRef = doc(db, "gis", "siteContent");
        await setDoc(docRef, { [currentEditField]: url }, { merge: true });

        updateImageDisplay(currentEditTargetId, url);
        showAdminToast('¡Enlace de imagen guardado exitosamente!');
        closeImageEditor();
    } catch (error) {
        console.error("Error al guardar la URL: ", error);
        if (error.code === 'permission-denied') {
            showAdminToast('Error: Permisos bloqueados en Firebase (Reglas)');
        } else {
            showAdminToast('Error al guardar el enlace');
        }
        closeImageEditor();
    }
}

function triggerCurrentUpload() {
    document.getElementById(currentEditFileInput).click();
    closeImageEditor();
}

async function handleImageUpload(event, targetId) {
    const file = event.target.files[0];
    if (!file) return;

    const targetElement = document.getElementById(targetId);
    targetElement.innerHTML = `<span style="font-size: 1rem; color: var(--accent-terracotta);">Subiendo...</span>`;

    try {
        // 1. Subir la imagen física a Firebase Storage
        const storageRef = ref(storage, `images/${targetId}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        // 2. Guardar la URL en la colección 'gis', documento 'siteContent'
        const docRef = doc(db, "gis", "siteContent");
        let fieldName = '';
        if (targetId === 'main-display') fieldName = 'productImgUrl';
        else if (targetId === 'chef-display') fieldName = 'chefImgUrl';
        else if (targetId === 'thumb-display-1') fieldName = 'thumbImgUrl1';
        else if (targetId === 'thumb-display-2') fieldName = 'thumbImgUrl2';
        else if (targetId === 'thumb-display-3') fieldName = 'thumbImgUrl3';
        
        await setDoc(docRef, { [fieldName]: downloadURL }, { merge: true });

        // 3. Actualizar la vista
        updateImageDisplay(targetId, downloadURL);
        showAdminToast('¡Imagen guardada en Firebase exitosamente!');
    } catch (error) {
        console.error("Error al subir la imagen a Firebase: ", error);
        if (error.code === 'permission-denied') {
            showAdminToast('Error: Permisos bloqueados en Storage (Reglas)');
        } else {
            showAdminToast('Error al subir la imagen');
        }
    }
}

function updateImageDisplay(targetId, url) {
    const targetElement = document.getElementById(targetId);
    targetElement.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
    targetElement.style.padding = '0';
    targetElement.style.background = 'transparent';
    targetElement.style.width = '100%';
    targetElement.style.height = '100%';
}

// Cargar imágenes desde la colección 'gis' al iniciar la web
async function loadInitialData() {
    try {
        const docRef = doc(db, "gis", "siteContent");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.productImgUrl) updateImageDisplay('main-display', data.productImgUrl);
            if (data.chefImgUrl) updateImageDisplay('chef-display', data.chefImgUrl);
            if (data.thumbImgUrl1) updateImageDisplay('thumb-display-1', data.thumbImgUrl1);
            if (data.thumbImgUrl2) updateImageDisplay('thumb-display-2', data.thumbImgUrl2);
            if (data.thumbImgUrl3) updateImageDisplay('thumb-display-3', data.thumbImgUrl3);
        }
    } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error);
        if (error.code === 'permission-denied') {
            console.warn("⚠️ ALERTA: Las reglas de Firestore están bloqueando el acceso. Ve a la consola de Firebase para actualizarlas.");
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInitialData);
} else {
    loadInitialData();
}

// Exponer las funciones globalmente para que funcionen con los eventos del HTML
window.toggleAdminMode = toggleAdminMode;
window.openImageEditor = openImageEditor;
window.closeImageEditor = closeImageEditor;
window.saveImageUrl = saveImageUrl;
window.triggerCurrentUpload = triggerCurrentUpload;
window.handleThumbClick = handleThumbClick;
window.closeLoginModal = closeLoginModal;
window.authenticateAdmin = authenticateAdmin;
window.handleImageUpload = handleImageUpload;
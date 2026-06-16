import { mockBooks } from './mockData';

// Simulación de conexión a Firebase Firestore

export const getBooks = async () => {
  // Simulamos retraso de red al traer la colección desde la BD
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockBooks);
    }, 600);
  });
};

export const reserveBookById = async (bookId) => {
  // Simula la mutación de estado de un documento (ej. updateDoc)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, message: '¡Reserva exitosa! ✅' });
    }, 800);
  });
};
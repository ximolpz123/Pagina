import { collection, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export const getBooks = async () => {
  try {
    const booksCol = collection(db, 'books');
    const bookSnapshot = await getDocs(booksCol);
    const bookList = bookSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return bookList;
  } catch (error) {
    console.error("Error al obtener libros de Firebase:", error);
    return [];
  }
};

export const subscribeToBooks = (callback) => {
  const booksCol = collection(db, 'books');
  // onSnapshot escucha cambios en la base de datos en tiempo real
  return onSnapshot(booksCol, (snapshot) => {
    const bookList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(bookList);
  });
};

export const reserveBookById = async (bookId) => {
  try {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, { available: false });
    return { success: true, message: '¡Reserva exitosa! ✅' };
  } catch (error) {
    console.error("Error al reservar el libro en Firebase:", error);
    return { success: false, message: 'Hubo un error al reservar.' };
  }
};
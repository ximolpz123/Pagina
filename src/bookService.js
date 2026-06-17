import { collection, getDocs, doc, updateDoc, onSnapshot, addDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from './firebase.js';

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

export const addReservation = async (book, pickupDate, returnDate) => {
  try {
    await addDoc(collection(db, 'reservations'), {
      bookId: book.id,
      bookTitle: book.title,
      pickupDate,
      returnDate,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    const bookRef = doc(db, 'books', book.id);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
      const bookData = bookSnap.data();
      const currentStock = bookData.stock !== undefined ? bookData.stock : (bookData.available ? 1 : 0);
      if (currentStock > 0) {
        await updateDoc(bookRef, { stock: currentStock - 1, available: currentStock - 1 > 0 });
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error al reservar:", error);
    return { success: false };
  }
};

export const subscribeToActiveReservations = (callback) => {
  const q = query(collection(db, 'reservations'), where('status', '==', 'active'));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};

export const subscribeToHistoryReservations = (callback) => {
  const q = query(collection(db, 'reservations'), where('status', '==', 'returned'));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};

export const returnReservation = async (reservationId, bookId) => {
  try {
    // Guardamos la fecha y hora completa en formato ISO
    await updateDoc(doc(db, 'reservations', reservationId), { status: 'returned', returnedAt: new Date().toISOString() });
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
      const currentStock = bookSnap.data().stock !== undefined ? bookSnap.data().stock : 0;
      await updateDoc(bookRef, { stock: currentStock + 1, available: true });
    }
  } catch (e) { console.error(e); }
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

export const subscribeToBookById = (bookId, callback) => {
  const bookRef = doc(db, 'books', bookId);
  return onSnapshot(bookRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

export const reserveBookById = async (bookId) => {
  try {
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) return { success: false, message: 'El libro no existe.' };
    
    const bookData = bookSnap.data();
    // Compatibilidad: Si el libro no tenía stock guardado, pero estaba disponible, asumimos stock = 1
    const currentStock = bookData.stock !== undefined ? bookData.stock : (bookData.available ? 1 : 0);

    if (currentStock > 0) {
      const newStock = currentStock - 1;
      await updateDoc(bookRef, { 
        stock: newStock, 
        available: newStock > 0 
      });
      return { success: true, message: '¡Reserva exitosa! ✅' };
    } else {
      return { success: false, message: 'No hay stock disponible.' };
    }
  } catch (error) {
    console.error("Error al reservar el libro en Firebase:", error);
    return { success: false, message: 'Hubo un error al reservar.' };
  }
};

export const addBook = async (bookData) => {
  try {
    const docRef = await addDoc(collection(db, 'books'), bookData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al añadir el libro a Firebase:", error);
    return { success: false, message: 'Error al intentar guardar el libro.' };
  }
};

export const updateBookStock = async (bookId, newStock) => {
  try {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, { 
      stock: newStock, 
      available: newStock > 0 
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el stock:", error);
    return { success: false };
  }
};
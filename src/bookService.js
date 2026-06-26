import { collection, getDocs, doc, updateDoc, onSnapshot, addDoc, getDoc, query, where, runTransaction, deleteDoc } from 'firebase/firestore';
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

export const addReservation = async (book, pickupDate, returnDate, userEmail) => {
  try {
    await addDoc(collection(db, 'reservations'), {
      bookId: book.id,
      bookTitle: book.title,
      bookCategory: book.category || 'General',
      userEmail: userEmail || 'desconocido',
      pickupDate,
      returnDate,
      status: 'pending_pickup',
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

export const subscribeToUserActiveReservations = (userEmail, callback) => {
  if (!userEmail) return () => {};
  // Filtramos por email en Firebase, y por status en el cliente para evitar errores de índice compuesto
  const q = query(collection(db, 'reservations'), where('userEmail', '==', userEmail));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs.filter(d => d.status === 'active' || d.status === 'pending_pickup'));
  }, (error) => console.error(error));
};

export const subscribeToUserHistoryReservations = (userEmail, callback) => {
  if (!userEmail) return () => {};
  const q = query(collection(db, 'reservations'), where('userEmail', '==', userEmail));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs.filter(d => d.status === 'returned'));
  }, (error) => console.error(error));
};

export const subscribeToHistoryReservations = (callback) => {
  const q = query(collection(db, 'reservations'), where('status', '==', 'returned'));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};

export const subscribeToAllReservationsGlobal = (callback) => {
  const q = collection(db, 'reservations');
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
    const newBookWithDate = {
      ...bookData,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'books'), newBookWithDate);
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

export const addReview = async (bookId, userDisplayName, userPhoto, rating, text) => {
  try {
    await addDoc(collection(db, 'reviews'), {
      bookId,
      userDisplayName: userDisplayName || 'Lector Anónimo',
      userPhoto: userPhoto || '',
      rating,
      text,
      createdAt: new Date().toISOString()
    });

    const bookRef = doc(db, 'books', bookId);
    await runTransaction(db, async (transaction) => {
      const bookDoc = await transaction.get(bookRef);
      if (!bookDoc.exists()) return;
      const data = bookDoc.data();
      const currentRating = data.rating || 0;
      const currentCount = data.reviewCount || 0;
      
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + rating) / newCount;
      
      transaction.update(bookRef, { 
        rating: parseFloat(newRating.toFixed(1)),
        reviewCount: newCount 
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding review: ", error);
    return { success: false, error };
  }
};

export const getBookReviews = async (bookId) => {
  try {
    const q = query(collection(db, 'reviews'), where('bookId', '==', bookId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Error fetching reviews: ", error);
    return [];
  }
};

export const checkBannedCategory = async (userEmail, category) => {
  if (!userEmail || !category) return false;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date();

    // 1. Activas atrasadas
    const qActive = query(collection(db, 'reservations'), where('userEmail', '==', userEmail), where('status', '==', 'active'));
    const snapActive = await getDocs(qActive);
    for (const doc of snapActive.docs) {
      const res = doc.data();
      if (res.bookCategory === category && res.returnDate) {
         if (todayStr > res.returnDate) return true;
      }
    }

    // 2. Historial devuelto atrasado en los últimos 7 días
    const qHistory = query(collection(db, 'reservations'), where('userEmail', '==', userEmail), where('status', '==', 'returned'));
    const snapHistory = await getDocs(qHistory);
    for (const doc of snapHistory.docs) {
      const res = doc.data();
      if (res.bookCategory === category && res.returnDate && res.returnedAt) {
         const dueDate = new Date(res.returnDate);
         const returnedDate = new Date(res.returnedAt);
         if (returnedDate > dueDate) {
           const diffTime = Math.abs(todayDate - returnedDate);
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           if (diffDays <= 7) return true;
         }
      }
    }
    return false;
  } catch (error) {
    console.error("Error validando penalización de categoría:", error);
    return false;
  }
};

export const deleteBook = async (bookId) => {
  try {
    await deleteDoc(doc(db, 'books', bookId));
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar libro:", error);
    return { success: false, error };
  }
};

export const verifyAndApproveReservation = async (reservationId) => {
  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationSnap = await getDoc(reservationRef);
    
    if (!reservationSnap.exists()) {
      return { success: false, message: 'La reserva no existe.' };
    }
    
    const data = reservationSnap.data();
    if (data.status === 'active') {
      return { success: false, message: 'Este préstamo ya fue entregado y está activo.' };
    }
    if (data.status !== 'pending_pickup') {
      return { success: false, message: 'La reserva ya fue devuelta o cancelada.' };
    }
    
    // Actualizamos a 'active' para indicar que ya se entregó físicamente
    await updateDoc(reservationRef, { 
      status: 'active',
      verifiedByLibrarian: true,
      verifiedAt: new Date().toISOString()
    });
    
    return { success: true, bookTitle: data.bookTitle };
  } catch (error) {
    console.error("Error verifying reservation:", error);
    return { success: false, message: 'Hubo un error al verificar el QR.' };
  }
};
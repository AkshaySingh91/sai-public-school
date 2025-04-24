import React, { createContext, useContext } from 'react';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

const FirestoreContext = createContext();

export function useFirestore() {
  return useContext(FirestoreContext);
}

export function FirestoreProvider({ children }) {
  // Generic function to get a document
  async function getDocument(collectionName, documentId) {
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  // Generic function to get all documents from a collection
  async function getDocuments(collectionName, constraints = []) {
    try {
      let q = collection(db, collectionName);
      
      // Apply query constraints
      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  // Generic function to add a document
  async function addDocument(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  // Generic function to update a document
  async function updateDocument(collectionName, documentId, data) {
    try {
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  // Generic function to delete a document
  async function deleteDocument(collectionName, documentId) {
    try {
      await deleteDoc(doc(db, collectionName, documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Helper function to create query constraints
  function createQueryConstraint(field, operator, value) {
    return where(field, operator, value);
  }

  // Helper function to create order by constraint
  function createOrderByConstraint(field, direction = 'asc') {
    return orderBy(field, direction);
  }

  // Helper function to create limit constraint
  function createLimitConstraint(limitValue) {
    return limit(limitValue);
  }

  const value = {
    getDocument,
    getDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    createQueryConstraint,
    createOrderByConstraint,
    createLimitConstraint
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
} 
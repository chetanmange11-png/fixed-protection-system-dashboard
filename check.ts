import { getDoc, doc } from 'firebase/firestore';
import { db } from './src/lib/firebase.js';

async function checkSettings() {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    console.log(docSnap.data());
  } catch (e) {
    console.error(e);
  }
}

checkSettings();
